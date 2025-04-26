import {
	Message,
	GuildMember,
	TextChannel,
	EmbedBuilder,
	Guild,
	ChannelType,
} from 'discord.js'
import {
	AutoModRule,
	UserInfraction,
	AutoModStats,
	AutoModAction,
	IAutoModRule,
} from '../models'
import { Types } from 'mongoose'
import Logger from './logger'

/**
 * Represents the result of an auto-moderation check
 * @interface ModCheckResult
 */
interface ModCheckResult {
	triggered: boolean
	rule?: IAutoModRule
	reason?: string
}

/**
 * Configuration for the AutoMod system
 * @interface AutoModConfig
 */
interface AutoModConfig {
	spamThreshold: number
	spamWindow: number
	mentionLimit: number
	maxMessageCache: number
	staffChannelId: string
}

/**
 * Handles automated message moderation based on configured rules
 * @class AutoMod
 */
export class AutoMod {
	private static instance: AutoMod
	private messageCache: Map<
		string,
		{ count: number; firstMessage: number; messages: string[] }
	>
	private readonly config: AutoModConfig

	private constructor() {
		this.messageCache = new Map()
		this.config = {
			spamThreshold: 5,
			spamWindow: 5000,
			mentionLimit: 5,
			maxMessageCache: 1000,
			staffChannelId: process.env.STAFF_CHAT_CHANNEL_ID || '',
		}
	}

	/**
	 * Gets the singleton instance of AutoMod
	 * @returns {AutoMod} The AutoMod instance
	 */
	public static getInstance(): AutoMod {
		if (!AutoMod.instance) {
			AutoMod.instance = new AutoMod()
		}
		return AutoMod.instance
	}

	/**
	 * Processes a message through all auto-moderation rules
	 * @param {Message} message - The message to check
	 * @returns {Promise<void>}
	 */
	public async processMessage(message: Message): Promise<void> {
		Logger.log('debug', `Processing message: ${message.content}`, 'AutoMod')

		if (!this.shouldProcessMessage(message)) {
			Logger.log(
				'debug',
				'Message skipped - does not meet processing criteria',
				'AutoMod',
			)
			return
		}

		try {
			const rules = await this.getActiveRules(message.guild!.id)
			Logger.log(
				'debug',
				`Found ${rules.length} active rules for guild`,
				'AutoMod',
			)

			for (const rule of rules) {
				Logger.log(
					'debug',
					`Checking rule: ${rule.name} (${rule.type})`,
					'AutoMod',
				)
				const result = await this.checkRule(message, rule)
				if (result.triggered) {
					Logger.log(
						'debug',
						`Rule triggered: ${rule.name}, reason: ${result.reason}`,
						'AutoMod',
					)
					await this.handleViolation(
						message,
						rule,
						result.reason || 'Rule violation',
					)
					break // Stop after first triggered rule
				} else {
					Logger.log('debug', `Rule not triggered: ${rule.name}`, 'AutoMod')
				}
			}

			this.cleanMessageCache()
		} catch (error) {
			Logger.error(
				'Error in auto-moderation',
				error instanceof Error ? error.stack : String(error),
			)
		}
	}

	/**
	 * Determines if a message should be processed
	 * @private
	 * @param {Message} message - The message to check
	 * @returns {boolean}
	 */
	private shouldProcessMessage(message: Message): boolean {
		const should = !!(
			message.guild &&
			message.member &&
			!message.member.user.bot &&
			message.content.length > 0
		)
		Logger.log(
			'debug',
			`Should process message: ${should}, content: ${message.content}`,
			'AutoMod',
		)
		return should
	}

	/**
	 * Gets active rules for a guild
	 * @private
	 * @param {string} guildId - The guild ID
	 * @returns {Promise<IAutoModRule[]>}
	 */
	private async getActiveRules(guildId: string): Promise<IAutoModRule[]> {
		return AutoModRule.find({
			guildId,
			enabled: true,
		}).lean()
	}

