import { Router, Request, Response, Application } from 'express'
import { env } from '../../utils/env_parser'
import Logger from '../../classes/logger'
import { Client } from 'discord.js'
import { Bot } from '../../types/bot'

const router = Router()

/**
 * Middleware to ensure user is authenticated
 */
function requireAuth(req: Request, res: Response, next: Function) {
	if (!req.cookies.discord_user || !req.cookies.discord_tokens) {
		return res.redirect('/auth/login')
	}
	next()
}

/**
 * Interface for verification attempt tracking
 */
interface VerificationAttempt {
	timestamp: number
	success: boolean
}

/**
 * Cache for verification attempts
 * Key: User ID
 * Value: Array of verification attempts
 */
const verificationAttempts = new Map<string, VerificationAttempt[]>()

/**
 * Check if user has exceeded verification attempts
 */
function hasExceededAttempts(userId: string): boolean {
	const attempts = verificationAttempts.get(userId) || []
	const recentAttempts = attempts.filter(
		(attempt) => Date.now() - attempt.timestamp < env.VERIFICATION_TIMEOUT,
	)

	return recentAttempts.length >= env.MAX_VERIFICATION_ATTEMPTS
}

/**
 * Record a verification attempt
 */
function recordAttempt(userId: string, success: boolean) {
	const attempts = verificationAttempts.get(userId) || []
	attempts.push({
		timestamp: Date.now(),
		success,
	})
	verificationAttempts.set(userId, attempts)
}

/**
 * Setup verification routes
 */
export function setupVerificationRoutes(
	app: Application,
	client: Bot<Client>,
): void {
	// Verification page
	router.get('/', requireAuth, (req: Request, res: Response) => {
		const user = req.cookies.discord_user

		if (user && hasExceededAttempts(user.id)) {
			return res.status(429).render('error', {
				error: 'Too many verification attempts. Please try again later.',
			})
		}

		res.render('verify', {
			user,
			ipData: req.ipData,
		})
	})

	router.get('/success', requireAuth, (req: Request, res: Response) => {
		const user = req.cookies.discord_user
		res.render('success', {
			user,
			guild: client.guilds.cache.get(env.DISCORD_GUILD_ID),
		})
	})

	// Handle verification submission
	router.post('/', requireAuth, async (req: Request, res: Response) => {
		const user = req.cookies.discord_user
		const tokens = req.cookies.discord_tokens

		if (!user || !tokens) {
			return res.redirect('/auth/login')
		}

		try {
			if (hasExceededAttempts(user.id)) {
				return res.status(429).render('error', {
					error: 'Too many verification attempts. Please try again later.',
				})
			}

			// Get guild member
			const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID)
			if (!guild) {
				throw new Error('Guild not found')
			}

			let member = guild.members.cache.get(user.id)
			if (!member) {
				// Add user to guild if not already a member
				member = await guild.members.add(user.id, {
					accessToken: tokens.access_token,
					nick: user.username,
				})
			}

			// Add verified role
			const verifiedRole = guild.roles.cache.get(env.VERIFY_ROLE_ID)
			if (!verifiedRole) {
				throw new Error('Verified role not found')
			}

			await member.roles.add(verifiedRole)

			// Record successful verification
			recordAttempt(user.id, true)

			// Log success
			Logger.log(
				'info',
				`User ${user.username} (${user.id}) verified successfully`,
				'Verification',
			)

			// Render success page
			res.render('success', {
				user,
				guild,
			})
		} catch (error: any) {
			// Record failed attempt
			recordAttempt(user.id, false)

			Logger.error('Verification failed', error)
			res.status(500).render('error', {
				error: 'Verification failed. Please try again.',
			})
		}
	})

	app.use('/verify', router)
}
