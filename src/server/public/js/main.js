/**
 * Main JavaScript for VTubers.TV Verification System
 */

document.addEventListener('DOMContentLoaded', () => {
	// Initialize tooltips
	const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]')
	tooltips.forEach((tooltip) => {
		new bootstrap.Tooltip(tooltip)
	})

	// Form handling
	const forms = document.querySelectorAll('form')
	forms.forEach((form) => {
		form.addEventListener('submit', handleFormSubmit)
	})

	// Dark mode toggle
	setupDarkMode()

	// Initialize animations
	initializeAnimations()
})

/**
 * Handle form submissions
 * @param {Event} event - The form submission event
 */
async function handleFormSubmit(event) {
	const form = event.target
	const submitButton = form.querySelector('button[type="submit"]')

	if (submitButton) {
		const originalText = submitButton.innerHTML

		// Show loading state
		submitButton.disabled = true
		submitButton.innerHTML = `
            <span class="loading me-2"></span>
            Processing...
        `

		try {
			// If the form has a custom handler, let it process
			if (form.hasAttribute('data-custom-handler')) {
				return
			}

			// Otherwise, prevent default and handle via AJAX
			event.preventDefault()

			const formData = new FormData(form)
			const response = await fetch(form.action, {
				method: form.method,
				body: formData,
				headers: {
					Accept: 'text/html',
				},
			})

			if (!response.ok) {
				throw new Error('Verification failed')
			}

			// Get the response HTML and replace the current page content
			const html = await response.text()
			document.documentElement.innerHTML = html

			// Reinitialize scripts since we replaced the entire page content
			const scripts = document.getElementsByTagName('script')
			for (let script of scripts) {
				eval(script.innerHTML)
			}
		} catch (error) {
			// Show error message
			showAlert('error', 'An error occurred. Please try again.')

			// Reset button
			submitButton.disabled = false
			submitButton.innerHTML = originalText
		}
	}
}

/**
 * Setup dark mode functionality
 */
function setupDarkMode() {
	const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
	const root = document.documentElement

	// Update color scheme
	function updateColorScheme(e) {
		if (e.matches) {
			root.classList.add('dark-mode')
		} else {
			root.classList.remove('dark-mode')
		}
	}

	// Listen for system color scheme changes
	darkModeMediaQuery.addListener(updateColorScheme)
	updateColorScheme(darkModeMediaQuery)
}

/**
 * Initialize page animations
 */
function initializeAnimations() {
	// Animate elements when they become visible
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('animate__animated', 'animate__fadeIn')
					observer.unobserve(entry.target)
				}
			})
		},
		{
			threshold: 0.1,
		},
	)

	// Observe elements with animation class
	document.querySelectorAll('.animate-on-scroll').forEach((el) => {
		observer.observe(el)
	})
}

/**
 * Show an alert message
 * @param {string} type - The type of alert ('success', 'error', 'info', 'warning')
 * @param {string} message - The message to display
 */
function showAlert(type, message) {
	const alertContainer = document.createElement('div')
	alertContainer.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show fixed-top m-3`
	alertContainer.setAttribute('role', 'alert')

	alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `

	document.body.appendChild(alertContainer)

	// Auto dismiss after 5 seconds
	setTimeout(() => {
		const alert = bootstrap.Alert.getOrCreateInstance(alertContainer)
		alert.close()
	}, 5000)
}

/**
 * Debounce function for rate limiting
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to wait
 * @returns {Function} The debounced function
 */
function debounce(func, wait) {
	let timeout
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout)
			func(...args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}

// Export functions for use in other scripts
window.VTubers = {
	showAlert,
	debounce,
}
