import { Router, Request, Response, Application } from 'express'
import { env } from '../../utils/env_parser'
import axios from 'axios'
import Logger from '../../classes/logger'

const router = Router()

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
 * Start Discord OAuth2 flow
 */
router.get('/login', (req: Request, res: Response) => {
	const params = new URLSearchParams({
		client_id: env.DISCORD_CLIENT_ID,
		redirect_uri: `${env.WEB_URL}/auth/callback`,
		response_type: 'code',
		scope: OAUTH_SCOPES.join(' ')
	})

	res.redirect(`${DISCORD_API_URL}/oauth2/authorize?${params}`)
})

/**
 * Handle Discord OAuth2 callback
 */
router.get('/callback', async (req: Request, res: Response) => {
	const { code } = req.query

	if (!code) {
		Logger.log('warn', 'Missing OAuth code parameter', 'Auth')
		return res.redirect('/')
	}

	try {
		// Exchange code for access token
		const tokenResponse = await axios.post<OAuthTokens>(
			`${DISCORD_API_URL}/oauth2/token`,
			new URLSearchParams({
				client_id: env.DISCORD_CLIENT_ID,
				client_secret: env.DISCORD_CLIENT_SECRET,
				grant_type: 'authorization_code',
				code: code as string,
				redirect_uri: `${env.WEB_URL}/auth/callback`
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

		Logger.log('info', `User authenticated: ${userResponse.data.username}`, 'Auth')

		// Redirect to verification page
		res.redirect('/verify')
	} catch (error: any) {
		Logger.error('OAuth callback failed', error)
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
		tokens: OAuthTokens
		user: DiscordUser
	}
}
