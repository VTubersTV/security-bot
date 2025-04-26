import {
	PermissionsBitField,
	User,
	Guild,
	GuildMember,
	PermissionsString,
} from 'discord.js'

/**
 * Permission level definitions for different roles
 */
export const PermissionLevels = {
	ADMIN: 'ADMIN',
	MODERATOR: 'MODERATOR',
	MEMBER: 'MEMBER',
} as const

/**
 * Permission flags required for each permission level
 */
export const permissions = {
	[PermissionLevels.ADMIN]: [PermissionsBitField.Flags.Administrator],
	[PermissionLevels.MODERATOR]: [
		PermissionsBitField.Flags.ManageMessages,
		PermissionsBitField.Flags.KickMembers,
		PermissionsBitField.Flags.BanMembers,
		PermissionsBitField.Flags.ManageRoles,
		PermissionsBitField.Flags.ViewAuditLog,
	],
	[PermissionLevels.MEMBER]: [],
} as const

/**
 * Cache to store recently fetched guild members
 */
const memberCache = new Map<
	string,
	{ member: GuildMember; timestamp: number }
>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Gets a guild member, using cache if available
 * @param userId - Discord user ID
 * @param guild - Guild to fetch member from
 * @returns Promise resolving to GuildMember
 */
async function getCachedMember(
	userId: string,
	guild: Guild,
): Promise<GuildMember> {
	const cacheKey = `${guild.id}-${userId}`
	const cached = memberCache.get(cacheKey)

	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.member
	}

	const member = await guild.members.fetch(userId)
	memberCache.set(cacheKey, {
		member,
		timestamp: Date.now(),
	})
	return member
}

/**
 * Gets all permissions a user has in a guild
 * @param user - Discord user
 * @param guild - Guild to check permissions in
 * @returns Promise resolving to PermissionsBitField
 * @throws Error if user is not in guild
 */
export async function getUserPermissions(user: User, guild: Guild) {
	const member = await getCachedMember(user.id, guild)
	return member.permissions
}

/**
 * Checks if a user has a specific permission in a guild
 * @param user - Discord user to check
 * @param guild - Guild to check permissions in
 * @param permission - Permission flag to check for
 * @returns Promise resolving to boolean
 * @throws Error if user is not in guild
 */
export async function hasPermission(
	user: User,
	guild: Guild,
	permission: PermissionsBitField | PermissionsString,
): Promise<boolean> {
	const member = await getCachedMember(user.id, guild)
	return member.permissions.has(permission)
}

/**
 * Gets the highest permission level of a user
 * @param user - Discord user to check
 * @param guild - Guild to check permissions in
 * @returns Promise resolving to permission level string
 */
export async function getPermissionLevel(
	user: User,
	guild: Guild,
): Promise<keyof typeof PermissionLevels> {
	const member = await getCachedMember(user.id, guild)

	if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
		return PermissionLevels.ADMIN
	}

	const modPerms = permissions[PermissionLevels.MODERATOR]
	if (modPerms.every((perm) => member.permissions.has(perm))) {
		return PermissionLevels.MODERATOR
	}

	return PermissionLevels.MEMBER
}
