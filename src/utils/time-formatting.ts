/**
 * Format time in seconds to a human-readable string
 * @param seconds - Time in seconds to format
 * @returns Formatted time string (e.g., "5 seconds", "10 minutes", "2 hours", "3 days")
 */
export function formatTime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  seconds %= 86400

  const hours = Math.floor(seconds / 3600)
  seconds %= 3600

  const minutes = Math.floor(seconds / 60)
  seconds = Math.floor(seconds % 60)

  const parts = []

  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
  if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`)

  return parts.join(', ')
}

/**
 * Format time in milliseconds to a human-readable string
 * @param ms - Time in milliseconds to format
 * @returns Formatted time string
 */
export function formatTimeFromMs(ms: number): string {
  return formatTime(ms / 1000)
}

/**
 * Format time in seconds to a detailed string with multiple units
 * @param seconds - Time in seconds to format
 * @returns Detailed time string (e.g., "2 days, 5 hours, 30 minutes, 15 seconds")
 */
export function formatTimeDetailed(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  seconds %= 86400

  const hours = Math.floor(seconds / 3600)
  seconds %= 3600

  const minutes = Math.floor(seconds / 60)
  seconds = Math.floor(seconds % 60)

  const parts = []

  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
  if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`)

  return parts.join(', ')
}
