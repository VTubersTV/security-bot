import { Schema, model, Document } from 'mongoose'

/**
 * Represents the action to take when an auto-mod rule is triggered
 */
export enum AutoModAction {
	WARN = 'WARN',
	MUTE = 'MUTE',
	KICK = 'KICK',
	BAN = 'BAN',
	DELETE = 'DELETE',
}

/**
 * Interface representing an auto-moderation rule document
 * @interface IAutoModRule
 * @extends {Document}
 */
export interface IAutoModRule extends Document {
	/** Name of the rule */
	name: string
	/** Whether the rule is enabled */
	enabled: boolean
	/** Description of what the rule does */
	description: string
	/** The type of content this rule checks (spam, toxicity, links, etc.) */
	type: string
	/** Regular expression pattern for text matching */
	pattern?: string
	/** Keywords to match (case insensitive) */
	keywords?: string[]
	/** Maximum message length (if applicable) */
	maxLength?: number
	/** Minimum account age in days */
	minAccountAge?: number
	/** Action to take when rule is violated */
	action: AutoModAction
	/** Duration of punishment in minutes (for mute/ban) */
	actionDuration?: number
	/** Number of violations before escalating punishment */
	strikeThreshold?: number
	/** Roles exempt from this rule */
	exemptRoles: string[]
	/** Channels where this rule applies */
	channels: string[]
	/** Discord guild ID */
	guildId: string
	/** Creation timestamp */
	createdAt: Date
	/** Last update timestamp */
	updatedAt: Date
}

const AutoModRuleSchema = new Schema<IAutoModRule>(
	{
		name: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		enabled: {
			type: Boolean,
			default: true,
		},
		description: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: ['SPAM', 'TOXICITY', 'LINKS', 'MENTIONS', 'ATTACHMENTS', 'CUSTOM'],
		},
		pattern: {
			type: String,
			validate: {
				validator: function (v: string) {
					try {
						new RegExp(v)
						return true
					} catch (e) {
						return false
					}
				},
				message: 'Invalid regular expression pattern',
			},
		},
		keywords: [
			{
				type: String,
				trim: true,
			},
		],
		maxLength: {
			type: Number,
			min: 1,
		},
		minAccountAge: {
			type: Number,
			min: 0,
		},
		action: {
			type: String,
			enum: Object.values(AutoModAction),
			required: true,
		},
		actionDuration: {
			type: Number,
			min: 0,
		},
		strikeThreshold: {
			type: Number,
			min: 1,
			default: 3,
		},
		exemptRoles: [
			{
				type: String,
				ref: 'Role',
			},
		],
		channels: [
			{
				type: String,
				ref: 'Channel',
			},
		],
		guildId: {
			type: String,
			required: true,
			index: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
)

// Create indexes for better query performance
AutoModRuleSchema.index({ type: 1, enabled: 1 })
AutoModRuleSchema.index({ name: 1, guildId: 1 }, { unique: true }) // Make name unique per guild

export const AutoModRule = model<IAutoModRule>('AutoModRule', AutoModRuleSchema)
