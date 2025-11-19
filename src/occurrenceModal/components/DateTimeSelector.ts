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
  private dateInput: HTMLInputElement
  private timeInput: HTMLInputElement
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
    // Create datetime container directly (no field wrapper or label)
    this.datetimeContainer = this.container.createEl("div", {
      cls: "datetime-input-container",
    })

    // Create input wrapper (similar to tag-input-wrapper)
    this.datetimeInputWrapper = this.datetimeContainer.createEl("div", {
      cls: "datetime-input-wrapper",
    })

    // Create date input
    this.dateInput = this.datetimeInputWrapper.createEl("input", {
      type: "date",
      attr: {
        "aria-label": "Date",
      },
    }) as HTMLInputElement
    this.dateInput.classList.add("datetime-input-native")

    // Create time input (no separator)
    this.timeInput = this.datetimeInputWrapper.createEl("input", {
      type: "time",
      attr: {
        "aria-label": "Time",
      },
    }) as HTMLInputElement
    this.timeInput.classList.add("datetime-input-native")

    // Create timezone select (no separator)
    this.timezoneSelect = this.datetimeInputWrapper.createEl("select", {
      attr: {
        "aria-label": "Timezone",
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
    this.registerDomEvent(this.dateInput, "change", () => {
      this.updateDate()
    })

    this.registerDomEvent(this.timeInput, "change", () => {
      this.updateDate()
    })

    this.registerDomEvent(this.timezoneSelect, "change", () => {
      this.updateDate()
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
          text: `UTC${offsetString}`,
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
   * Parse a Date object into date, time, and timezone strings for inputs
   */
  private parseDateToInputs(date: Date): { dateStr: string; timeStr: string; timezoneOffset: string } {
    // Get date in YYYY-MM-DD format (local date)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`

    // Get time in HH:mm format (local time)
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const timeStr = `${hours}:${minutes}`

    // Get timezone offset in +/-HH:MM format
    const timezoneOffset = timezoneOffsetToISOString(date.getTimezoneOffset())

    return { dateStr, timeStr, timezoneOffset }
  }

  /**
   * Update the date from inputs and notify callback
   */
  private updateDate(): void {
    const dateStr = this.dateInput.value
    const timeStr = this.timeInput.value
    const timezoneOffset = this.timezoneSelect.value

    if (!dateStr || !timeStr || !timezoneOffset) {
      this.currentDate = null
      this.selectedTimezoneOffset = null
      this.onDateChange(null)
      return
    }

    // Validate timezone offset format
    if (parseTimezoneOffset(timezoneOffset) === null) {
      this.currentDate = null
      this.selectedTimezoneOffset = null
      this.onDateChange(null)
      return
    }

    // Store the selected timezone offset
    this.selectedTimezoneOffset = timezoneOffset

    // Create ISO string with timezone
    const isoString = `${dateStr}T${timeStr}:00${timezoneOffset}`
    const date = new Date(isoString)

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
   * Convert a Date object to local date/time strings in a specific timezone
   * @param date The date to convert
   * @param timezoneOffset Timezone offset string (e.g., "+05:00")
   * @returns Date and time strings, or null if timezone is invalid
   */
  private dateToLocalStrings(date: Date, timezoneOffset: string): { dateStr: string; timeStr: string } | null {
    const offsetMinutes = parseTimezoneOffset(timezoneOffset)
    if (offsetMinutes === null) return null

    // Get UTC time and add offset to get local time in that timezone
    const localTime = new Date(date.getTime() + offsetMinutes * 60000)
    
    const year = localTime.getUTCFullYear()
    const month = String(localTime.getUTCMonth() + 1).padStart(2, "0")
    const day = String(localTime.getUTCDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`

    const hours = String(localTime.getUTCHours()).padStart(2, "0")
    const minutes = String(localTime.getUTCMinutes()).padStart(2, "0")
    const timeStr = `${hours}:${minutes}`

    return { dateStr, timeStr }
  }

  /**
   * Set the date value programmatically
   * @param date The date to set
   * @param timezoneOffset Optional timezone offset (e.g., "+05:00" or "-08:00") to preserve from saved data
   */
  public setValue(date: Date | null, timezoneOffset?: string | null): void {
    this.currentDate = date

    if (!date) {
      this.dateInput.value = ""
      this.timeInput.value = ""
      this.selectedTimezoneOffset = null
      this.updateDate()
      return
    }

    // Determine which timezone offset to use
    const offsetToUse = timezoneOffset || this.parseDateToInputs(date).timezoneOffset
    this.selectedTimezoneOffset = offsetToUse

    // Get date/time strings
    let dateStr: string
    let timeStr: string
    
    if (timezoneOffset) {
      const localStrings = this.dateToLocalStrings(date, timezoneOffset)
      if (localStrings) {
        dateStr = localStrings.dateStr
        timeStr = localStrings.timeStr
      } else {
        // Fallback if timezone parsing fails
        const parsed = this.parseDateToInputs(date)
        dateStr = parsed.dateStr
        timeStr = parsed.timeStr
      }
    } else {
      const parsed = this.parseDateToInputs(date)
      dateStr = parsed.dateStr
      timeStr = parsed.timeStr
    }

    this.dateInput.value = dateStr
    this.timeInput.value = timeStr
    this.timezoneSelect.value = offsetToUse
    this.updateDate()
  }

  /**
   * Get the selected timezone offset (e.g., "+05:00" or "-08:00")
   */
  public getTimezoneOffset(): string | null {
    return this.selectedTimezoneOffset || this.timezoneSelect.value || null
  }

  public getElement(): HTMLElement {
    return this.container
  }
}
