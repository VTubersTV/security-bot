import express from 'express'
import { join } from 'path'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { env } from '../utils/env_parser'
import { setupAuthRoutes } from './routes/auth'
import { setupVerificationRoutes } from './routes/verification'
import { setupModerationRoutes } from './routes/moderation'
import { setupUnbanRoutes } from './routes/unban'
import { setupMiddleware } from './middleware'
import Logger from '../classes/logger'
import { Bot } from '../types/bot'
import { Client } from 'discord.js'

/**
 * Express server configuration for the verification system
 */
export class VerificationServer {
	private app = express()
	private readonly port: number
	private client: Bot<Client>

	constructor(client: Bot<Client>) {
		this.port = env.PORT
		this.client = client
		this.setupServer()
	}

	/**
	 * Configure and initialize the Express server
	 * @private
	 */
	private setupServer(): void {
		// Set view engine and static files
		this.app.set('view engine', 'ejs')
		this.app.set('views', join(__dirname, 'views'))
		this.app.use(express.static(join(__dirname, 'public')))

		// Body parser middleware
		this.app.use(express.json())
		this.app.use(express.urlencoded({ extended: true }))

		// Session configuration with MongoDB store
		this.app.use(
			session({
				secret: env.SESSION_SECRET,
				resave: false,
				saveUninitialized: true,
				store: MongoStore.create({
					mongoUrl: env.MONGODB_URI,
					ttl: 24 * 60 * 60, // 24 hours in seconds
					crypto: {
						secret: env.SESSION_SECRET
					},
					autoRemove: 'interval',
					autoRemoveInterval: 60, // Check expired sessions every minute
					touchAfter: 24 * 3600, // Only update session once per 24 hours unless data changes
				}),
				cookie: {
					secure: env.NODE_ENV === 'production',
					maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
					sameSite: 'lax',
					path: '/',
					httpOnly: true
				},
				name: 'sid', // Custom session ID cookie name
			})
		)

		// Setup security middleware
		setupMiddleware(this.app)

		// Setup routes
		setupAuthRoutes(this.app)
		setupVerificationRoutes(this.app, this.client)
		setupModerationRoutes(this.app, this.client)
		setupUnbanRoutes(this.app, this.client)

		// Root route
		this.app.get('/', (req, res) => {
			res.render('index', {
				user: req.session.user || null,
				guild: this.client.guilds.cache.get(env.DISCORD_GUILD_ID) || null,
			})
		})

		// Terms of Service route
		this.app.get('/terms', (req, res) => {
			res.render('terms', {
				user: req.session.user || null,
				guild: this.client.guilds.cache.get(env.DISCORD_GUILD_ID) || null,
				updated: '4/26/2025',
			})
		})

		// Privacy Policy route
		this.app.get('/privacy', (req, res) => {
			res.render('privacy', {
				user: req.session.user || null,
				guild: this.client.guilds.cache.get(env.DISCORD_GUILD_ID) || null,
				updated: '4/26/2025',
			})
		})

		// Error handling
		this.app.use(
			(
				err: Error,
				req: express.Request,
				res: express.Response,
				next: express.NextFunction,
			) => {
				Logger.error('Server error', err)
				res.status(500).render('error', {
					error:
						env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
				})
			}
		)
	}

	/**
	 * Start the verification server
	 */
	public start(): void {
		this.app.listen(this.port, () => {
			Logger.log(
				'info',
				`Verification server running on port ${this.port}`,
				'Server',
			)
		})
	}
}
