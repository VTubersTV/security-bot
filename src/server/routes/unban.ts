import { Router, Request, Response, Application } from 'express'
import { UnbanRequest, UnbanRequestStatus } from '../../models'
import { env } from '../../utils/env_parser'
import Logger from '../../classes/logger'
import { Client } from 'discord.js'
import { Bot } from '../../types/bot'
import { fromBase64 } from '../../utils/base64'
import cookieParser from 'cookie-parser'

const router = Router()
router.use(cookieParser())

/**
 * Setup unban request routes
 * @param app - Express application
 * @param client - Discord client
 */
export function setupUnbanRoutes(app: Application, client: Bot<Client>): void {
	// Unban request form page
	router.get('/request', async (req: Request, res: Response) => {
		try {
			const userId = fromBase64((req.query.user as string) || '')
			const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID)
			if (!guild) {
				throw new Error('Guild not found')
			}

			res.render('unban/request', {
				user: req.cookies.discord_user || null,
				guild,
				userId,
			})
		} catch (error) {
			Logger.error(
				'Failed to load unban request page',
				error instanceof Error ? error.stack : String(error),
			)
			res.status(500).render('error', {
				error: 'Failed to load unban request page. Please try again later.',
			})
		}
	})

	// Success page
	router.get('/success/:requestCode', async (req: Request, res: Response) => {
		try {
			const { requestCode } = req.params
			const request = await UnbanRequest.findOne({ requestCode })

			if (!request) {
				return res.status(404).render('error', {
					error: 'Unban request not found.',
				})
			}

			const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID)
			if (!guild) {
				throw new Error('Guild not found')
			}

			res.render('unban/success', {
				requestCode: request.requestCode,
				guild,
			})
		} catch (error) {
			Logger.error(
				'Failed to load success page',
				error instanceof Error ? error.stack : String(error),
			)
			res.status(500).render('error', {
				error: 'Failed to load success page. Please try again later.',
			})
		}
	})

	// Submit unban request
	// @ts-ignore
	router.post('/submit', async (req: Request, res: Response) => {
		try {
			const { userId, email, banReason, appealMessage, evidence } = req.body
			const ip = req.ip || req.headers['x-forwarded-for']?.toString()

			// Validate user ID format
			if (!/^\d{17,19}$/.test(userId)) {
				const error = 'Invalid Discord User ID format.'
				if (req.xhr || req.headers.accept?.includes('application/json')) {
					return res.status(400).json({ error })
				}
				return res.status(400).render('error', { error })
			}

			// Check if user has a pending request
			const hasPending = await UnbanRequest.findOne({
				userId,
				status: UnbanRequestStatus.PENDING,
			})
			if (hasPending) {
				const error = 'You already have a pending unban request.'
				if (req.xhr || req.headers.accept?.includes('application/json')) {
					return res.status(400).json({ error })
				}
				return res.status(400).render('error', { error })
			}

			// Create unban request
			const request = await UnbanRequest.create({
				userId,
				guildId: env.DISCORD_GUILD_ID,
				banReason,
				appealMessage,
				evidence,
				requestIp: ip,
				contactEmail: email,
			})

			// Log the request
			Logger.log(
				'info',
				`New unban request ${request.requestCode} from user ${userId}`,
				'Unban',
			)

			// Return response based on request type
			if (req.xhr || req.headers.accept?.includes('application/json')) {
				return res.json({
					success: true,
					requestCode: request.requestCode,
					redirectUrl: `/unban/success/${request.requestCode}`,
				})
			}

			// Render success page for regular form submissions
			res.render('unban/success', {
				requestCode: request.requestCode,
				guild: client.guilds.cache.get(env.DISCORD_GUILD_ID),
			})
		} catch (error) {
			Logger.error(
				'Failed to submit unban request',
				error instanceof Error ? error.stack : String(error),
			)
			const errorMessage =
				'Failed to submit unban request. Please try again later.'

			if (req.xhr || req.headers.accept?.includes('application/json')) {
				return res.status(500).json({ error: errorMessage })
			}
			res.status(500).render('error', { error: errorMessage })
		}
	})

	// Check request status
	router.get('/status/:code', async (req: Request, res: Response) => {
		try {
			const request = await UnbanRequest.findOne({
				requestCode: req.params.code,
			})
			if (!request) {
				return res.status(404).render('error', {
					error: 'Unban request not found.',
				})
			}

			res.render('unban/status', {
				request,
				guild: client.guilds.cache.get(env.DISCORD_GUILD_ID),
			})
		} catch (error) {
			Logger.error(
				'Failed to check unban request status',
				error instanceof Error ? error.stack : String(error),
			)
			res.status(500).render('error', {
				error: 'Failed to check request status. Please try again later.',
			})
		}
	})

	app.use('/unban', router)
}
