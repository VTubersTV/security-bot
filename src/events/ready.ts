import Logger from '../classes/logger'
import { Bot, Event } from '../types/bot'
import { ActivityType, Client, Events } from 'discord.js'
import { connect } from 'mongoose'
import { env } from '../utils/env_parser'
import { BanManager } from '../classes/BanManager'

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client: Bot<Client>) {
		Logger.log('info', `Logged in as ${client.user?.tag}`, 'Client')

		client.user?.setActivity('Protecting the VTubers.TV community', {
			type: ActivityType.Custom,
		})

		connect(env.MONGODB_URI)
			.then(() => {
				Logger.log('info', 'Connected to MongoDB', 'MongoDB')
			})
			.catch((err) => {
				Logger.log('error', `Failed to connect to MongoDB: ${err}`, 'MongoDB')
			})

		const banManager = BanManager.getInstance(client)
		await banManager.initialize(client)
	},
} as Event
