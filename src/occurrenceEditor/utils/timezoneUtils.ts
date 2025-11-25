/**
 * Utility functions for timezone offset handling
 */

/**
 * Convert JavaScript timezone offset (in minutes) to +/-HH:MM format
 * @param offsetMinutes Timezone offset in minutes (from Date.getTimezoneOffset())
 * @returns Timezone offset string in +/-HH:MM format (e.g., "+05:00", "-08:00")
 */
export function timezoneOffsetToISOString(offsetMinutes: number): string {
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
  const offsetMinutesRemainder = Math.abs(offsetMinutes) % 60
  const offsetSign = offsetMinutes <= 0 ? "+" : "-"
  return `${offsetSign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutesRemainder.toString().padStart(2, "0")}`
}

/**
 * Parse timezone offset from +/-HH:MM format to minutes
 * @param offsetString Timezone offset string (e.g., "+05:00", "-08:00")
 * @returns Timezone offset in minutes, or null if invalid format
 */
export function parseTimezoneOffset(offsetString: string): number | null {
  const match = offsetString.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) return null
  
  const sign = match[1] === "+" ? 1 : -1
  const hours = parseInt(match[2], 10)
  const minutes = parseInt(match[3], 10)
  return sign * (hours * 60 + minutes)
}

/**
 * Extract timezone offset from ISO date string (e.g., "2025-01-15T14:00:00+05:00")
 * @param isoString ISO date string with timezone
 * @returns Timezone offset string (e.g., "+05:00") or null if not found
 */
export function extractTimezoneFromISOString(isoString: string): string | null {
  const match = isoString.match(/([+-]\d{2}:\d{2})$/)
  return match ? match[1] : null
}

/**
 * Get local timezone offset in +/-HH:MM format
 * @returns Timezone offset string for the user's local timezone
 */
export function getLocalTimezoneOffset(): string {
  return timezoneOffsetToISOString(new Date().getTimezoneOffset())
}

