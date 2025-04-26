import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	GuildMember,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ComponentType,
	Client,
} from 'discord.js'
import { Bot, Command } from '../../types/bot'
import Logger from '../../classes/logger'
import { UserInfraction } from '../../models'
import { BanManager } from '../../classes/BanManager'
import { Types } from 'mongoose'
import { toBase64 } from '../../utils/base64'

/**
 * Enhanced ban command for moderators with additional features:
 * - Temporary and permanent bans
 * - Message deletion options
 * - Ban reason tracking
 * - Infraction system integration
 * - Confirmation for risky bans
 * - DM notification
 * - Audit log integration
 * @implements {Command}
 */
export default {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Ban a user from the server')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addUserOption((option) =>
			option
				.setName('target')
				.setDescription('The user to ban')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('reason')
				.setDescription('Reason for the ban')
				.setRequired(true)
				.setMaxLength(512),
		)
		.addIntegerOption((option) =>
			option
				.setName('duration')
				.setDescription('Ban duration in days (leave empty for permanent)')
				.setMinValue(1)
				.setMaxValue(1000),
		)
		.addIntegerOption((option) =>
			option
				.setName('messages')
				.setDescription('Number of days of messages to delete')
				.setMinValue(0)
				.setMaxValue(7)
				.addChoices(
					{ name: 'None', value: 0 },
					{ name: '24 hours', value: 1 },
					{ name: '3 days', value: 3 },
					{ name: '7 days', value: 7 },
				),
		)
		.addBooleanOption((option) =>
			option
				.setName('silent')
				.setDescription('Execute the ban silently (default: false)'),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		try {
			const target = interaction.options.getUser('target', true)
			const reason = interaction.options.getString('reason', true)
			const duration = interaction.options.getInteger('duration')
			const deleteMessageDays = interaction.options.getInteger('messages') ?? 1
			const silent = interaction.options.getBoolean('silent') ?? false

			// Get member objects
			const guild = interaction.guild!
			const targetMember = await guild.members
				.fetch(target.id)
				.catch(() => null)
			const moderator = interaction.member as GuildMember

			// Check if target is bannable
			if (targetMember) {
				if (!targetMember.bannable) {
					throw new Error(
						'I cannot ban this user - they may have higher permissions than me',
					)
				}

				if (
					moderator.roles.highest.position <=
					targetMember.roles.highest.position
				) {
					throw new Error(
						'You cannot ban this user - they have higher or equal roles to you',
					)
				}

				// Additional checks for risky bans (staff members, high-permission users)
				if (targetMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
					const confirmButton = new ButtonBuilder()
						.setCustomId('confirm_ban')
						.setLabel('Confirm Ban')
						.setStyle(ButtonStyle.Danger)

					const cancelButton = new ButtonBuilder()
						.setCustomId('cancel_ban')
						.setLabel('Cancel')
						.setStyle(ButtonStyle.Secondary)

					const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
						confirmButton,
						cancelButton,
					)

					const confirmEmbed = new EmbedBuilder()
						.setTitle('⚠️ High-Risk Ban Confirmation')
						.setColor(0xff9900)
						.setDescription(
							[
								`You are about to ban **${target.tag}** who has elevated permissions.`,
								'',
								'**This action could be destructive if not intended.**',
								'Please confirm this action.',
							].join('\n'),
						)
						.setTimestamp()

					const response = await interaction.reply({
						embeds: [confirmEmbed],
						components: [row],
						ephemeral: true,
					})

					try {
						const confirmation = await response.awaitMessageComponent({
							filter: (i) => {
								if (i.user.id === interaction.user.id) return true
								i.reply({
									content: 'You cannot use this button.',
									ephemeral: true,
								})
								return false
							},
							time: 30000,
							componentType: ComponentType.Button,
						})

						if (confirmation.customId === 'cancel_ban') {
							await confirmation.update({
								content: 'Ban cancelled.',
								embeds: [],
								components: [],
							})
							return
						}

						// Update the confirmation message and proceed with ban
						await confirmation.update({
							content: 'Processing ban...',
							embeds: [],
							components: [],
						})
					} catch (error) {
						await interaction.editReply({
							content: 'Ban cancelled - confirmation timed out.',
							embeds: [],
							components: [],
						})
						return
					}
				}
			}

			// Format duration for display
			const durationText = duration ? `for ${duration} days` : 'permanently'

			// Create infraction record
			const infraction = await UserInfraction.create({
				userId: target.id,
				guildId: guild.id,
				type: 'BAN',
				reason,
				moderatorId: interaction.user.id,
				duration: duration ? duration * 24 * 60 : undefined, // Convert to minutes
				active: true,
				expiresAt:
					duration ?
						new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
					:	undefined,
				channelId: interaction.channelId,
			})

			// Send DM to target if possible
			if (!silent) {
				try {
					const dmEmbed = new EmbedBuilder()
						.setTitle('🔨 You have been banned')
						.setColor(0xff0000)
						.setDescription(
							[
								`You have been banned from **${guild.name}** ${durationText}`,
								'',
								`**Reason:** ${reason}`,
								`**Moderator:** ${interaction.user.tag}`,
								'',
								duration ?
									`Your ban will expire in ${duration} days`
								:	'This is a permanent ban',
								'',
								'If you believe this was a mistake, you can appeal at:',
								`${process.env.WEB_URL}/unban/request?user=${toBase64(target.id)}`,
							].join('\n'),
						)
						.setTimestamp()

					await target.send({ embeds: [dmEmbed] })
				} catch (err) {
					Logger.error(
						'Failed to send ban DM to user',
						err instanceof Error ? err.stack : String(err),
					)
				}
			}

			// Execute ban
			await guild.members.ban(target, {
				deleteMessageDays,
				reason: `${reason} | Moderator: ${interaction.user.tag} | Case #${infraction._id}`,
			})

			// Schedule unban if duration set
			if (duration) {
				const banManager = BanManager.getInstance(
					interaction.client as Bot<Client>,
				)
				banManager.scheduleBan(
					target.id,
					guild.id,
					(infraction._id as Types.ObjectId).toString(),
					duration,
				)
			}

			// Send confirmation
			const embed = new EmbedBuilder()
				.setTitle('🔨 User Banned')
				.setColor(0xff0000)
				.setDescription(
					[
						`Successfully banned **${target.tag}** ${durationText}`,
						'',
						`**Reason:** ${reason}`,
						`**Message Deletion:** ${deleteMessageDays} days`,
						`**Moderator:** ${interaction.user.tag}`,
						`**Case ID:** ${infraction._id}`,
						silent ? '*This ban was executed silently*' : '',
					]
						.filter(Boolean)
						.join('\n'),
				)
				.setThumbnail(target.displayAvatarURL())
				.setTimestamp()

			// If we had a confirmation dialog, edit the existing reply
			if (targetMember?.permissions.has(PermissionFlagsBits.ManageMessages)) {
				await interaction.editReply({ embeds: [embed], components: [] })
			} else {
				// Otherwise send a new reply
				if (!silent) {
					await interaction.reply({ embeds: [embed] })
				} else {
					await interaction.reply({ embeds: [embed], ephemeral: true })
				}
			}

			// Log the ban
			Logger.log(
				'info',
				`${interaction.user.tag} banned ${target.tag} ${durationText} for: ${reason} (Case #${infraction._id})`,
			)
		} catch (error) {
			const embed = new EmbedBuilder()
				.setTitle('❌ Ban Failed')
				.setColor(0xff0000)
				.setDescription(
					`Failed to ban user: ${error instanceof Error ? error.message : 'Unknown error'}`,
				)
				.setTimestamp()

			await interaction.reply({ embeds: [embed], ephemeral: true })
			Logger.error(
				'Ban command failed',
				error instanceof Error ? error.stack : String(error),
			)
		}
	},
} as Command
