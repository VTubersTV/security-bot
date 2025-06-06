import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Client, Collection } from 'discord.js'
import { Bot, Command, Event } from '../types/bot'
import Logger from '../classes/logger'

const isProd = process.env.NODE_ENV === 'production'

export const commands = new Collection<string, Command>()
export const events = new Collection<string, Event>()

export function loadCommands(path: string) {
	try {
		const files = readdirSync(path)

		for (const file of files) {
			const filePath = join(path, file)
			const stat = statSync(filePath)

			if (stat.isDirectory()) {
				loadCommands(filePath)
				continue
			}

			const fileExtension = isProd ? '.js' : '.ts'
			if (!file.endsWith(fileExtension)) {
				continue
			}

			try {
				const command = require(filePath)

				if (!command.default?.data?.name) {
					Logger.log(
						'warn',
						`Command ${file} is missing required properties`,
						'Commands',
					)
					continue
				}

				commands.set(command.default.data.name, command.default)
			} catch (error: any) {
				Logger.log(
					'error',
					`Failed to load command: ${file}: ${error.message}`,
					'Commands',
				)
			}
		}
	} catch (error: any) {
		Logger.log(
			'error',
			`Failed to read directory ${path}: ${error.message}`,
			'Commands',
		)
	}
}

export function loadEvents(path: string, client: Bot<Client>) {
	try {
		const files = readdirSync(path)
		Logger.log('debug', `Loading events from ${path}`, 'Events')
		Logger.log('debug', `Found files: ${files.join(', ')}`, 'Events')

		for (const file of files) {
			const filePath = join(path, file)
			const fileExtension = isProd ? '.js' : '.ts'

			if (!file.endsWith(fileExtension)) {
				continue
			}

			try {
				const event = require(filePath)
				Logger.log('debug', `Loading event from ${file}`, 'Events')

				if (!event.default?.name || !event.default?.execute) {
					Logger.log(
						'warn',
						`Event ${file} is missing required properties`,
						'Events',
					)
					continue
				}

				const execute = (...args: any[]) =>
					event.default.execute(client, ...args)

				if (event.default.once) {
					client.once(event.default.name, execute)
				} else {
					client.on(event.default.name, execute)
				}

				events.set(event.default.name, event.default)
				Logger.log(
					'debug',
					`Successfully registered event: ${event.default.name}`,
					'Events',
				)
			} catch (error: any) {
				Logger.log(
					'error',
					`Failed to load event: ${file}: ${error.message}`,
					'Events',
				)
			}
		}
	} catch (error: any) {
		Logger.log(
			'error',
			`Failed to read directory ${path}: ${error.message}`,
			'Events',
		)
	}
}

export function getCommands() {
	return commands
}

export function getEvents() {
	return events
}
