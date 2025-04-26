import Logger from '../classes/logger'
import { Bot, Event } from '../types/bot'
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Client,
	EmbedBuilder,
	Events,
	Message,
	TextChannel,
	Guild,
} from 'discord.js'
import { getPermissionLevel, PermissionLevels } from '../utils/permissions'
import { env } from '../utils/env_parser'
import { AutoMod } from '../classes/AutoMod'

const PREFIX = '.'

/**
 * Sends a verification embed message with a button to verify the user
 * @param client - The Discord bot client
 * @param message - The message that triggered this function
 * @returns Promise<void>
 * @throws {Error} If sending the verification embed fails
 */
async function sendVerifyEmbed(
	client: Bot<Client>,
	message: Message,
): Promise<void> {
	const embed = new EmbedBuilder()
		.setColor('Blue')
		.setTitle('Account Verification Required')
		.setDescription(
			'**Welcome to VTubers.TV!**\n\n' +
				"To access our server and join the community, you'll need to verify your account first. " +
				'This helps us keep our server safe and spam-free.\n\n' +
				"**What You'll Get Access To:**\n" +
				'• All server channels and content\n' +
				'• Community discussions and chat\n' +
				'• Server events and activities\n' +
				'• Member-only features\n\n' +
				'**Quick Verification Steps:**\n' +
				'1. Click "Verify Account" below\n' +
				'2. Complete a quick verification check\n' +
				'3. Instantly join the community!\n\n' +
				'*Having trouble? Contact our moderators for help.*',
		)
		.setTimestamp()
		.setThumbnail(
			message.guild?.iconURL() || client.user?.displayAvatarURL() || null,
		)
		.setFooter({
			text: 'VTubers.TV Security System • Verification Module',
			iconURL: client.user?.displayAvatarURL(),
		})

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setLabel('Verify Account')
			.setStyle(ButtonStyle.Link)
			.setURL(`${env.WEB_URL}/verify`),
		new ButtonBuilder()
			.setCustomId('contact')
			.setLabel('Contact Moderators')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('💬'),
	)

	try {
		const channel = message.guild?.channels.cache.get(
			env.WELCOME_CHANNEL_ID,
		) as TextChannel
		if (!channel) {
			throw new Error('Welcome channel not found')
		}
		await channel.send({
			embeds: [embed],
			components: [row],
		})
		Logger.log(
			'info',
			`Sent verification embed to ${message.author.tag}`,
			'Verification',
		)
	} catch (error: any) {
		Logger.error('Failed to send verification embed', error)
		throw new Error(`Failed to send verification embed: ${error.message}`)
	}
}

/**
 * Gives a role to a user or everyone in the server
 * @param client - The Discord bot client
 * @param message - The message that triggered the command
 * @returns Promise<void>
 */
