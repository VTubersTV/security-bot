import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
} from 'discord.js'
import { Command } from '../../types/bot'
import { AutoModRule, AutoModAction } from '../../models'
import Logger from '../../classes/logger'

export default {
	data: new SlashCommandBuilder()
		.setName('automod-rule')
		.setDescription('Manage auto-moderation rules')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Create a new auto-moderation rule')
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription('Name of the rule')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('Type of content to check')
						.setRequired(true)
						.addChoices(
							{ name: 'Spam', value: 'SPAM' },
							{ name: 'Toxicity', value: 'TOXICITY' },
							{ name: 'Links', value: 'LINKS' },
							{ name: 'Mentions', value: 'MENTIONS' },
							{ name: 'Attachments', value: 'ATTACHMENTS' },
							{ name: 'Custom', value: 'CUSTOM' },
						),
				)
				.addStringOption((option) =>
					option
						.setName('action')
						.setDescription('Action to take when rule is violated')
						.setRequired(true)
						.addChoices(
							{ name: 'Warn', value: 'WARN' },
							{ name: 'Mute', value: 'MUTE' },
							{ name: 'Kick', value: 'KICK' },
							{ name: 'Ban', value: 'BAN' },
							{ name: 'Delete', value: 'DELETE' },
						),
				)
				.addStringOption((option) =>
					option
						.setName('description')
						.setDescription('Description of what the rule does')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('pattern')
						.setDescription('Regular expression pattern for text matching'),
				)
				.addStringOption((option) =>
					option
						.setName('keywords')
						.setDescription('Comma-separated list of keywords to match'),
				)
				.addIntegerOption((option) =>
					option
						.setName('duration')
						.setDescription('Duration of punishment in minutes (for mute/ban)')
						.setMinValue(1),
				)
				.addIntegerOption((option) =>
					option
						.setName('strikes')
						.setDescription('Number of violations before escalating punishment')
						.setMinValue(1)
						.setMaxValue(10),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setDescription('List all auto-moderation rules'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('delete')
				.setDescription('Delete an auto-moderation rule')
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription('Name of the rule to delete')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('toggle')
				.setDescription('Enable or disable a rule')
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription('Name of the rule to toggle')
						.setRequired(true),
				),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		Logger.log('debug', `Executing automod-rule command`, 'AutoModRule')
		const subcommand = interaction.options.getSubcommand()
		Logger.log('debug', `Subcommand: ${subcommand}`, 'AutoModRule')

		switch (subcommand) {
			case 'create': {
				Logger.log('debug', 'Processing create subcommand', 'AutoModRule')
				const name = interaction.options.getString('name', true)
				const type = interaction.options.getString('type', true)
				const action = interaction.options.getString(
					'action',
					true,
				) as AutoModAction
				const description = interaction.options.getString('description', true)
				const pattern = interaction.options.getString('pattern')
				const keywords = interaction.options
					.getString('keywords')
					?.split(',')
					.map((k) => k.trim())
				const duration = interaction.options.getInteger('duration')
				const strikes = interaction.options.getInteger('strikes')

				Logger.log(
					'debug',
					`Creating rule with name: ${name}, type: ${type}, action: ${action}`,
					'AutoModRule',
				)

				try {
					const rule = await AutoModRule.create({
						name,
						type,
						action,
						description,
						pattern,
						keywords,
						actionDuration: duration,
						strikeThreshold: strikes,
						guildId: interaction.guildId,
						channels: [],
						exemptRoles: [],
					})

					Logger.log(
						'debug',
						`Successfully created rule: ${rule._id}`,
						'AutoModRule',
					)

					const embed = new EmbedBuilder()
						.setTitle('✅ Auto-Mod Rule Created')
						.setColor(0x00ff00)
						.setDescription(`Successfully created rule: ${rule.name}`)
						.addFields(
							{ name: 'Type', value: rule.type, inline: true },
							{ name: 'Action', value: rule.action, inline: true },
							{ name: 'Description', value: rule.description },
						)
						.setTimestamp()

					await interaction.reply({ embeds: [embed] })
					Logger.log('debug', 'Sent success response', 'AutoModRule')
				} catch (error) {
					Logger.error(
						'Failed to create auto-mod rule',
						error instanceof Error ? error.stack : String(error),
					)
					const embed = new EmbedBuilder()
						.setTitle('❌ Error')
						.setColor(0xff0000)
						.setDescription(
							'Failed to create auto-mod rule. The rule name might already exist.',
						)
						.setTimestamp()

					await interaction.reply({ embeds: [embed], ephemeral: true })
				}
				break
			}

			case 'list': {
				Logger.log('debug', 'Processing list subcommand', 'AutoModRule')
				try {
					const rules = await AutoModRule.find({ guildId: interaction.guildId })
					Logger.log('debug', `Found ${rules.length} rules`, 'AutoModRule')

					const embed = new EmbedBuilder()
						.setTitle('📋 Auto-Mod Rules')
						.setColor(0x0099ff)
						.setDescription(
							rules.length ?
								'Here are all active auto-moderation rules:'
							:	'No auto-moderation rules found.',
						)
						.setTimestamp()

					for (const rule of rules) {
						Logger.log(
							'debug',
							`Adding rule to embed: ${rule.name}`,
							'AutoModRule',
						)
						embed.addFields({
							name: `${rule.enabled ? '🟢' : '🔴'} ${rule.name}`,
							value: `Type: ${rule.type}\nAction: ${rule.action}\n${rule.description}`,
						})
					}

					await interaction.reply({ embeds: [embed] })
					Logger.log('debug', 'Sent list response', 'AutoModRule')
				} catch (error) {
					Logger.error(
						'Failed to list auto-mod rules',
						error instanceof Error ? error.stack : String(error),
					)
				}
				break
			}

			case 'delete': {
				Logger.log('debug', 'Processing delete subcommand', 'AutoModRule')
				const name = interaction.options.getString('name', true)
				Logger.log('debug', `Attempting to delete rule: ${name}`, 'AutoModRule')

				try {
					const rule = await AutoModRule.findOneAndDelete({
						name,
						guildId: interaction.guildId,
					})

					if (!rule) {
						Logger.log('debug', `Rule not found: ${name}`, 'AutoModRule')
						throw new Error('Rule not found')
					}

					Logger.log(
						'debug',
						`Successfully deleted rule: ${name}`,
						'AutoModRule',
					)

					const embed = new EmbedBuilder()
						.setTitle('🗑️ Auto-Mod Rule Deleted')
						.setColor(0x00ff00)
						.setDescription(`Successfully deleted rule: ${name}`)
						.setTimestamp()

					await interaction.reply({ embeds: [embed] })
				} catch (error) {
					Logger.error(
						'Failed to delete auto-mod rule',
						error instanceof Error ? error.stack : String(error),
					)
					const embed = new EmbedBuilder()
						.setTitle('❌ Error')
						.setColor(0xff0000)
						.setDescription('Failed to delete auto-mod rule. Rule not found.')
						.setTimestamp()

					await interaction.reply({ embeds: [embed], ephemeral: true })
				}
				break
			}

			case 'toggle': {
				Logger.log('debug', 'Processing toggle subcommand', 'AutoModRule')
				const name = interaction.options.getString('name', true)
				Logger.log('debug', `Attempting to toggle rule: ${name}`, 'AutoModRule')

				try {
					const rule = await AutoModRule.findOne({
						name,
						guildId: interaction.guildId,
					})

					if (!rule) {
						Logger.log('debug', `Rule not found: ${name}`, 'AutoModRule')
						throw new Error('Rule not found')
					}

					rule.enabled = !rule.enabled
					await rule.save()
					Logger.log(
						'debug',
						`Rule ${name} toggled to ${rule.enabled}`,
						'AutoModRule',
					)

					const embed = new EmbedBuilder()
						.setTitle('🔄 Auto-Mod Rule Toggled')
						.setColor(0x00ff00)
						.setDescription(
							`Rule "${name}" is now ${rule.enabled ? 'enabled' : 'disabled'}`,
						)
						.setTimestamp()

					await interaction.reply({ embeds: [embed] })
				} catch (error) {
					Logger.error(
						'Failed to toggle auto-mod rule',
						error instanceof Error ? error.stack : String(error),
					)
					const embed = new EmbedBuilder()
						.setTitle('❌ Error')
						.setColor(0xff0000)
						.setDescription('Failed to toggle auto-mod rule. Rule not found.')
						.setTimestamp()

					await interaction.reply({ embeds: [embed], ephemeral: true })
				}
				break
			}
		}
	},
} as Command
