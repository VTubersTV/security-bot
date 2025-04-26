/**
 * Global utility types for the application
 */

declare global {
	// Primitive type aliases for better semantics
	type UUID = string
	type ISO8601DateTime = string
	type UnixTimestamp = number

	// Utility types for common patterns
	type Nullable<T> = T | null
	type Optional<T> = T | undefined
	type AsyncResult<T> = Promise<Result<T>>

	// Result type for error handling
	interface Result<T> {
		success: boolean
		data?: T
		error?: string
	}

	// Dictionary types
	type StringMap<T> = { [key: string]: T }
	type NumberMap<T> = { [key: number]: T }

	// Function types
	type AsyncFunction<T = void> = () => Promise<T>
	type ErrorCallback = (error: Error) => void
	type VoidFunction = () => void

	// Utility types for API responses
	type APIResponse<T> = {
		status: number
		data: T
		timestamp: ISO8601DateTime
	}

	// Pagination types
	interface PaginationParams {
		page: number
		limit: number
		sortBy?: string
		sortOrder?: 'asc' | 'desc'
	}

	interface PaginatedResponse<T> {
		items: T[]
		total: number
		page: number
		totalPages: number
		hasMore: boolean
	}

	// Deep partial utility type for partial updates
	type DeepPartial<T> = {
		[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
	}

	// Readonly deep utility type
	type DeepReadonly<T> = {
		readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
	}
}

// This export is needed to make the file a module
export {}