	/**
	 * Checks a message against a specific rule
	 * @private
	 * @param {Message} message - The message to check
	 * @param {IAutoModRule} rule - The rule to check against
	 * @returns {Promise<ModCheckResult>}
	 */
	private async checkRule(
		message: Message,
		rule: IAutoModRule,
	): Promise<ModCheckResult> {
		if (this.isExempt(message.member!, rule)) {
			Logger.log('debug', `Member is exempt from rule ${rule.name}`, 'AutoMod')
			return { triggered: false }
		}

		const content = message.content.toLowerCase()
		let triggered = false
		let reason = ''

		switch (rule.type) {
			case 'SPAM': {
				const spamCheck = this.checkSpam(message)
				triggered = spamCheck.triggered
				reason = spamCheck.reason || ''
				break
			}

			case 'TOXICITY': {
				if (
					rule.keywords?.some((keyword) =>
						content.includes(keyword.toLowerCase()),
					)
				) {
					triggered = true
					reason = `Prohibited keywords detected: ${this.highlightTriggeringWords(content, rule.keywords)}`
				}
				break
			}

			case 'LINKS': {
				if (rule.pattern) {
					Logger.log(
						'debug',
						`Checking link pattern: ${rule.pattern} against: ${content}`,
						'AutoMod',
					)
					const regex = new RegExp(rule.pattern, 'i')
					triggered = regex.test(content)
					if (triggered) {
						const matches = content.match(new RegExp(rule.pattern, 'gi'))
						reason = `Unauthorized link(s) detected: ${matches?.join(', ')}`
						Logger.log('debug', `Link match found: ${reason}`, 'AutoMod')
					} else {
						Logger.log('debug', 'No link match found', 'AutoMod')
					}
				} else {
					Logger.log('debug', 'No pattern defined for LINKS rule', 'AutoMod')
				}
				break
			}

			case 'MENTIONS': {
				const mentionCount =
					message.mentions.users.size + message.mentions.roles.size
				if (mentionCount > this.config.mentionLimit) {
					triggered = true
					reason = `Mass mentions detected (${mentionCount} mentions)`
				}
				break
			}

			case 'ATTACHMENTS': {
				if (message.attachments.size > 0 && rule.pattern) {
					const filePattern = new RegExp(rule.pattern, 'i')
					const violatingFiles = message.attachments
						.filter((att) => filePattern.test(att.name))
						.map((att) => att.name)

					if (violatingFiles.length > 0) {
						triggered = true
						reason = `Prohibited file type(s) detected: ${violatingFiles.join(', ')}`
					}
				}
				break
			}

			case 'CUSTOM': {
				if (rule.pattern && new RegExp(rule.pattern, 'i').test(content)) {
					triggered = true
					reason = `Custom pattern matched: ${rule.pattern}`
				}
				break
			}
		}

		return { triggered, rule, reason }
	}

	/**
	 * Handles a rule violation
	 * @private
	 * @param {Message} message - The violating message
	 * @param {IAutoModRule} rule - The violated rule
	 * @param {string} reason - The violation reason
	 */
	private async handleViolation(
		message: Message,
		rule: IAutoModRule,
		reason: string,
	): Promise<void> {
		try {
			const infraction = await this.createInfraction(message, rule, reason)
			await Promise.all([
				this.updateStats(message.guild!, rule._id as Types.ObjectId),
				this.executePunishment(message, rule.action, rule.actionDuration),
				this.notifyStaff(message, rule, reason),
			])

			Logger.log(
				'info',
				`Auto-mod action taken: ${rule.action} for ${message.author.tag} (Rule: ${rule.name})`,
				'AutoMod',
			)
		} catch (error) {
			Logger.error(
				'Error handling rule violation',
				error instanceof Error ? error.stack : String(error),
			)
		}
	}

	/**
	 * Creates an infraction record
	 * @private
	 */
	private async createInfraction(
		message: Message,
		rule: IAutoModRule,
		reason: string,
	): Promise<any> {
		return UserInfraction.create({
			userId: message.author.id,
			guildId: message.guild!.id,
			type: rule.action,
			reason: `[AutoMod: ${rule.name}] ${reason}`,
			ruleId: rule._id,
			messageContent: message.content,
			messageId: message.id,
			channelId: message.channel.id,
			active: true,
			duration: rule.actionDuration,
			expiresAt:
				rule.actionDuration ?
					new Date(Date.now() + rule.actionDuration * 60000)
				:	undefined,
		})
	}

	/**
	 * Executes the punishment for a rule violation
	 * @private
	 */
	private async executePunishment(
		message: Message,
		action: AutoModAction,
		duration?: number,
	): Promise<void> {
		const member = message.member!

		try {
			switch (action) {
				case AutoModAction.DELETE:
					await message.delete()
					break

				case AutoModAction.WARN:
					if (message.channel.type === ChannelType.GuildText) {
						const embed = new EmbedBuilder()
							.setTitle('⚠️ Warning')
							.setColor(0xffd700)
							.setDescription('Your message violated our server rules.')
							.setTimestamp()

						await message.channel.send({ embeds: [embed] })
					}
					break

				case AutoModAction.MUTE:
					if (duration) {
						await member.timeout(duration * 60 * 1000, 'AutoMod violation')
					}
					break

				case AutoModAction.KICK:
					await member.kick('AutoMod violation')
					break

				case AutoModAction.BAN:
					await member.ban({
						reason: 'AutoMod violation',
						deleteMessageSeconds: 60 * 60 * 24,
					}) // Delete last 24h of messages
					break
			}
		} catch (error) {
			Logger.error(
				`Failed to execute punishment ${action}`,
				error instanceof Error ? error.stack : String(error),
			)
		}
	}

