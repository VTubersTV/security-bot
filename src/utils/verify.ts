import { Bot } from '../types/bot'
import {
	ButtonInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	Interaction,
	TextChannel,
} from 'discord.js'
import Logger from '../classes/logger'
import { env } from './env_parser'

/**
 * Handles the verification button interaction
 * @param client - The Discord bot client
 * @param interaction - The button interaction
 * @returns Promise<void>
 * @throws {Error} If verification process fails
 */
export async function handleVerify(
	client: Bot<Client>,
	interaction: Interaction,
): Promise<void> {
	if (!interaction.isButton()) return

	const buttonInteraction = interaction as ButtonInteraction
	const member = interaction.member as GuildMember

	try {
		// Defer the reply to prevent interaction timeout
		await buttonInteraction.deferReply({ ephemeral: true })

		// Check if user is already verified
		if (member.roles.cache.some((role) => role.id === env.VERIFY_ROLE_ID)) {
			await buttonInteraction.editReply({
				content: 'You are already verified!',
			})
			return
		}

		// Add verified role
		const verifiedRole = member.guild.roles.cache.get(env.VERIFY_ROLE_ID)
		if (!verifiedRole) {
			throw new Error('Verified role not found')
		}

		await member.roles.add(verifiedRole)

		// Send success message
		const successEmbed = new EmbedBuilder()
			.setColor('Green')
			.setTitle('✅ Verification Successful!')
			.setDescription(
				'You now have access to all server channels. Welcome to the community!',
			)
			.setTimestamp()
			.setFooter({
				text: 'VTubers.TV Security System',
				iconURL: client.user?.displayAvatarURL(),
			})

		await buttonInteraction.editReply({
			embeds: [successEmbed],
		})

		Logger.log(
			'info',
			`User ${member.user.tag} has been verified`,
			'Verification',
		)
	} catch (error: any) {
		Logger.log(
			'error',
			`Verification failed for ${member.user.tag}: ${error.message}`,
			'Verification',
		)
		await buttonInteraction.editReply({
			content:
				'An error occurred during verification. Please contact a moderator.',
		})
		throw new Error(`Verification failed: ${error.message}`)
	}
}

/**
 * Handles the contact button interaction
 * @param client - The Discord bot client
 * @param interaction - The button interaction
 * @returns Promise<void>
 * @throws {Error} If contact process fails
 */
/**
 * Handles the contact button interaction for users needing verification assistance
 * @param client - The Discord bot client instance
 * @param interaction - The button interaction event
 * @returns Promise<void>
 * @throws {Error} If contact process fails due to missing channels or other errors
 */
export async function handleContact(
	client: Bot<Client>,
	interaction: Interaction,
): Promise<void> {
	// Type guard to ensure this is a button interaction
	if (!interaction.isButton()) return

	// Cast interaction and member to correct types
	const buttonInteraction = interaction as ButtonInteraction
	const member = interaction.member as GuildMember
	const { user } = member

	try {
		// Defer reply immediately to prevent timeout
		await buttonInteraction.deferReply({ ephemeral: true })

		// Validate staff chat channel exists
		const contactChannel = interaction.guild?.channels.cache.get(
			env.STAFF_CHAT_CHANNEL_ID,
		) as TextChannel
		if (!contactChannel) {
			throw new Error('Staff chat channel not configured or inaccessible')
		}

		// Construct rich embed for staff notification
		const contactEmbed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle('🔔 Verification Assistance Needed')
			.setDescription(
				[
					`A user has requested help with verification:`,
					'',
					`👤 **User:** ${user.tag}`,
					`🆔 **ID:** ${user.id}`,
					`📅 **Account Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
					`📥 **Joined Server:** <t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`,
				].join('\n'),
			)
			.setThumbnail(user.displayAvatarURL({ size: 128 }))
			.setTimestamp()
			.setFooter({
				text: 'VTubers.TV Security System',
				iconURL: client.user?.displayAvatarURL(),
			})

		// Send notification to staff
		await contactChannel.send({
			content: `<@&${env.VERIFY_ROLE_ID}> - Verification assistance needed`,
			embeds: [contactEmbed],
			allowedMentions: { roles: [env.VERIFY_ROLE_ID] },
		})

		// Confirm receipt to user
		await buttonInteraction.editReply({
			content:
				'✅ Your request for assistance has been sent to our moderators. Please wait patiently for a response.',
		})

		Logger.log(
			'info',
			`Verification assistance requested by ${user.tag}`,
			'Contact',
		)
	} catch (error: any) {
		// Log error and notify user
		Logger.log(
			'error',
			`Contact request failed for ${member.user.tag}: ${error.message}`,
			'Contact',
		)

		await buttonInteraction.editReply({
			content:
				'❌ Unable to process your request. Please try again later or contact a moderator directly.',
		})

		throw new Error(`Contact request failed: ${error.message}`)
	}
}
