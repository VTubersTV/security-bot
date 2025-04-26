import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
} from 'discord.js'
import { Command } from '../../types/bot'
import { AutoModStats, UserInfraction } from '../../models'

export default {
	data: new SlashCommandBuilder()
		.setName('modstats')
		.setDescription('View moderation statistics')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('overview')
				.setDescription('Get an overview of moderation statistics')
				.addIntegerOption((option) =>
					option
						.setName('days')
						.setDescription('Number of days to look back')
						.setMinValue(1)
						.setMaxValue(30)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription('Get moderation statistics for a specific user')
				.addUserOption((option) =>
					option
						.setName('target')
						.setDescription('The user to check')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('rules')
				.setDescription('Get statistics for auto-mod rules')
				.addIntegerOption((option) =>
					option
						.setName('limit')
						.setDescription('Number of top rules to show')
						.setMinValue(1)
						.setMaxValue(10),
				),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand()

		switch (subcommand) {
			case 'overview': {
				const days = interaction.options.getInteger('days', true)
				const startDate = new Date()
				startDate.setDate(startDate.getDate() - days)

				const [stats, infractions] = await Promise.all([
					AutoModStats.find({
						guildId: interaction.guildId,
						periodStart: { $gte: startDate },
					}),
					UserInfraction.find({
						guildId: interaction.guildId,
						createdAt: { $gte: startDate },
					}),
				])

				// Calculate statistics
				const totalTriggers = stats.reduce(
					(sum, stat) => sum + stat.triggerCount,
					0,
				)
				const totalInfractions = infractions.length
				const uniqueUsers = new Set(infractions.map((i) => i.userId)).size
				const actionBreakdown = infractions.reduce(
					(acc, inf) => {
						acc[inf.type] = (acc[inf.type] || 0) + 1
						return acc
					},
					{} as Record<string, number>,
				)

				const embed = new EmbedBuilder()
					.setTitle('📊 Moderation Statistics Overview')
					.setColor(0x0099ff)
					.setDescription(`Statistics for the last ${days} days`)
					.addFields(
						{
							name: 'Total Auto-Mod Triggers',
							value: totalTriggers.toString(),
							inline: true,
						},
						{
							name: 'Total Infractions',
							value: totalInfractions.toString(),
							inline: true,
						},
						{
							name: 'Unique Users',
							value: uniqueUsers.toString(),
							inline: true,
						},
						{
							name: 'Action Breakdown',
							value:
								Object.entries(actionBreakdown)
									.map(([action, count]) => `${action}: ${count}`)
									.join('\n') || 'No actions taken',
						},
					)
					.setTimestamp()

				await interaction.reply({ embeds: [embed] })
				break
			}

			case 'user': {
				const target = interaction.options.getUser('target', true)
				const infractions = await UserInfraction.find({
					userId: target.id,
					guildId: interaction.guildId,
				})

				const activeInfractions = infractions.filter((i) => i.active)
				const actionBreakdown = infractions.reduce(
					(acc, inf) => {
						acc[inf.type] = (acc[inf.type] || 0) + 1
						return acc
					},
					{} as Record<string, number>,
				)

				const embed = new EmbedBuilder()
					.setTitle('👤 User Moderation Statistics')
					.setColor(0x0099ff)
					.setDescription(`Statistics for ${target.tag}`)
					.addFields(
						{
							name: 'Total Infractions',
							value: infractions.length.toString(),
							inline: true,
						},
						{
							name: 'Active Infractions',
							value: activeInfractions.length.toString(),
							inline: true,
						},
						{
							name: 'Infraction History',
							value:
								Object.entries(actionBreakdown)
									.map(([action, count]) => `${action}: ${count}`)
									.join('\n') || 'No infractions',
						},
					)
					.setThumbnail(target.displayAvatarURL())
					.setTimestamp()

				await interaction.reply({ embeds: [embed] })
				break
			}

			case 'rules': {
				const limit = interaction.options.getInteger('limit') || 5

				// Get top rules using aggregation
				const topRules = await AutoModStats.aggregate([
					{ $match: { guildId: interaction.guildId } },
					{
						$group: {
							_id: '$ruleId',
							totalTriggers: { $sum: '$triggerCount' },
							uniqueUsers: { $sum: '$uniqueUsers' },
							successCount: { $sum: '$successCount' },
							failureCount: { $sum: '$failureCount' },
						},
					},
					{
						$addFields: {
							successRate: {
								$cond: [
									{ $eq: [{ $add: ['$successCount', '$failureCount'] }, 0] },
									0,
									{
										$divide: [
											'$successCount',
											{ $add: ['$successCount', '$failureCount'] },
										],
									},
								],
							},
						},
					},
					{ $sort: { totalTriggers: -1 } },
					{ $limit: limit },
				])

				const embed = new EmbedBuilder()
					.setTitle('📈 Auto-Mod Rule Statistics')
					.setColor(0x0099ff)
					.setDescription(`Top ${limit} most triggered rules`)
					.setTimestamp()

				for (const rule of topRules) {
					const successRate = Math.round(rule.successRate * 100)
					embed.addFields({
						name: `Rule #${rule._id}`,
						value: [
							`Total Triggers: ${rule.totalTriggers}`,
							`Unique Users: ${rule.uniqueUsers}`,
							`Success Rate: ${successRate}%`,
						].join('\n'),
					})
				}

				if (!topRules.length) {
					embed.setDescription('No auto-mod rule statistics available')
				}

				await interaction.reply({ embeds: [embed] })
				break
			}
		}
	},
} as Command
