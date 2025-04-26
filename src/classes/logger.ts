import chalk from 'chalk'

type LogLevel =
	| 'info'
	| 'warn'
	| 'error'
	| 'debug'
	| 'verbose'
	| 'warning'
	| 'success'

function isError(error: any): error is Error {
	return error instanceof Error
}

export default class Logger {
	private static readonly colors = {
		info: chalk.blue.bind(chalk),
		warn: chalk.yellow.bind(chalk),
		warning: chalk.yellow.bind(chalk),
		error: chalk.red.bind(chalk),
		debug: chalk.green.bind(chalk),
		verbose: chalk.gray.bind(chalk),
		success: chalk.green.bind(chalk),
	}

	private static readonly isDebugMode = process.argv.includes('/debug')

	private static getCallerInfo(): string {
		const error = new Error()
		const stack = error.stack?.split('\n')[3]
		if (!stack) return 'unknown'

		const match = stack.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))/)
		if (!match) return 'unknown'

		const [, fnName, filePath] = match
		const fileName = filePath?.split(/[/\\]/).pop() || 'unknown'
		return fnName ?
				`${fileName.replace('.ts', '').replace('.js', '')}::${fnName}`
			:	fileName.replace('.ts', '').replace('.js', '')
	}

	public static log(
		level: LogLevel | any,
		message: string,
		context?: string,
	): void {
		if (level === 'debug' && !this.isDebugMode) return
		if (level === 'error') level = 'ERR'

		const colorFn = this.colors[level as LogLevel] || chalk.white.bind(chalk)
		const caller = context || this.getCallerInfo()
		console.log(`${colorFn(level.toUpperCase())} [${caller}]: ${message}`)
	}

	public static error(
		message: string,
		error?: Error | string,
		context?: string,
	): void {
		const errorMessage =
			error ?
				isError(error) ? `ERR: ${error.message} :: ${error.stack}`
				:	error
			:	''

		this.log(
			'error',
			errorMessage ? `${message}: ${errorMessage}` : message,
			context,
		)
	}

	public static warn(message: string, context?: string): void {
		this.log('warn', message, context)
	}
}
