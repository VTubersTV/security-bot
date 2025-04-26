import { Application, Request, Response, NextFunction } from 'express'
import { env } from '../../utils/env_parser'
import Logger from '../../classes/logger'
import axios from 'axios'
import rateLimit from 'express-rate-limit'
import express from 'express'

/**
 * Interface for Cloudflare IP data
 */
interface CloudflareIPData {
	ip: string
	isVPN: boolean
	isTor: boolean
	isProxy: boolean
	isHosting: boolean
	city?: string
	country?: string
	threat?: {
		isBotTraffic: boolean
		isAttacker: boolean
		isMalware: boolean
	}
}

/**
 * Interface for IPQS cache entry
 */
interface IPQSCacheEntry {
	data: CloudflareIPData
	timestamp: number
}

/**
 * Cache configuration
 */
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 hours in milliseconds
const MAX_CACHE_SIZE = 10000 // Maximum number of IPs to cache

/**
 * Cache for IPQS results
 * Key: IP address
 * Value: Cache entry containing IP data and timestamp
 */
const ipqsCache = new Map<string, IPQSCacheEntry>()

/**
 * Cache for banned IPs
 * Key: IP address
 * Value: { timestamp: ban timestamp, attempts: number of failed attempts }
 */
const bannedIPs = new Map<string, { timestamp: number; attempts: number }>()

/**
 * Middleware to check if an IP is banned
 */
const checkBannedIP = (req: Request, res: Response, next: NextFunction) => {
	const ip =
		req.ip ||
		req.headers['x-forwarded-for']?.toString() ||
		req.headers['x-real-ip']?.toString() ||
		req.headers['cf-connecting-ip']?.toString()

	if (!ip) {
		return next()
	}

	const banned = bannedIPs.get(ip)

	if (banned) {
		const timeSinceBan = Date.now() - banned.timestamp
		if (timeSinceBan < env.IP_BAN_DURATION) {
			Logger.log('warn', `Blocked request from banned IP: ${ip}`, 'Security')
			return res.status(403).render('error', {
				error: 'Access denied. Please try again later.',
			})
		} else {
			bannedIPs.delete(ip)
		}
	}
	next()
}

/**
 * Rate limiter configuration - excluding IPQS endpoints
 */
const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: (req: Request) => {
		// Don't rate limit IPQS API calls
		if (req.path.includes('/api/ipqs/')) {
			return 0 // Skip rate limiting
		}
		return 100 // Normal rate limit
	},
	message: 'Too many requests from this IP, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
})

/**
 * Clean expired entries from IPQS cache
 */
const cleanIPQSCache = () => {
	const now = Date.now()
	for (const [ip, entry] of ipqsCache.entries()) {
		if (now - entry.timestamp > CACHE_DURATION) {
			ipqsCache.delete(ip)
		}
	}
}

/**
 * Check IP security using IPQualityScore API with caching
 */
const checkIPSecurity = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!env.IPQS_API_KEY || !req.ip) {
			return next()
		}

		const ip = req.ip

		// Check cache first
		const cachedData = ipqsCache.get(ip)
		if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
			req.ipData = cachedData.data
			return next()
		}

		// Clean cache periodically
		if (ipqsCache.size > MAX_CACHE_SIZE) {
			cleanIPQSCache()
		}

		const response = await axios.get<any>(
			`https://ipqualityscore.com/api/json/ip/${env.IPQS_API_KEY}/${ip}`,
			{
				params: {
					strictness: 1,
					allow_public_access_points: false,
				},
			},
		)

		const ipData = response.data

		const CFHEADERS = {
			country: req.headers['cf-ipcountry']?.toString(),
			city: req.headers['cf-ipcity']?.toString(),
			region: req.headers['cf-ipregion']?.toString(),
			region_code: req.headers['cf-ipregion-code']?.toString(),
			timezone: req.headers['cf-iptimezone']?.toString(),
			currency: req.headers['cf-ipcurrency']?.toString(),
			organization: req.headers['cf-iporganization']?.toString(),
		}

		// Prepare IP data
		const cloudflareData: CloudflareIPData = {
			ip,
			isVPN: ipData.vpn,
			isProxy: ipData.proxy,
			isTor: ipData.tor,
			isHosting: ipData.hosting,
			city: CFHEADERS.city,
			country: CFHEADERS.country,
			threat: {
				isAttacker: ipData.fraud_score > 85,
				isMalware: ipData.fraud_score > 90,
				isBotTraffic: ipData.bot_status,
			},
		}

		// Cache the result
		ipqsCache.set(ip, {
			data: cloudflareData,
			timestamp: Date.now(),
		})

		// Check for VPN/Proxy/Tor usage
		if (ipData.proxy || ipData.vpn || ipData.tor) {
			Logger.log(
				'warn',
				`Blocked request from VPN/Proxy/Tor IP: ${ip}`,
				'Security',
			)
			return res.status(403).render('error', {
				error: 'VPN, Proxy, and Tor networks are not allowed for verification.',
			})
		}

		// Check for malicious activity
		if (ipData.fraud_score > 85 || ipData.bot_status) {
			Logger.log('warn', `Blocked request from malicious IP: ${ip}`, 'Security')
			bannedIPs.set(ip, {
				timestamp: Date.now(),
				attempts: env.MAX_VERIFICATION_ATTEMPTS,
			})
			return res.status(403).render('error', {
				error: 'Access denied due to suspicious activity.',
			})
		}

		req.ipData = cloudflareData
		next()
	} catch (error) {
		Logger.error(
			'Failed to check IP security',
			error instanceof Error ? error : new Error(String(error)),
		)
		next()
	}
}

/**
 * Setup all middleware for the application
 */
export function setupMiddleware(app: Application): void {
	// Security headers
	app.use((req, res, next) => {
		res.setHeader('X-Content-Type-Options', 'nosniff')
		res.setHeader('X-Frame-Options', 'DENY')
		res.setHeader('X-XSS-Protection', '1; mode=block')
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
		if (env.NODE_ENV === 'production') {
			res.setHeader(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains',
			)
		}
		next()
	})

	// Apply rate limiting
	app.use(rateLimiter)

	// Check banned IPs
	app.use(checkBannedIP)

	// Check IP security with Cloudflare
	app.use(checkIPSecurity)
}

// Extend Express Request type to include IP data
declare global {
	namespace Express {
		interface Request {
			ipData?: CloudflareIPData
		}
	}
}
