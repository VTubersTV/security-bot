import { Client, Guild } from 'discord.js'
import { UserInfraction } from '../models'
import Logger from './logger'
import { Bot } from '../types/bot'

/**
 * Interface representing a scheduled unban
 * @interface ScheduledUnban
 */
interface ScheduledUnban {
	/** Discord user ID to unban */
	userId: string
	/** Discord guild ID where the ban is active */
	guildId: string
	/** Infraction document ID */
	infractionId: string
	/** When the unban should occur */
	unbanTime: number
}

/**
 * Manages temporary bans efficiently using a priority queue
 * Handles scheduling and executing unbans with minimal memory usage
 * @class BanManager
 */
export class BanManager {
	private static instance: BanManager
	private client: Bot<Client>
	private scheduledUnbans: ScheduledUnban[]
	private timeoutId: NodeJS.Timeout | null

	private constructor(client: Bot<Client>) {
		this.client = client
		this.scheduledUnbans = []
		this.timeoutId = null
	}

	/**
	 * Get the singleton instance of BanManager
	 * @returns {BanManager} The BanManager instance
	 */
	public static getInstance(client: Bot<Client>): BanManager {
		if (!BanManager.instance) {
			BanManager.instance = new BanManager(client)
		}
		return BanManager.instance
	}

	/**
	 * Initialize the BanManager with a Discord client
	 * @param {Bot<Client>} client - Discord client instance
	 */
	public async initialize(client: Bot<Client>): Promise<void> {
		this.client = client
		await this.loadExistingBans()
	}

	/**
	 * Load existing temporary bans from the database
	 * @private
	 */
	private async loadExistingBans(): Promise<void> {
		try {
			const activeBans = await UserInfraction.find({
				type: 'BAN',
				active: true,
				expiresAt: { $ne: null },
			}).sort({ expiresAt: 1 })

			for (const ban of activeBans) {
				if (ban.expiresAt && ban.expiresAt.getTime() > Date.now()) {
					this.scheduledUnbans.push({
						userId: ban.userId,
						guildId: ban.guildId,
						infractionId: ban._id as string,
						unbanTime: ban.expiresAt.getTime(),
					})
				}
			}

			this.scheduleNextUnban()
			Logger.log(
				'info',
				`Loaded ${this.scheduledUnbans.length} active temporary bans`,
				'BanManager',
			)
		} catch (error) {
			Logger.error(
				'Failed to load existing bans',
				error instanceof Error ? error.stack : String(error),
			)
		}
	}

	/**
	 * Schedule a new temporary ban
	 * @param {string} userId - Discord user ID
	 * @param {string} guildId - Discord guild ID
	 * @param {string} infractionId - Infraction document ID
	 * @param {number} duration - Ban duration in days
	 */
	public scheduleBan(
		userId: string,
		guildId: string,
		infractionId: string,
		duration: number,
	): void {
		const unbanTime = Date.now() + duration * 24 * 60 * 60 * 1000

		// Insert the new unban in sorted order
		const index = this.scheduledUnbans.findIndex(
			(ban) => ban.unbanTime > unbanTime,
		)
		const newUnban: ScheduledUnban = {
			userId,
			guildId,
			infractionId,
			unbanTime,
		}

		if (index === -1) {
			this.scheduledUnbans.push(newUnban)
		} else {
			this.scheduledUnbans.splice(index, 0, newUnban)
		}

		// If this is the next ban to expire, reschedule
		if (index === 0) {
			this.scheduleNextUnban()
		}

		Logger.log(
			'info',
			`Scheduled unban for user ${userId} at ${new Date(unbanTime).toISOString()}`,
			'BanManager',
		)
	}

	/**
	 * Schedule the next unban in the queue
	 * @private
	 */
	private scheduleNextUnban(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId)
			this.timeoutId = null
		}

		if (this.scheduledUnbans.length === 0) return

		const nextUnban = this.scheduledUnbans[0]
		const now = Date.now()
		const delay = Math.max(0, nextUnban.unbanTime - now)

		this.timeoutId = setTimeout(() => this.processNextUnban(), delay)
	}

	/**
	 * Process the next unban in the queue
	 * @private
	 */
	private async processNextUnban(): Promise<void> {
		if (this.scheduledUnbans.length === 0) return

		const unban = this.scheduledUnbans.shift()!

		try {
			const guild = await this.client.guilds.fetch(unban.guildId)
			if (!guild) {
				throw new Error(`Guild ${unban.guildId} not found`)
			}

			await this.executeUnban(unban, guild)
		} catch (error) {
			Logger.error(
				`Failed to process unban for user ${unban.userId}`,
				error instanceof Error ? error.stack : String(error),
			)
		}

		// Schedule the next unban
		this.scheduleNextUnban()
	}

	/**
	 * Execute an unban operation
	 * @private
	 * @param {ScheduledUnban} unban - Unban details
	 * @param {Guild} guild - Discord guild
	 */
	private async executeUnban(
		unban: ScheduledUnban,
		guild: Guild,
	): Promise<void> {
		try {
			// Unban the user
			await guild.members.unban(unban.userId, 'Ban duration expired')

			// Update infraction record
			await UserInfraction.findByIdAndUpdate(unban.infractionId, {
				active: false,
			})

			Logger.log(
				'info',
				`Successfully unbanned user ${unban.userId} from guild ${guild.name}`,
				'BanManager',
			)
		} catch (error) {
			if (error instanceof Error && error.message.includes('Unknown Ban')) {
				// Ban was already removed, just update the infraction
				await UserInfraction.findByIdAndUpdate(unban.infractionId, {
					active: false,
				})
				Logger.log(
					'info',
					`User ${unban.userId} was already unbanned`,
					'BanManager',
				)
			} else {
				throw error
			}
		}
	}

	/**
	 * Cancel a scheduled unban
	 * @param {string} userId - Discord user ID
	 * @param {string} guildId - Discord guild ID
	 * @returns {boolean} Whether the unban was cancelled
	 */
	public cancelScheduledUnban(userId: string, guildId: string): boolean {
		const index = this.scheduledUnbans.findIndex(
			(ban) => ban.userId === userId && ban.guildId === guildId,
		)

		if (index === -1) return false

		this.scheduledUnbans.splice(index, 1)

		// If we removed the next scheduled unban, reschedule
		if (index === 0) {
			this.scheduleNextUnban()
		}

		Logger.log(
			'info',
			`Cancelled scheduled unban for user ${userId}`,
			'BanManager',
		)
		return true
	}

	/**
	 * Get all scheduled unbans for a guild
	 * @param {string} guildId - Discord guild ID
	 * @returns {ScheduledUnban[]} Array of scheduled unbans
	 */
	public getScheduledUnbans(guildId: string): ScheduledUnban[] {
		return this.scheduledUnbans.filter((ban) => ban.guildId === guildId)
	}
}
