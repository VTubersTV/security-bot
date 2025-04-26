import { Collection, Client, GatewayIntentBits, Partials } from 'discord.js'
import { Bot } from './types/bot'
import { config as dotenv } from 'dotenv'
import { loadCommands, loadEvents, commands, events } from './utils/collection'
import { join } from 'node:path'
import { env } from './utils/env_parser'
import { VerificationServer } from './server'
import Logger from './classes/logger'

// Load environment variables first
dotenv()

/**
 * Initialize the Discord bot client
 */
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildVoiceStates,
		Partials.Message,
		Partials.Channel,
		Partials.Reaction,
	],
	allowedMentions: {
		parse: ['everyone', 'roles', 'users'],
		repliedUser: true,
	},
}) as Bot<Client>

// Initialize the commands Collection
client.commands = new Collection()

// Load commands first
loadCommands(join(__dirname, 'commands'))
// Set the commands to the client
client.commands = commands

// Then load events
Logger.log('debug', 'Loading events...', 'Bot')
loadEvents(join(__dirname, 'events'), client)
Logger.log(
	'debug',
	`Loaded ${events.size} events: ${Array.from(events.keys()).join(', ')}`,
	'Bot',
)

// Initialize the verification server
const server = new VerificationServer(client)

// Start both the bot and server
async function start() {
	try {
		// Login to Discord
		await client.login(env.DISCORD_BOT_TOKEN)
		Logger.log('info', 'Discord bot connected successfully', 'Bot')

		// Start the verification server
		server.start()
		Logger.log('info', 'Verification server started successfully', 'Server')
	} catch (error: any) {
		Logger.error('Failed to start services', error)
		process.exit(1)
	}
}

// Handle process termination
process.on('SIGTERM', () => {
	Logger.log('info', 'Received SIGTERM signal, shutting down...', 'Process')
	client.destroy()
	process.exit(0)
})

process.on('SIGINT', () => {
	Logger.log('info', 'Received SIGINT signal, shutting down...', 'Process')
	client.destroy()
	process.exit(0)
})

// Start the application
start()