	/**
	 * Updates auto-moderation statistics
	 * @private
	 */
	private async updateStats(
		guild: Guild,
		ruleId: Types.ObjectId,
	): Promise<void> {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		const tomorrow = new Date(today)
		tomorrow.setDate(tomorrow.getDate() + 1)

		await AutoModStats.findOneAndUpdate(
			{
				guildId: guild.id,
				ruleId: ruleId,
				periodStart: today,
				periodEnd: tomorrow,
			},
			{
				$inc: {
					triggerCount: 1,
					successCount: 1,
					uniqueUsers: 1,
				},
			},
			{ upsert: true },
		)
	}

	/**
	 * Checks if a message is spam
	 * @private
	 */
	private checkSpam(message: Message): ModCheckResult {
		const userId = message.author.id
		const now = Date.now()
		const userMessages = this.messageCache.get(userId) || {
			count: 0,
			firstMessage: now,
			messages: [],
		}

		if (now - userMessages.firstMessage > this.config.spamWindow) {
			this.messageCache.set(userId, {
				count: 1,
				firstMessage: now,
				messages: [message.content],
			})
			return { triggered: false }
		}

		const newCount = userMessages.count + 1
		const messages = [...userMessages.messages, message.content]
		this.messageCache.set(userId, {
			count: newCount,
			firstMessage: userMessages.firstMessage,
			messages,
		})

		if (newCount >= this.config.spamThreshold) {
			const duplicateCount = this.countDuplicateMessages(messages)
			if (duplicateCount >= this.config.spamThreshold - 1) {
				return {
					triggered: true,
					reason: `Message spam detected (${duplicateCount + 1} duplicate messages in ${this.config.spamWindow / 1000}s)`,
				}
			}
		}

		return { triggered: false }
	}

	/**
	 * Counts duplicate messages in an array
	 * @private
	 */
	private countDuplicateMessages(messages: string[]): number {
		const sorted = [...messages].sort()
		let duplicates = 0

		for (let i = 1; i < sorted.length; i++) {
			if (sorted[i] === sorted[i - 1]) duplicates++
		}

		return duplicates
	}

	/**
	 * Checks if a member is exempt from a rule
	 * @private
	 */
	private isExempt(member: GuildMember, rule: IAutoModRule): boolean {
		return (
			member.roles.cache.some((role) => rule.exemptRoles.includes(role.id)) ||
			member.permissions.has('ManageMessages')
		)
	}

	/**
	 * Notifies staff about a rule violation
	 * @private
	 */
	private async notifyStaff(
		message: Message,
		rule: IAutoModRule,
		reason: string,
	): Promise<void> {
		const staffChannel = message.guild!.channels.cache.get(
			this.config.staffChannelId,
		) as TextChannel
		if (!staffChannel?.isTextBased()) return

		const embed = new EmbedBuilder()
			.setTitle('🛡️ AutoMod Action Taken')
			.setColor(0xff0000)
			.setDescription(
				[
					`**User:** ${message.author.tag} (${message.author.id})`,
					`**Channel:** ${message.channel.toString()}`,
					`**Rule:** ${rule.name}`,
					`**Action:** ${rule.action}`,
					`**Reason:** ${reason}`,
					`**Message Content:** ${message.content.slice(0, 1000) || '[No content]'}`,
				].join('\n'),
			)
			.setTimestamp()

		try {
			await staffChannel.send({ embeds: [embed] })
		} catch (error) {
			Logger.error(
				'Failed to send staff notification',
				error instanceof Error ? error.stack : String(error),
			)
		}
	}

	/**
	 * Highlights triggering words in a message
	 * @private
	 */
	private highlightTriggeringWords(
		content: string,
		keywords: string[],
	): string {
		return keywords
			.filter((keyword) =>
				content.toLowerCase().includes(keyword.toLowerCase()),
			)
			.map((word) => `\`${word}\``)
			.join(', ')
	}

	/**
	 * Cleans up the message cache
	 * @private
	 */
	private cleanMessageCache(): void {
		const now = Date.now()
		for (const [userId, data] of this.messageCache.entries()) {
			if (now - data.firstMessage > this.config.spamWindow) {
				this.messageCache.delete(userId)
			}
		}

		// Prevent memory leaks by limiting cache size
		if (this.messageCache.size > this.config.maxMessageCache) {
			const entriesToDelete = [...this.messageCache.entries()]
				.sort(([, a], [, b]) => a.firstMessage - b.firstMessage)
				.slice(0, this.messageCache.size - this.config.maxMessageCache)

			for (const [key] of entriesToDelete) {
				this.messageCache.delete(key)
			}
		}
	}
}
