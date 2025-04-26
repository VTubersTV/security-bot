import { Client, Events, Interaction, InteractionType } from 'discord.js'
import { Bot, Event } from '../types/bot'
import Logger from '../classes/logger'
import { handleVerify, handleContact } from '../utils/verify'

async function handleCommand(client: Bot<Client>, interaction: Interaction) {
	if (!interaction.isChatInputCommand()) return

	const command = client.commands.get(interaction.commandName)
	if (!command) {
		Logger.log(
			'warn',
			`Command ${interaction.commandName} not found`,
			'Commands',
		)
		return
	}

	try {
		await command.execute(interaction)
	} catch (error: any) {
		Logger.log(
			'error',
			`Error executing command ${interaction.commandName}: ${error.message}`,
			'Commands',
		)

		const errorMessage = 'There was an error while executing this command!'
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: errorMessage,
				ephemeral: true,
			})
		} else {
			await interaction.reply({
				content: errorMessage,
				ephemeral: true,
			})
		}
	}
}

async function handleButton(client: Bot<Client>, interaction: Interaction) {
	if (!interaction.isButton()) return

	const customId = interaction.customId

	switch (customId) {
		case 'verify':
			await handleVerify(client, interaction)
			break
		case 'contact':
			await handleContact(client, interaction)
			break
		case 'confirm_ban':
		case 'cancel_ban':
			// These buttons are handled directly in the ban command
			// through awaitMessageComponent, so we don't need to do anything here
			break
		default:
			Logger.log(
				'warn',
				`Unhandled button interaction: ${customId}`,
				'InteractionCreate',
			)
	}
}

export default {
	name: Events.InteractionCreate,
	once: false,
	async execute(client: Bot<Client>, interaction: Interaction) {
		try {
			switch (interaction.type) {
				case InteractionType.ApplicationCommand:
					await handleCommand(client, interaction)
					break
				case InteractionType.MessageComponent:
					await handleButton(client, interaction)
					break
				default:
					Logger.log(
						'warn',
						`Unhandled interaction type: ${interaction.type}`,
						'InteractionCreate',
					)
			}
		} catch (error: any) {
			Logger.log(
				'error',
				`Unhandled error in interaction handler: ${error.message}`,
				'InteractionCreate',
			)
		}
	},
} as Event
