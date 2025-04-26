import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
} from 'discord.js'
import { Command } from '../../types/bot'
import { UserInfraction, AutoModAction } from '../../models'
import { Types } from 'mongoose'

export default {
	data: new SlashCommandBuilder()
		.setName('infraction')
		.setDescription('Manage user infractions')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Add an infraction to a user')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user to add an infraction to')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('Type of infraction')
						.setRequired(true)
						.addChoices(
							{ name: 'Warning', value: 'WARN' },
							{ name: 'Mute', value: 'MUTE' },
							{ name: 'Kick', value: 'KICK' },
							{ name: 'Ban', value: 'BAN' },
						),
				)
				.addStringOption((option) =>
					option
						.setName('reason')
						.setDescription('Reason for the infraction')
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('duration')
						.setDescription('Duration in minutes (for mute/ban)')
						.setMinValue(1),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setDescription('Remove an infraction from a user')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user to remove an infraction from')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('id')
						.setDescription('ID of the infraction to remove')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setDescription('List infractions for a user')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user to list infractions for')
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName('active_only')
						.setDescription('Show only active infractions'),
				),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand()

		switch (subcommand) {
			case 'add': {
				const target = interaction.options.getUser('target', true)
				const type = interaction.options.getString(
					'type',
					true,
				) as AutoModAction
				const reason = interaction.options.getString('reason', true)
				const duration = interaction.options.getInteger('duration')

				// Calculate expiration time if duration is provided
				const expiresAt =
					duration ? new Date(Date.now() + duration * 60000) : undefined

				try {
					const infraction = await UserInfraction.create({
						userId: target.id,
						guildId: interaction.guildId,
						type,
						reason,
						moderatorId: interaction.user.id,
						duration,
						active: true,
						expiresAt,
					})

					const embed = new EmbedBuilder()
						.setTitle('⚠️ Infraction Added')
						.setColor(0xff9900)
						.setDescription(`Added infraction for ${target.tag}`)
						.addFields(
							{ name: 'Type', value: type, inline: true },
							{ name: 'Reason', value: reason },
							{
								name: 'Duration',
								value: duration ? `${duration} minutes` : 'Permanent',
								inline: true,
							},
							{
								name: 'ID',
								value: (infraction._id as Types.ObjectId).toString(),
							},
						)
						.setTimestamp()

					await interaction.reply({ embeds: [embed] })
				} catch (error) {
					const embed = new EmbedBuilder()
						.setTitle('❌ Error')
						.setColor(0xff0000)
						.setDescription('Failed to add infraction')
						.setTimestamp()

					await interaction.reply({ embeds: [embed], ephemeral: true })
				}
				break
			}

			case 'remove': {
				const target = interaction.options.getUser('target', true)
				const infractionId = interaction.options.getString('id', true)

				try {
					// Validate ObjectId
					if (!Types.ObjectId.isValid(infractionId)) {
						throw new Error('Invalid infraction ID')
					}

					const infraction = await UserInfraction.findOneAndUpdate(
						{
							_id: new Types.ObjectId(infractionId),
							userId: target.id,
							guildId: interaction.guildId,
						},
						{ active: false },
						{ new: true },
					)

					if (!infraction) {
						throw new Error('Infraction not found')
					}

					const embed = new EmbedBuilder()
						.setTitle('✅ Infraction Removed')
						.setColor(0x00ff00)
						.setDescription(`Removed infraction from ${target.tag}`)
						.addFields(
							{ name: 'Type', value: infraction.type, inline: true },
							{ name: 'Reason', value: infraction.reason },
							{
								name: 'ID',
								value: (infraction._id as Types.ObjectId).toString(),
							},
						)
						.setTimestamp()

					await interaction.reply({ embeds: [embed] })
				} catch (error) {
					const embed = new EmbedBuilder()
						.setTitle('❌ Error')
						.setColor(0xff0000)
						.setDescription(
							'Failed to remove infraction. Make sure the ID is correct.',
						)
						.setTimestamp()

					await interaction.reply({ embeds: [embed], ephemeral: true })
				}
				break
			}

			case 'list': {
				const target = interaction.options.getUser('target', true)
				const activeOnly =
					interaction.options.getBoolean('active_only') ?? false

				const query = {
					userId: target.id,
					guildId: interaction.guildId,
					...(activeOnly ? { active: true } : {}),
				}

				const infractions = await UserInfraction.find(query)
					.sort({ createdAt: -1 })
					.limit(10)

				const embed = new EmbedBuilder()
					.setTitle('📝 User Infractions')
					.setColor(0x0099ff)
					.setDescription(
						`${activeOnly ? 'Active infractions' : 'Recent infractions'} for ${target.tag}`,
					)
					.setThumbnail(target.displayAvatarURL())
					.setTimestamp()

				if (infractions.length > 0) {
					for (const infraction of infractions) {
						const moderator = await interaction.client.users.fetch(
							infraction.moderatorId!,
						)
						embed.addFields({
							name: `${infraction.type} - ${infraction.active ? '🟢 Active' : '🔴 Inactive'}`,
							value: [
								`**Reason:** ${infraction.reason}`,
								`**Moderator:** ${moderator.tag}`,
								`**Date:** <t:${Math.floor(infraction.createdAt.getTime() / 1000)}:R>`,
								`**ID:** ${(infraction._id as Types.ObjectId).toString()}`,
								infraction.duration ?
									`**Duration:** ${infraction.duration} minutes`
								:	'',
							]
								.filter(Boolean)
								.join('\n'),
						})
					}
				} else {
					embed.setDescription(
						`No ${activeOnly ? 'active ' : ''}infractions found for ${target.tag}`,
					)
				}

				await interaction.reply({ embeds: [embed] })
				break
			}
		}
	},
} as Command
