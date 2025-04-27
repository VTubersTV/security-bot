import { Router, Request, Response, Application } from 'express'
import { env } from '../../utils/env_parser'
import axios from 'axios'
import Logger from '../../classes/logger'
import cookieParser from 'cookie-parser'

const router = Router()
router.use(cookieParser())

/**
 * Discord OAuth2 URLs and configuration
 */
const DISCORD_API_URL = 'https://discord.com/api/v10'
const OAUTH_SCOPES = ['identify', 'guilds.join']
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

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

		// Store tokens and user data in cookies
		res.cookie('discord_tokens', tokenResponse.data, {
			httpOnly: true,
			secure: env.NODE_ENV === 'production',
			maxAge: COOKIE_MAX_AGE,
			sameSite: 'lax'
		})

		res.cookie('discord_user', userResponse.data, {
			httpOnly: true,
			secure: env.NODE_ENV === 'production',
			maxAge: COOKIE_MAX_AGE,
			sameSite: 'lax'
		})

		Logger.log('info', `User authenticated: ${userResponse.data.username}`, 'Auth')

		// Redirect to verification page
		res.redirect('/verify')
	} catch (error: any) {
		Logger.error('OAuth callback failed', error)
		res.clearCookie('discord_tokens')
		res.clearCookie('discord_user')
		res.redirect('/')
	}
})

/**
 * Logout route
 */
router.get('/logout', (req: Request, res: Response) => {
	res.clearCookie('discord_tokens')
	res.clearCookie('discord_user')
	res.redirect('/')
})

/**
 * Setup auth routes for the application
 */
export function setupAuthRoutes(app: Application): void {
	app.use('/auth', router)
}

// Add cookie types to Express Request
declare global {
	namespace Express {
		interface Request {
			cookies: {
				discord_tokens?: OAuthTokens
				discord_user?: DiscordUser
			}
		}
	}
}
