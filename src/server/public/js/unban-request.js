/**
 * @typedef {Object} UnbanRequestData
 * @property {string} userId - Discord user ID (17-19 digits)
 * @property {string} email - Contact email address
 * @property {string} banReason - Original reason for the ban
 * @property {string} appealMessage - User's appeal message
 * @property {string} [evidence] - Optional additional evidence
 * @property {boolean} truthful - Confirmation of truthful information
 * @property {boolean} rules - Agreement to follow rules
 */

/**
 * Handles the unban request form submission
 * @class UnbanRequestHandler
 */
class UnbanRequestHandler {
	/**
	 * Initialize the unban request handler
	 * @constructor
	 */
	constructor() {
		/** @type {HTMLFormElement} */
		this.form = document.querySelector('form')
		/** @type {HTMLButtonElement} */
		this.submitBtn = document.getElementById('submitBtn')
		/** @type {HTMLTextAreaElement} */
		this.appealMessage = document.getElementById('appealMessage')
		/** @type {HTMLElement} */
		this.charCount = document.getElementById('charCount')
		/** @type {NodeListOf<HTMLInputElement>} */
		this.checkboxes = document.querySelectorAll('input[type="checkbox"]')

		this.setupEventListeners()
	}

	/**
	 * Set up event listeners for form elements
	 * @private
	 */
	setupEventListeners() {
		this.form.addEventListener('submit', (e) => this.handleSubmit(e))
		this.appealMessage.addEventListener('input', () => this.updateCharCount())
		this.form.addEventListener('input', () => this.validateForm())
		this.checkboxes.forEach((cb) =>
			cb.addEventListener('change', () => this.validateForm()),
		)
	}

	/**
	 * Update character count for appeal message
	 * @private
	 */
	updateCharCount() {
		const count = this.appealMessage.value.length
		this.charCount.textContent = count
		this.charCount.classList.toggle('text-discord-danger', count >= 1900)
	}

	/**
	 * Validate form inputs
	 * @private
	 * @returns {boolean} Whether the form is valid
	 */
	validateForm() {
		const allChecked = Array.from(this.checkboxes).every((cb) => cb.checked)
		const hasAppealMessage = this.appealMessage.value.trim().length > 0
		const isValid = allChecked && hasAppealMessage
		this.submitBtn.disabled = !isValid
		return isValid
	}

	/**
	 * Handle form submission
	 * @private
	 * @param {Event} e - Form submission event
	 */
	async handleSubmit(e) {
		e.preventDefault()

		if (!this.validateForm()) {
			this.showError('Please fill in all required fields.')
			return
		}

		try {
			this.setSubmitting(true)

			const formData = new FormData(this.form)
			/** @type {UnbanRequestData} */
			const requestData = {
				userId: formData.get('userId'),
				email: 'example@example.com', // Not used for anything, removed from code
				banReason: formData.get('banReason'),
				appealMessage: formData.get('appealMessage'),
				evidence: formData.get('evidence'),
				truthful: formData.get('truthful') === 'on',
				rules: formData.get('rules') === 'on',
			}

			const response = await fetch('/unban/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-Requested-With': 'XMLHttpRequest',
				},
				body: JSON.stringify(requestData),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Failed to submit unban request')
			}

			// Redirect to success page using the URL from the response
			window.location.href = data.redirectUrl
		} catch (error) {
			this.showError(error.message)
		} finally {
			this.setSubmitting(false)
		}
	}

	/**
	 * Show error message to user
	 * @private
	 * @param {string} message - Error message to display
	 */
	showError(message) {
		const errorDiv = document.createElement('div')
		errorDiv.className =
			'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg p-4 mb-6 animate-fade-in'
		errorDiv.innerHTML = `
            <div class="flex items-center">
                <i class="bi bi-exclamation-circle text-red-500 text-xl mr-2"></i>
                <p class="text-red-700 dark:text-red-300">${message}</p>
            </div>
        `

		const existingError = this.form.querySelector('.bg-red-50')
		if (existingError) {
			existingError.remove()
		}

		this.form.insertBefore(errorDiv, this.form.firstChild)

		// Auto-remove after 5 seconds
		setTimeout(() => {
			errorDiv.classList.add('animate-fade-out')
			setTimeout(() => errorDiv.remove(), 300)
		}, 5000)
	}

	/**
	 * Set form submission state
	 * @private
	 * @param {boolean} submitting - Whether form is being submitted
	 */
	setSubmitting(submitting) {
		this.submitBtn.disabled = submitting
		this.submitBtn.innerHTML =
			submitting ?
				'<i class="bi bi-hourglass-split animate-spin mr-2"></i>Submitting...'
			:	'<i class="bi bi-send mr-2"></i>Submit Unban Request'
	}
}

// Initialize handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new UnbanRequestHandler()
})
