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
const STATE_EXPIRY = 5 * 60 * 1000 // 5 minutes

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
 * Interface for OAuth state data
 */
interface OAuthState {
	value: string
	expires: number
}

/**
 * Generate a cryptographically secure state
 * @returns Secure random state string
 */
function generateSecureState(): OAuthState {
	return {
		value: crypto.randomBytes(32).toString('hex'),
		expires: Date.now() + STATE_EXPIRY
	}
}

/**
 * Start Discord OAuth2 flow
 */
router.get('/login', (req: Request, res: Response) => {
	const state = generateSecureState()
	// Create cookie with state
	res.cookie('oauthState', state.value, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: STATE_EXPIRY,
	})

	const params = new URLSearchParams({
		client_id: env.DISCORD_CLIENT_ID,
		redirect_uri: `${env.WEB_URL}/auth/callback`,
		response_type: 'code',
		scope: OAUTH_SCOPES.join(' '),
		state: state.value,
	})

	res.redirect(`${DISCORD_API_URL}/oauth2/authorize?${params}`)
})

/**
 * Handle Discord OAuth2 callback
 */
router.get('/callback', async (req: Request, res: Response) => {
	const { code, state } = req.query
	const storedState = req.cookies?.oauthState

	// Comprehensive state verification
	if (!state || !storedState) {
		Logger.log('warn', 'Missing OAuth state parameter', 'Auth')
		res.clearCookie('oauthState')
		return res.redirect('/auth/login')
	}

	if (state !== storedState) {
		Logger.log('warn', 'Invalid OAuth state parameter', 'Auth')
		res.clearCookie('oauthState')
		return res.redirect('/auth/login')
	}

	// Clear used state
	res.clearCookie('oauthState')

	try {
		// Exchange code for access token
		const tokenResponse = await axios.post<OAuthTokens>(
			`${DISCORD_API_URL}/oauth2/token`,
			new URLSearchParams({
				client_id: env.DISCORD_CLIENT_ID,
				client_secret: env.DISCORD_CLIENT_SECRET,
				grant_type: 'authorization_code',
				code: code as string,
				redirect_uri: `${env.WEB_URL}/auth/callback`,
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

		// Redirect to verification page
		res.redirect('/verify')
	} catch (error: any) {
		Logger.error('OAuth callback failed', error)
		res.status(500).render('error', {
			error: 'Authentication failed. Please try again.',
		})
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
		oauthState: OAuthState
		tokens: OAuthTokens
		user: DiscordUser
	}
}
