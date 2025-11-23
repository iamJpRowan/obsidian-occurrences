import { Component } from "obsidian"
import {
  timezoneOffsetToISOString,
  parseTimezoneOffset,
  getLocalTimezoneOffset,
} from "../utils/timezoneUtils"

export class DateTimeSelector extends Component {
  private container: HTMLElement
  private datetimeContainer: HTMLElement
  private datetimeInputWrapper: HTMLElement
  private datetimeInput: HTMLInputElement
  private timezoneSelect: HTMLSelectElement
  private onDateChange: (date: Date | null) => void
  private currentDate: Date | null = null
  private selectedTimezoneOffset: string | null = null

  constructor(
    container: HTMLElement,
    onDateChange: (date: Date | null) => void
  ) {
    super()
    this.container = container
    this.onDateChange = onDateChange
    this.render()
  }

  private render(): void {
    // Create datetime container with role="group" for accessibility
    this.datetimeContainer = this.container.createEl("div", {
      cls: "datetime-input-container",
      attr: {
        role: "group",
        "aria-label": "Date, time, and timezone",
      },
    })

    // Create input wrapper
    this.datetimeInputWrapper = this.datetimeContainer.createEl("div", {
      cls: "datetime-input-wrapper",
    })

    // Create datetime-local input (combines date and time)
    this.datetimeInput = this.datetimeInputWrapper.createEl("input", {
      type: "datetime-local",
      attr: {
        "aria-label": "Date and Time",
      },
    }) as HTMLInputElement
    this.datetimeInput.classList.add("datetime-input-native")

    // Create timezone select
    // Use tabindex="-1" to remove from tab order, but keep it keyboard accessible
    this.timezoneSelect = this.datetimeInputWrapper.createEl("select", {
      attr: {
        "aria-label": "Timezone",
        tabindex: "-1",
      },
    }) as HTMLSelectElement
    this.timezoneSelect.classList.add("datetime-input-native")

    // Populate timezone options
    this.populateTimezoneOptions()

    // Add event listeners
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Input change handlers
    this.registerDomEvent(this.datetimeInput, "change", () => {
      this.updateDate()
    })

    this.registerDomEvent(this.timezoneSelect, "change", () => {
      this.updateDate()
    })

    // Keyboard navigation: Arrow keys to move between datetime and timezone
    this.registerDomEvent(this.datetimeInput, "keydown", (e: KeyboardEvent) => {
      // Prevent Tab from navigating within the datetime-local input's internal fields
      // Instead, move to the next field in the form
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault()
        // Find the next focusable element after the datetime container
        this.focusNextField()
        return
      }
      
      // Shift+Tab should move to previous field
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault()
        this.focusPreviousField()
        return
      }
      
      // When focused on datetime input, Right arrow moves to timezone select
      if (e.key === "ArrowRight" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        this.timezoneSelect.focus()
      }
    })

    this.registerDomEvent(this.timezoneSelect, "keydown", (e: KeyboardEvent) => {
      // When focused on timezone select, Left arrow moves back to datetime input
      if (e.key === "ArrowLeft" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        this.datetimeInput.focus()
        return
      }
      
      // Tab should move to next field
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault()
        this.focusNextField()
        return
      }
      
      // Shift+Tab should move to previous field
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault()
        this.focusPreviousField()
        return
      }
      
      // Escape can also move focus back to datetime input
      if (e.key === "Escape") {
        e.preventDefault()
        this.datetimeInput.focus()
      }
    })
  }

  /**
   * Populate timezone select with UTC offset options
   */
  private populateTimezoneOptions(): void {
    // Get user's local timezone offset for default selection
    const localOffsetString = getLocalTimezoneOffset()

    // Generate timezone options from -12:00 to +14:00
    for (let hours = -12; hours <= 14; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 15) {
        if (hours === 14 && minutes > 0) break // UTC+14:00 is the maximum

        const offsetHours = Math.abs(hours).toString().padStart(2, "0")
        const offsetMinutes = minutes.toString().padStart(2, "0")
        const sign = hours >= 0 ? "+" : "-"
        const offsetString = `${sign}${offsetHours}:${offsetMinutes}`

        const option = this.timezoneSelect.createEl("option", {
          text: offsetString,
          attr: { value: offsetString },
        })

        // Set default to user's local timezone
        if (offsetString === localOffsetString) {
          option.selected = true
        }
      }
    }
  }

  /**
   * Parse a Date object into datetime-local format string and timezone
   */
  private parseDateToInputs(date: Date): { datetimeLocalStr: string; timezoneOffset: string } {
    // Get date and time in YYYY-MM-DDTHH:mm format (local date/time)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const datetimeLocalStr = `${year}-${month}-${day}T${hours}:${minutes}`

    // Get timezone offset in +/-HH:MM format
    const timezoneOffset = timezoneOffsetToISOString(date.getTimezoneOffset())

    return { datetimeLocalStr, timezoneOffset }
  }

  /**
   * Update the date from inputs and notify callback
   * datetime-local always works in the browser's local timezone, so we need to:
   * 1. Parse the datetime-local value (which is in browser's local timezone)
   * 2. Convert browser local time to UTC
   * 3. Adjust for the selected timezone to get the correct UTC representation
   * 
   * The Date object stores UTC internally. We want to represent the time
   * as if it were in the selected timezone, so we need to reverse the conversion.
   */
  private updateDate(): void {
    const datetimeLocalStr = this.datetimeInput.value
    const timezoneOffset = this.timezoneSelect.value

    if (!datetimeLocalStr || !timezoneOffset) {
      this.currentDate = null
      this.selectedTimezoneOffset = null
      this.onDateChange(null)
      return
    }

    // Validate timezone offset format
    const selectedOffsetMinutes = parseTimezoneOffset(timezoneOffset)
    if (selectedOffsetMinutes === null) {
      this.currentDate = null
      this.selectedTimezoneOffset = null
      this.onDateChange(null)
      return
    }

    // Store the selected timezone offset
    this.selectedTimezoneOffset = timezoneOffset

    // Get browser's local timezone offset
    const browserOffsetMinutes = new Date().getTimezoneOffset()
    const browserOffsetString = timezoneOffsetToISOString(browserOffsetMinutes)
    const browserOffsetParsed = parseTimezoneOffset(browserOffsetString)
    if (browserOffsetParsed === null) {
      this.currentDate = null
      this.selectedTimezoneOffset = null
      this.onDateChange(null)
      return
    }

    // Step 1: Parse datetime-local value (which is in browser's local timezone)
    // Create a date from the datetime-local string
    const browserLocalDate = new Date(datetimeLocalStr)
    if (isNaN(browserLocalDate.getTime())) {
      this.currentDate = null
      this.selectedTimezoneOffset = null
      this.onDateChange(null)
      return
    }

    // Step 2: Convert browser local time to UTC
    // browserLocalDate.getTime() gives us UTC milliseconds, but the Date constructor
    // interprets the string as local time. We need to adjust for browser timezone.
    const browserLocalMs = browserLocalDate.getTime()
    const utcMs = browserLocalMs + browserOffsetParsed * 60000

    // Step 3: Reverse the timezone conversion
    // We displayed the time as if it were in the selected timezone, but converted to browser timezone
    // Now we need to reverse that: browser local -> selected timezone local -> UTC
    // The difference: selectedOffset - browserOffset
    const timezoneDiff = selectedOffsetMinutes - browserOffsetParsed
    const finalUtcMs = utcMs - timezoneDiff * 60000
    const date = new Date(finalUtcMs)

    // Validate the date was parsed correctly
    if (isNaN(date.getTime())) {
      this.currentDate = null
      this.selectedTimezoneOffset = null
      this.onDateChange(null)
      return
    }

    this.currentDate = date
    this.onDateChange(date)
  }

  /**
   * Get the current date value
   */
  public getValue(): Date | null {
    return this.currentDate
  }

  /**
   * Convert a Date object to datetime-local format string for display
   * datetime-local always works in the browser's local timezone, so we need to:
   * 1. The Date object represents a moment in UTC
   * 2. We want to show what the local time would be in the selected timezone
   * 3. But datetime-local only works in browser's local timezone
   * 4. So we convert: UTC -> selected timezone local time -> browser local time
   * @param date The date to convert (UTC internally)
   * @param timezoneOffset Timezone offset string (e.g., "+05:00")
   * @returns Datetime-local format string in user's browser timezone, or null if timezone is invalid
   */
  private dateToLocalString(date: Date, timezoneOffset: string): string | null {
    const selectedOffsetMinutes = parseTimezoneOffset(timezoneOffset)
    if (selectedOffsetMinutes === null) return null

    // Get the user's browser local timezone offset
    const browserOffsetMinutes = new Date().getTimezoneOffset()
    const browserOffsetString = timezoneOffsetToISOString(browserOffsetMinutes)
    const browserOffsetParsed = parseTimezoneOffset(browserOffsetString)
    if (browserOffsetParsed === null) return null

    // Step 1: Convert UTC date to selected timezone's local time
    // date.getTime() is UTC milliseconds, selectedOffsetMinutes is offset from UTC
    // To get local time in selected timezone: UTC - offset (note: offset is reversed in JS)
    const selectedTimezoneLocalMs = date.getTime() - selectedOffsetMinutes * 60000
    const selectedTimezoneLocalDate = new Date(selectedTimezoneLocalMs)
    
    // Step 2: Convert selected timezone local time to browser's local timezone
    // The difference between timezones: selectedOffset - browserOffset
    const timezoneDiff = selectedOffsetMinutes - browserOffsetParsed
    const browserLocalMs = selectedTimezoneLocalMs - timezoneDiff * 60000
    const browserLocalDate = new Date(browserLocalMs)
    
    const year = browserLocalDate.getFullYear()
    const month = String(browserLocalDate.getMonth() + 1).padStart(2, "0")
    const day = String(browserLocalDate.getDate()).padStart(2, "0")
    const hours = String(browserLocalDate.getHours()).padStart(2, "0")
    const minutes = String(browserLocalDate.getMinutes()).padStart(2, "0")
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  /**
   * Set the date value programmatically
   * @param date The date to set
   * @param timezoneOffset Optional timezone offset (e.g., "+05:00" or "-08:00") to preserve from saved data
   */
  public setValue(date: Date | null, timezoneOffset?: string | null): void {
    this.currentDate = date

    if (!date) {
      this.datetimeInput.value = ""
      this.selectedTimezoneOffset = null
      this.updateDate()
      return
    }

    // Determine which timezone offset to use
    const offsetToUse = timezoneOffset || this.parseDateToInputs(date).timezoneOffset
    this.selectedTimezoneOffset = offsetToUse

    // Get datetime-local string
    let datetimeLocalStr: string
    
    if (timezoneOffset) {
      const localString = this.dateToLocalString(date, timezoneOffset)
      if (localString) {
        datetimeLocalStr = localString
      } else {
        // Fallback if timezone parsing fails
        const parsed = this.parseDateToInputs(date)
        datetimeLocalStr = parsed.datetimeLocalStr
      }
    } else {
      const parsed = this.parseDateToInputs(date)
      datetimeLocalStr = parsed.datetimeLocalStr
    }

    this.datetimeInput.value = datetimeLocalStr
    this.timezoneSelect.value = offsetToUse
    this.updateDate()
  }

  /**
   * Get the selected timezone offset (e.g., "+05:00" or "-08:00")
   */
  public getTimezoneOffset(): string | null {
    return this.selectedTimezoneOffset || this.timezoneSelect.value || null
  }

  /**
   * Find and focus the next focusable field in the form
   */
  private focusNextField(): void {
    const focusableSelectors = [
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')
    
    const allFocusable = Array.from(
      document.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]
    
    // Find the datetime input in the list
    const currentIndex = allFocusable.findIndex(el => el === this.datetimeInput)
    
    if (currentIndex >= 0) {
      // Find the next focusable element that's not in the datetime container
      for (let i = currentIndex + 1; i < allFocusable.length; i++) {
        const el = allFocusable[i]
        if (!this.datetimeContainer.contains(el)) {
          el.focus()
          return
        }
      }
    }
    
    // Fallback: try to find any focusable element after the container in DOM order
    const containerParent = this.datetimeContainer.parentElement
    if (containerParent) {
      let current: Element | null = this.datetimeContainer.nextElementSibling
      while (current) {
        const focusable = current.querySelector(focusableSelectors) as HTMLElement
        if (focusable && !this.datetimeContainer.contains(focusable)) {
          focusable.focus()
          return
        }
        current = current.nextElementSibling
      }
    }
  }

  /**
   * Find and focus the previous focusable field in the form
   */
  private focusPreviousField(): void {
    const focusableSelectors = [
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')
    
    const allFocusable = Array.from(
      document.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]
    
    // Find the datetime input in the list
    const currentIndex = allFocusable.findIndex(el => el === this.datetimeInput)
    
    if (currentIndex > 0) {
      // Find the previous focusable element that's not in the datetime container
      for (let i = currentIndex - 1; i >= 0; i--) {
        const el = allFocusable[i]
        if (!this.datetimeContainer.contains(el)) {
          el.focus()
          return
        }
      }
    }
    
    // Fallback: try to find any focusable element before the container in DOM order
    const containerParent = this.datetimeContainer.parentElement
    if (containerParent) {
      let current: Element | null = this.datetimeContainer.previousElementSibling
      while (current) {
        const focusable = Array.from(current.querySelectorAll(focusableSelectors))
          .reverse()
          .find(el => !this.datetimeContainer.contains(el)) as HTMLElement
        if (focusable) {
          focusable.focus()
          return
        }
        current = current.previousElementSibling
      }
    }
  }

  public getElement(): HTMLElement {
    return this.container
  }
}
