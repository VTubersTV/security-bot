import { Schema, model, Document } from 'mongoose'
import { AutoModAction } from './AutoModRule'

/**
 * Interface representing a user infraction document
 * @interface IUserInfraction
 * @extends {Document}
 */
export interface IUserInfraction extends Document {
	/** Discord user ID */
	userId: string
	/** Discord guild ID */
	guildId: string
	/** Type of infraction */
	type: AutoModAction
	/** Reason for the infraction */
	reason: string
	/** The rule that was violated (if automated) */
	ruleId?: string
	/** The moderator who issued the infraction (if manual) */
	moderatorId?: string
	/** Duration of the punishment in minutes */
	duration?: number
	/** Whether the infraction is active */
	active: boolean
	/** When the infraction expires */
	expiresAt?: Date
	/** The original message that triggered the infraction */
	messageContent?: string
	/** Message ID of the triggering message */
	messageId?: string
	/** Channel ID where the infraction occurred */
	channelId: string
	/** Creation timestamp */
	createdAt: Date
	/** Last update timestamp */
	updatedAt: Date
}

const UserInfractionSchema = new Schema<IUserInfraction>(
	{
		userId: {
			type: String,
			required: true,
			index: true,
		},
		guildId: {
			type: String,
			required: true,
			index: true,
		},
		type: {
			type: String,
			enum: Object.values(AutoModAction),
			required: true,
		},
		reason: {
			type: String,
			required: true,
		},
		ruleId: {
			type: Schema.Types.ObjectId,
			ref: 'AutoModRule',
		},
		moderatorId: {
			type: String,
		},
		duration: {
			type: Number,
			min: 0,
		},
		active: {
			type: Boolean,
			default: true,
		},
		expiresAt: {
			type: Date,
		},
		messageContent: {
			type: String,
		},
		messageId: {
			type: String,
		},
		channelId: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
)

// Create compound indexes for efficient querying
UserInfractionSchema.index({ userId: 1, guildId: 1, active: 1 })
UserInfractionSchema.index({ guildId: 1, createdAt: -1 })
UserInfractionSchema.index(
	{ expiresAt: 1 },
	{
		expireAfterSeconds: 0,
		partialFilterExpression: { expiresAt: { $exists: true } },
	},
)

/**
 * Get active infractions for a user in a guild
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<IUserInfraction[]>}
 */
UserInfractionSchema.statics.getActiveInfractions = function (
	userId: string,
	guildId: string,
): Promise<IUserInfraction[]> {
	return this.find({
		userId,
		guildId,
		active: true,
	}).sort({ createdAt: -1 })
}

/**
 * Get total infractions count for a user in a guild
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<number>}
 */
UserInfractionSchema.statics.getInfractionCount = function (
	userId: string,
	guildId: string,
): Promise<number> {
	return this.countDocuments({
		userId,
		guildId,
	})
}

export const UserInfraction = model<IUserInfraction>(
	'UserInfraction',
	UserInfractionSchema,
)
