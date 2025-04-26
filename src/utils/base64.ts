/**
 * @module Base64Utils
 * @description Simple base64 encoding and decoding utilities for user IDs
 */

/**
 * Encodes a string to base64 with minimal transformations
 * @param str - String to encode
 * @returns Base64 encoded string
 */
export const toBase64 = (str: string): string => {
	// Simple base64 encoding with URL-safe characters
	return Buffer.from(str)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '') // Remove padding
}

/**
 * Decodes a base64 string back to original
 * @param str - Base64 encoded string to decode
 * @returns Original decoded string
 */
export const fromBase64 = (str: string): string => {
	try {
		// Add back padding if needed
		const padded =
			str.length % 4 === 0 ? str : str + '='.repeat(4 - (str.length % 4))

		// Reverse URL-safe characters and decode
		const decoded = Buffer.from(
			padded.replace(/-/g, '+').replace(/_/g, '/'),
			'base64',
		).toString()

		return decoded
	} catch (error) {
		throw new Error('Failed to decode string: Invalid format')
	}
}

// Export utilities
export default {
	toBase64,
	fromBase64,
}
