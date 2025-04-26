import { config } from 'dotenv'
import { z } from 'zod'

const DEFAULT_PORT = 3000

/**
 * Environment variable schema validation using Zod
 * Based on .env.example configuration
 */
const envSchema = z.object({
	// Discord Bot Configuration
	DISCORD_BOT_TOKEN: z.string().min(1),
	DISCORD_CLIENT_ID: z.string().min(1),
	DISCORD_CLIENT_SECRET: z.string().min(1),
	DISCORD_GUILD_ID: z.string().min(1),

	// Environment
	NODE_ENV: z.enum(['development', 'production']),

	// Discord Configuration
	VERIFY_ROLE_ID: z.string(),
	WELCOME_CHANNEL_ID: z.string(),
	STAFF_CHAT_CHANNEL_ID: z.string(),

	// Web Server Configuration
	PORT: z.number().min(1).optional().default(DEFAULT_PORT),
	WEB_URL: z
		.string()
		.min(1)
		.optional()
		.default(`http://localhost:${DEFAULT_PORT}`),
	SESSION_SECRET: z.string().min(32),

	// Security Configuration
	MAX_VERIFICATION_ATTEMPTS: z.number().min(1).optional().default(3),
	VERIFICATION_TIMEOUT: z
		.number()
		.min(1)
		.optional()
		.default(30 * 60 * 1000), // 30 minutes in ms
	IP_BAN_DURATION: z
		.number()
		.min(1)
		.optional()
		.default(24 * 60 * 60 * 1000), // 24 hours in ms
	IPQS_API_KEY: z.string().min(1),
	MONGODB_URI: z.string().min(1),
})

// Load environment variables
config()

// Parse and validate environment variables
export const env = envSchema.parse({
	...process.env,
	PORT: process.env.PORT ? parseInt(process.env.PORT) : undefined,
	MAX_VERIFICATION_ATTEMPTS:
		process.env.MAX_VERIFICATION_ATTEMPTS ?
			parseInt(process.env.MAX_VERIFICATION_ATTEMPTS)
		:	undefined,
	VERIFICATION_TIMEOUT:
		process.env.VERIFICATION_TIMEOUT ?
			parseInt(process.env.VERIFICATION_TIMEOUT)
		:	undefined,
	IP_BAN_DURATION:
		process.env.IP_BAN_DURATION ?
			parseInt(process.env.IP_BAN_DURATION)
		:	undefined,
})

// Type definition for environment variables
export type Env = z.infer<typeof envSchema>
