import { Schema, model, Document, Types } from 'mongoose'
import { AutoModAction } from './AutoModRule'

/**
 * Interface representing auto-moderation statistics document
 * @interface IAutoModStats
 * @extends {Document}
 */
export interface IAutoModStats extends Document {
	/** Discord guild ID */
	guildId: string
	/** The rule that was triggered */
	ruleId: Types.ObjectId
	/** Type of action taken */
	actionType: AutoModAction
	/** Number of times this rule was triggered */
	triggerCount: number
	/** Number of unique users affected */
	uniqueUsers: number
	/** Number of successful actions */
	successCount: number
	/** Number of failed actions */
	failureCount: number
	/** Average response time in milliseconds */
	avgResponseTime: number
	/** Timestamp for the statistics period start */
	periodStart: Date
	/** Timestamp for the statistics period end */
	periodEnd: Date
	/** Most common trigger channels */
	topChannels: Array<{
		channelId: string
		count: number
	}>
	/** Most common time periods (hour of day) */
	hourlyDistribution: Array<{
		hour: number
		count: number
	}>
	/** Creation timestamp */
	createdAt: Date
	/** Last update timestamp */
	updatedAt: Date
}

const AutoModStatsSchema = new Schema<IAutoModStats>(
	{
		guildId: {
			type: String,
			required: true,
			index: true,
		},
		ruleId: {
			type: 'ObjectId',
			ref: 'AutoModRule',
			required: true,
		},
		actionType: {
			type: String,
			enum: Object.values(AutoModAction),
			required: true,
		},
		triggerCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		uniqueUsers: {
			type: Number,
			default: 0,
			min: 0,
		},
		successCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		failureCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		avgResponseTime: {
			type: Number,
			default: 0,
			min: 0,
		},
		periodStart: {
			type: Date,
			required: true,
		},
		periodEnd: {
			type: Date,
			required: true,
		},
		topChannels: [
			{
				channelId: {
					type: String,
					required: true,
				},
				count: {
					type: Number,
					default: 0,
					min: 0,
				},
				_id: false,
			},
		],
		hourlyDistribution: [
			{
				hour: {
					type: Number,
					min: 0,
					max: 23,
					required: true,
				},
				count: {
					type: Number,
					default: 0,
					min: 0,
				},
				_id: false,
			},
		],
	},
	{
		timestamps: true,
		versionKey: false,
	},
)

// Create compound indexes for efficient querying
AutoModStatsSchema.index({ guildId: 1, ruleId: 1, periodStart: -1 })
AutoModStatsSchema.index({ guildId: 1, actionType: 1, periodStart: -1 })

/**
 * Get statistics for a specific time period
 * @param {string} guildId - Discord guild ID
 * @param {Date} start - Start of period
 * @param {Date} end - End of period
 * @returns {Promise<IAutoModStats[]>}
 */
AutoModStatsSchema.statics.getStatsByPeriod = function (
	guildId: string,
	start: Date,
	end: Date,
): Promise<IAutoModStats[]> {
	return this.find({
		guildId,
		periodStart: { $gte: start },
		periodEnd: { $lte: end },
	})
		.populate('ruleId')
		.sort({ triggerCount: -1 })
}

/**
 * Get top triggered rules
 * @param {string} guildId - Discord guild ID
 * @param {number} limit - Number of rules to return
 * @returns {Promise<IAutoModStats[]>}
 */
AutoModStatsSchema.statics.getTopRules = function (
	guildId: string,
	limit: number = 10,
): Promise<IAutoModStats[]> {
	return this.aggregate([
		{ $match: { guildId } },
		{
			$group: {
				_id: '$ruleId',
				totalTriggers: { $sum: '$triggerCount' },
				uniqueUsers: { $sum: '$uniqueUsers' },
				successRate: {
					$avg: {
						$divide: [
							'$successCount',
							{ $add: ['$successCount', '$failureCount'] },
						],
					},
				},
			},
		},
		{ $sort: { totalTriggers: -1 } },
		{ $limit: limit },
	])
}

export const AutoModStats = model<IAutoModStats>(
	'AutoModStats',
	AutoModStatsSchema,
)
