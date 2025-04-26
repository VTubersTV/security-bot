import { Router, Request, Response, Application } from 'express'
import { AutoModRule, AutoModStats, UserInfraction } from '../../models'
import { env } from '../../utils/env_parser'
import Logger from '../../classes/logger'
import { Client } from 'discord.js'
import { Bot } from '../../types/bot'

const router = Router()

/**
 * Setup moderation routes for viewing infractions and statistics
 * @param app - Express application
 * @param client - Discord client
 */
export function setupModerationRoutes(
	app: Application,
	client: Bot<Client>,
): void {
	// Public infractions page
	router.get('/infractions', async (req: Request, res: Response) => {
		try {
			const page = parseInt(req.query.page as string) || 1
			const limit = 20
			const skip = (page - 1) * limit

			const infractions = await UserInfraction.find({
				guildId: env.DISCORD_GUILD_ID,
			})
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.populate('ruleId')

			const totalInfractions = await UserInfraction.countDocuments({
				guildId: env.DISCORD_GUILD_ID,
			})

			const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID)
			const users = new Map()
			const moderators = new Map()

			// Fetch user and moderator data
			for (const infraction of infractions) {
				if (!users.has(infraction.userId)) {
					const user = await client.users
						.fetch(infraction.userId)
						.catch(() => null)
					users.set(infraction.userId, user)
				}
				if (infraction.moderatorId && !moderators.has(infraction.moderatorId)) {
					const mod = await client.users
						.fetch(infraction.moderatorId)
						.catch(() => null)
					moderators.set(infraction.moderatorId, mod)
				}
			}

			res.render('moderation/infractions', {
				user: req.session.user || null,
				guild,
				infractions,
				users,
				moderators,
				currentPage: page,
				totalPages: Math.ceil(totalInfractions / limit),
			})
		} catch (error) {
			Logger.error(
				'Failed to fetch infractions',
				error instanceof Error ? error.stack : String(error),
			)
			res.status(500).render('error', {
				error: 'Failed to load infractions. Please try again later.',
			})
		}
	})

	app.use('/moderation', router)
}