async function giveRole(client: Bot<Client>, message: Message) {
	// Parse command arguments - skip the command name
	const args = message.content.slice(PREFIX.length + 'give-role'.length).trim().split(/ +/)
	
	// Find role argument
	const roleIndex = args.findIndex(arg => arg === '-role')
	const roleArg = roleIndex !== -1 ? args[roleIndex + 1] : undefined
	
	// Find user argument
	const userIndex = args.findIndex(arg => arg === '-user')
	const userArg = userIndex !== -1 ? args[userIndex + 1] : undefined
	
	// Check for everyone flag
	const hasEveryoneFlag = args.includes('-everyone')

	// Validate arguments
	if (!roleArg || (!userArg && !hasEveryoneFlag)) {
		await message.reply({
			content: 'Invalid syntax. Usage:\n`.give-role -role <@role|role_id|role_name> -user <@user|user_id|user_tag>`\nOR\n`.give-role -role <@role|role_id|role_name> -everyone`',
			allowedMentions: { repliedUser: true }
		})
		return
	}

	try {
		// Extract role ID from mention or use as is
		const roleId = roleArg.match(/^<@&(\d+)>$/)?.[1] || roleArg
		
		// Get role from server
		const role = message.guild?.roles.cache.find(r => 
			r.id === roleId || 
			r.name.toLowerCase() === roleArg.toLowerCase()
		)
		
		if (!role) {
			throw new Error(`Role "${roleArg}" not found`)
		}

		// Check if bot has permissions to manage this role
		if (role.position >= (message.guild?.members.me?.roles.highest.position || 0)) {
			throw new Error(`I don't have permission to assign the role "${role.name}"`)
		}

		// Handle giving role
		if (hasEveryoneFlag) {
			// Give role to everyone
			await message.guild?.members.fetch()
			const members = message.guild?.members.cache
			
			if (!members) {
				throw new Error('Failed to fetch guild members')
			}

			const reply = await message.reply({
				content: `Giving role "${role.name}" to everyone... This may take a while.`,
				allowedMentions: { roles: [], users: [message.author.id] }
			})

			let successCount = 0
			let failCount = 0

			for (const [, member] of members) {
				try {
					// Skip bots and members who already have the role
					if (member.user.bot || member.roles.cache.has(role.id)) continue
					
					await member.roles.add(role)
					successCount++
					// Add delay between role assignments to avoid rate limits
					await new Promise(resolve => setTimeout(resolve, 1000))
				} catch (error) {
					Logger.error(`Failed to give role to ${member.user.tag}`, error instanceof Error ? error : new Error(String(error)))
					failCount++
				}
			}

			await reply.edit({
				content: `Role "${role.name}" added to ${successCount} members. Failed for ${failCount} members.`,
				allowedMentions: { roles: [], users: [message.author.id] }
			})
		} else if (userArg) {
			// Extract user ID from mention or use as is
			const userId = userArg.match(/^<@!?(\d+)>$/)?.[1] || userArg

			// Get member from server
			const member = await message.guild?.members.fetch(userId).catch(() => {
				// If direct fetch fails, try finding by username/tag
				return message.guild?.members.cache.find(m =>
					m.user.tag.toLowerCase() === userArg.toLowerCase() ||
					m.user.username.toLowerCase() === userArg.toLowerCase()
				)
			})

			if (!member) {
				throw new Error(`User "${userArg}" not found`)
			}

			// Check if member already has the role
			if (member.roles.cache.has(role.id)) {
				await message.reply({
					content: `${member.user.tag} already has the role "${role.name}"`,
					allowedMentions: { users: [message.author.id] }
				})
				return
			}

			await member.roles.add(role)
			await message.reply({
				content: `Role "${role.name}" added to ${member.user.tag}`,
				allowedMentions: { users: [message.author.id] }
			})
		}

	} catch (error: any) {
		Logger.error('Failed to give role', error)
		await message.reply({
			content: `Error: ${error.message}`,
			allowedMentions: { users: [message.author.id] }
		})
	}
}

export default {
	name: Events.MessageCreate,
	async execute(client: Bot<Client>, message: Message) {
		Logger.log('debug', `Message received: ${message.content}`, 'MessageCreate')

		// Skip bot messages
		if (message.author.bot) {
			Logger.log('debug', 'Skipping bot message', 'MessageCreate')
			return
		}

		// Process message through AutoMod
		Logger.log('debug', 'Passing message to AutoMod', 'MessageCreate')
		await AutoMod.getInstance().processMessage(message)
		Logger.log('debug', 'AutoMod processing complete', 'MessageCreate')

		// Handle commands
		if (message.content.startsWith(PREFIX)) {
			Logger.log(
				'debug',
				`Command detected: ${message.content}`,
				'MessageCreate',
			)
			const args = message.content.slice(PREFIX.length).trim().split(/ +/)
			const command = args.shift()?.toLowerCase()

			if (!command) return

			const permissions = await getPermissionLevel(
				message.author,
				message.guild as Guild,
			)

			switch (command) {
				case 'verify':
					
					if (permissions !== PermissionLevels.MEMBER) {
						await sendVerifyEmbed(client, message)
					} else {
						message.reply('You do not have permission to use this command.')
					}
					break
				case 'give-role':
					if (permissions === PermissionLevels.ADMIN || permissions === PermissionLevels.MODERATOR) {
						await giveRole(client, message)
					} else {
						await message.reply({
							content: 'You need administrator or moderator permissions to use this command.',
							allowedMentions: { repliedUser: true }
						})
					}
					break
			}
		}
	},
} as Event
