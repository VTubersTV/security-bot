import { REST, Routes, SlashCommandBuilder } from 'discord.js'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'
import Logger from '../classes/logger'

interface EnvVars {
	DISCORD_BOT_TOKEN: string
	DISCORD_CLIENT_ID: string
	DISCORD_GUILD_ID: string
}

const validateEnvVars = () => {
	const requiredEnvVars: (keyof EnvVars)[] = [
		'DISCORD_BOT_TOKEN',
		'DISCORD_CLIENT_ID',
		'DISCORD_GUILD_ID',
	]

	const missingVars = requiredEnvVars.filter((key) => !process.env[key])
	if (missingVars.length > 0) {
		throw new Error(`Missing environment variables: ${missingVars.join(', ')}`)
	}

	return process.env as unknown as EnvVars
}

const loadCommands = async (folderPath: string) => {
	const commands = []
	const commandFolders = readdirSync(folderPath)

	for (const folder of commandFolders) {
		const commandPath = join(folderPath, folder)
		const commandFiles = readdirSync(commandPath).filter((file) =>
			file.endsWith(process.env.NODE_ENV === 'production' ? '.js' : '.ts'),
		)

		for (const file of commandFiles) {
			const command = require(join(commandPath, file)).default

			if (!command?.data?.name) {
				Logger.log(
					'warn',
					`Command ${file} is missing required properties`,
					'Commands',
				)
				continue
			}

			commands.push(
				command.data instanceof SlashCommandBuilder ?
					command.data.toJSON()
				:	command.data,
			)
		}
	}

	return commands
}

export const deployCommands = async () => {
	config()

	try {
		const env = validateEnvVars()
		const {
			DISCORD_BOT_TOKEN: token,
			DISCORD_CLIENT_ID: clientId,
			DISCORD_GUILD_ID: guildId,
		} = env

		// Load commands from directory
		const commands = await loadCommands(join(__dirname, '..', 'commands'))
		Logger.log(
			'info',
			`Found ${commands.length} commands to deploy`,
			'Commands',
		)

		// Initialize REST client and deploy
		const rest = new REST({ version: '10' }).setToken(token)
		Logger.log('info', 'Starting command deployment...', 'Commands')

		await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: commands,
		})

		Logger.log(
			'info',
			'Successfully deployed application commands!',
			'Commands',
		)
	} catch (error) {
		Logger.log('error', `Failed to deploy commands: ${error}`, 'Commands')
		process.exit(1)
	}
}

// Auto-execute when run directly
if (require.main === module) {
	deployCommands().catch((error) => {
		Logger.log('error', `Deployment script failed: ${error}`, 'Commands')
		process.exit(1)
	})
}
