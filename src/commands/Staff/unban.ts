import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	Client,
} from 'discord.js'
import { Command, Bot } from '../../types/bot'
import { UserInfraction } from '../../models'
import Logger from '../../classes/logger'
import { BanManager } from '../../classes/BanManager'

/**
 * Command to unban a user from the server
 * Features:
 * - Unban by user ID
 * - Optional reason tracking
 * - Updates infraction system
 * - Cancels any scheduled unbans
 * - Audit log integration
 * @implements {Command}
 */
export default {
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription('Unban a user from the server')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addStringOption((option) =>
			option
				.setName('user_id')
				.setDescription('The ID of the user to unban')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('reason')
				.setDescription('Reason for the unban')
				.setRequired(false)
				.setMaxLength(512),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		try {
			const userId = interaction.options.getString('user_id', true)
			const reason =
				interaction.options.getString('reason') ?? 'No reason provided'
			const guild = interaction.guild!

			// Validate user ID format
			if (!/^\d{17,19}$/.test(userId)) {
				throw new Error('Invalid user ID format')
			}

			// Try to fetch the user for more information
			const user = await interaction.client.users
				.fetch(userId)
				.catch(() => null)

			// Check if user is actually banned
			const ban = await guild.bans.fetch(userId).catch(() => null)
			if (!ban) {
				throw new Error('This user is not banned')
			}

			// Cancel any scheduled unbans
			const banManager = BanManager.getInstance(
				interaction.client as Bot<Client>,
			)
			banManager.cancelScheduledUnban(userId, guild.id)

			// Perform the unban
			await guild.members.unban(
				userId,
				`${reason} | Moderator: ${interaction.user.tag}`,
			)

			// Update any active ban infractions
			await UserInfraction.updateMany(
				{
					userId,
					guildId: guild.id,
					type: 'BAN',
					active: true,
				},
				{
					active: false,
					$set: {
						resolvedBy: interaction.user.id,
						resolvedAt: new Date(),
						resolveReason: reason,
					},
				},
			)

			// Create success embed
			const embed = new EmbedBuilder()
				.setTitle('🔓 User Unbanned')
				.setColor(0x00ff00)
				.setDescription(
					[
						user ?
							`Successfully unbanned **${user.tag}**`
						:	`Successfully unbanned user ID: **${userId}**`,
						'',
						`**Reason:** ${reason}`,
						`**Moderator:** ${interaction.user.tag}`,
					].join('\n'),
				)
				.setThumbnail(user?.displayAvatarURL() ?? null)
				.setTimestamp()

			await interaction.reply({ embeds: [embed] })

			// Log the unban
			Logger.log(
				'info',
				`${interaction.user.tag} unbanned ${user?.tag ?? userId} for: ${reason}`,
			)
		} catch (error) {
			const embed = new EmbedBuilder()
				.setTitle('❌ Unban Failed')
				.setColor(0xff0000)
				.setDescription(
					`Failed to unban user: ${error instanceof Error ? error.message : 'Unknown error'}`,
				)
				.setTimestamp()

			await interaction.reply({ embeds: [embed], ephemeral: true })
			Logger.error(
				'Unban command failed',
				error instanceof Error ? error.stack : String(error),
			)
		}
	},
} as Command
