import { Router, Request, Response, Application } from 'express'
import { env } from '../../utils/env_parser'
import axios from 'axios'
import Logger from '../../classes/logger'
import crypto from 'crypto'
import cookieParser from 'cookie-parser'

const router = Router()
router.use(cookieParser())

/**
 * Discord OAuth2 URLs and configuration
 */
const DISCORD_API_URL = 'https://discord.com/api/v10'
const OAUTH_SCOPES = ['identify', 'guilds.join']

/**
 * Interface for Discord user data
 */
interface DiscordUser {
	id: string
	username: string
	discriminator: string
	avatar: string | null
	email?: string
}

/**
 * Interface for Discord OAuth2 tokens
 */
interface OAuthTokens {
	access_token: string
	token_type: string
	expires_in: number
	refresh_token: string
	scope: string
}

/**
 * Generate PKCE challenge pair
 * @returns Object containing code verifier and challenge
 */
function generatePKCE() {
	const verifier = crypto.randomBytes(32).toString('base64url')
	const challenge = crypto
		.createHash('sha256')
		.update(verifier)
		.digest('base64url')
	
	return { verifier, challenge }
}

/**
 * Start Discord OAuth2 flow
 */
router.get('/login', async (req: Request, res: Response) => {
	const { verifier, challenge } = generatePKCE()
	
	// Store verifier in session and explicitly save
	req.session.codeVerifier = verifier
	
	// Ensure session is saved before redirect
	await new Promise<void>((resolve, reject) => {
		req.session.save((err) => {
			if (err) {
				Logger.error('Failed to save session', err)
				reject(err)
				return
			}
			resolve()
		})
	})

	Logger.log('debug', `Starting OAuth flow with PKCE, Session ID: ${req.sessionID}, Verifier Length: ${verifier.length}`, 'Auth')

	const params = new URLSearchParams({
		client_id: env.DISCORD_CLIENT_ID,
		redirect_uri: `${env.WEB_URL}/auth/callback`,
		response_type: 'code',
		scope: OAUTH_SCOPES.join(' '),
		code_challenge: challenge,
		code_challenge_method: 'S256'
	})

	// Send response after session is saved
	res.redirect(`${DISCORD_API_URL}/oauth2/authorize?${params}`)
})

/**
 * Handle Discord OAuth2 callback
 */
router.get('/callback', async (req: Request, res: Response) => {
	const { code } = req.query
	const verifier = req.session.codeVerifier

	Logger.log('debug', `Callback received - Code: ${!!code}, Has Verifier: ${!!verifier}, Session ID: ${req.sessionID}, Verifier: ${verifier?.slice(0, 10)}...`, 'Auth')

	// If there's no code, redirect to login
	if (!code) {
		Logger.log('warn', 'Missing OAuth code parameter', 'Auth')
		await new Promise<void>((resolve) => req.session.save(err => {
			if (err) Logger.error('Session save error', err)
			resolve()
		}))
		return res.redirect('/')
	}

	// If there's no verifier, start over
	if (!verifier) {
		Logger.log('warn', `Missing code verifier for session ${req.sessionID}`, 'Auth')
		await new Promise<void>((resolve) => req.session.save(err => {
			if (err) Logger.error('Session save error', err)
			resolve()
		}))
		return res.redirect('/')
	}

	try {
		// Exchange code for access token using PKCE
		const tokenResponse = await axios.post<OAuthTokens>(
			`${DISCORD_API_URL}/oauth2/token`,
			new URLSearchParams({
				client_id: env.DISCORD_CLIENT_ID,
				client_secret: env.DISCORD_CLIENT_SECRET,
				grant_type: 'authorization_code',
				code: code as string,
				redirect_uri: `${env.WEB_URL}/auth/callback`,
				code_verifier: verifier
			}),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			},
		)

		// Get user data
		const userResponse = await axios.get<DiscordUser>(
			`${DISCORD_API_URL}/users/@me`,
			{
				headers: {
					Authorization: `Bearer ${tokenResponse.data.access_token}`,
				},
			},
		)

		// Store user data and tokens in session
		req.session.tokens = tokenResponse.data
		req.session.user = userResponse.data
		delete req.session.codeVerifier

		// Ensure session is saved before redirect
		await new Promise<void>((resolve) => {
			req.session.save((err) => {
				if (err) {
					Logger.error('Failed to save session after auth', err)
				}
				resolve()
			})
		})

		Logger.log('info', `User authenticated: ${userResponse.data.username}, Session: ${req.sessionID}`, 'Auth')

		// Redirect to verification page
		res.redirect('/verify')
	} catch (error: any) {
		Logger.error('OAuth callback failed', error)
		delete req.session.codeVerifier
		await new Promise<void>((resolve) => req.session.save(err => {
			if (err) Logger.error('Session save error', err)
			resolve()
		}))
		res.redirect('/')
	}
})

/**
 * Logout route
 */
router.get('/logout', (req: Request, res: Response) => {
	req.session.destroy(() => {
		res.redirect('/')
	})
})

/**
 * Setup auth routes for the application
 */
export function setupAuthRoutes(app: Application): void {
	app.use('/auth', router)
}

// Extend Express session with our custom properties
declare module 'express-session' {
	interface SessionData {
		codeVerifier: string
		tokens: OAuthTokens
		user: DiscordUser
	}
}
