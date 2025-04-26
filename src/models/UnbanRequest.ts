import { Schema, model, Document } from 'mongoose'
import crypto from 'crypto'

/**
 * Status of the unban request
 */
export enum UnbanRequestStatus {
	PENDING = 'PENDING',
	APPROVED = 'APPROVED',
	DENIED = 'DENIED',
	EXPIRED = 'EXPIRED',
}

/**
 * Interface representing an unban request document
 * @interface IUnbanRequest
 * @extends {Document}
 */
export interface IUnbanRequest extends Document {
	/** Unique request code (0x format) */
	requestCode: string
	/** Discord user ID of the banned user */
	userId: string
	/** Discord guild ID */
	guildId: string
	/** Original ban reason */
	banReason: string
	/** User's appeal message */
	appealMessage: string
	/** Additional context or evidence */
	evidence?: string
	/** Status of the request */
	status: UnbanRequestStatus
	/** Moderator response to the appeal */
	moderatorResponse?: string
	/** Discord ID of the moderator who handled the request */
	handledBy?: string
	/** When the request was handled */
	handledAt?: Date
	/** IP address of the requester (for abuse prevention) */
	requestIp: string
	/** Email for contact */
	contactEmail: string
	/** Whether the user has been contacted about the decision */
	notified: boolean
	/** Creation timestamp */
	createdAt: Date
	/** Last update timestamp */
	updatedAt: Date
}

const UnbanRequestSchema = new Schema<IUnbanRequest>(
	{
		requestCode: {
			type: String,
			required: true,
			unique: true,
			default: () => '0x' + crypto.randomBytes(4).toString('hex').toUpperCase(),
		},
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
		banReason: {
			type: String,
			required: true,
		},
		appealMessage: {
			type: String,
			required: true,
			maxlength: 2000,
		},
		evidence: {
			type: String,
			maxlength: 1000,
		},
		status: {
			type: String,
			enum: Object.values(UnbanRequestStatus),
			default: UnbanRequestStatus.PENDING,
		},
		moderatorResponse: {
			type: String,
			maxlength: 1000,
		},
		handledBy: {
			type: String,
		},
		handledAt: {
			type: Date,
		},
		requestIp: {
			type: String,
			required: true,
		},
		contactEmail: {
			type: String,
			required: true,
			match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
		},
		notified: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
)

// Create compound indexes for efficient querying
UnbanRequestSchema.index({ userId: 1, guildId: 1, status: 1 })
UnbanRequestSchema.index({ requestCode: 1 }, { unique: true })
UnbanRequestSchema.index({ createdAt: 1 })
UnbanRequestSchema.index({ status: 1, createdAt: -1 })

/**
 * Get pending requests for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<IUnbanRequest[]>}
 */
UnbanRequestSchema.statics.getPendingRequests = function (
	guildId: string,
): Promise<IUnbanRequest[]> {
	return this.find({
		guildId,
		status: UnbanRequestStatus.PENDING,
	}).sort({ createdAt: 1 })
}

/**
 * Check if user has a pending request
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<boolean>}
 */
UnbanRequestSchema.statics.hasPendingRequest = function (
	userId: string,
	guildId: string,
): Promise<boolean> {
	return this.exists({
		userId,
		guildId,
		status: UnbanRequestStatus.PENDING,
	})
}

/**
 * Get request by code
 * @param {string} requestCode - Unique request code
 * @returns {Promise<IUnbanRequest>}
 */
UnbanRequestSchema.statics.getByCode = function (
	requestCode: string,
): Promise<IUnbanRequest> {
	return this.findOne({ requestCode })
}

export const UnbanRequest = model<IUnbanRequest>(
	'UnbanRequest',
	UnbanRequestSchema,
)
