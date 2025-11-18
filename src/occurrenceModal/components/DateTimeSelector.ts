import { Component } from "obsidian"

export interface DateTimeSelectorOptions {
  label?: string
}

export class DateTimeSelector extends Component {
  private container: HTMLElement
  private dateInput: HTMLInputElement
  private timeInput: HTMLInputElement
  private timezoneSelect: HTMLSelectElement
  private onDateChange: (date: Date | null) => void
  private options: DateTimeSelectorOptions

  constructor(
    container: HTMLElement,
    onDateChange: (date: Date | null) => void,
    options: DateTimeSelectorOptions = {}
  ) {
    super()
    this.container = container
    this.options = {
      label: "Occurred At",
      ...options,
    }
    this.onDateChange = onDateChange
    this.render()
  }

  private render(): void {
    // Create field container
    const fieldContainer = this.container.createEl("div", {
      cls: "occurrence-modal-field",
    })

    if (this.options.label) {
      fieldContainer.createEl("label", {
        text: this.options.label,
      })
    }

    const inputContainer = fieldContainer.createEl("div", {
      cls: "occurrence-modal-datetime-container",
    })

    // Date input
    this.dateInput = inputContainer.createEl("input", {
      type: "date",
      attr: {
        id: "occurrence-date",
        "aria-label": "Date",
      },
    }) as HTMLInputElement

    // Time input
    this.timeInput = inputContainer.createEl("input", {
      type: "time",
      attr: {
        id: "occurrence-time",
        "aria-label": "Time",
      },
    }) as HTMLInputElement

    // Timezone select
    this.timezoneSelect = inputContainer.createEl("select", {
      attr: {
        id: "occurrence-timezone",
        "aria-label": "Timezone",
      },
    }) as HTMLSelectElement

    // Populate timezone options
    this.populateTimezoneOptions()

    // Add event listeners
    this.registerDomEvent(this.dateInput, "change", () => this.updateDate())
    this.registerDomEvent(this.timeInput, "change", () => this.updateDate())
    this.registerDomEvent(this.timezoneSelect, "change", () => this.updateDate())
  }

  /**
   * Populate timezone select with UTC offset options
   */
  private populateTimezoneOptions(): void {
    // Get user's local timezone offset for default selection
    const localOffset = -new Date().getTimezoneOffset() / 60
    const localOffsetHours = Math.floor(Math.abs(localOffset))
    const localOffsetMinutes = Math.abs((localOffset % 1) * 60)
    const localSign = localOffset >= 0 ? "+" : "-"
    const localOffsetString = `${localSign}${localOffsetHours.toString().padStart(2, "0")}:${localOffsetMinutes.toString().padStart(2, "0")}`

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
   * The date is displayed in the user's local timezone for editing
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
    // Note: getTimezoneOffset() returns offset in minutes, positive for west of UTC
    // We need to invert it for display (positive for east of UTC)
    const offset = date.getTimezoneOffset()
    const offsetHours = Math.floor(Math.abs(offset) / 60)
    const offsetMinutes = Math.abs(offset) % 60
    const offsetSign = offset <= 0 ? "+" : "-"
    const timezoneOffset = `${offsetSign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`

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
      this.onDateChange(null)
      return
    }

    // Parse timezone offset (e.g., "+05:00" or "-08:00")
    const offsetMatch = timezoneOffset.match(/^([+-])(\d{2}):(\d{2})$/)
    if (!offsetMatch) {
      this.onDateChange(null)
      return
    }

    // Create ISO string with timezone: the date/time values are interpreted as being in the selected timezone
    // JavaScript Date constructor can parse ISO strings with timezone offsets
    const isoString = `${dateStr}T${timeStr}:00${timezoneOffset}`
    const date = new Date(isoString)

    // Validate the date was parsed correctly
    if (isNaN(date.getTime())) {
      this.onDateChange(null)
      return
    }

    this.onDateChange(date)
  }

  /**
   * Get the current date value
   */
  public getValue(): Date | null {
    const dateStr = this.dateInput.value
    const timeStr = this.timeInput.value
    const timezoneOffset = this.timezoneSelect.value

    if (!dateStr || !timeStr || !timezoneOffset) {
      return null
    }

    const offsetMatch = timezoneOffset.match(/^([+-])(\d{2}):(\d{2})$/)
    if (!offsetMatch) {
      return null
    }

    const isoString = `${dateStr}T${timeStr}:00${timezoneOffset}`
    const date = new Date(isoString)

    if (isNaN(date.getTime())) {
      return null
    }

    return date
  }

  /**
   * Set the date value programmatically
   */
  public setValue(date: Date | null): void {
    if (!date) {
      this.dateInput.value = ""
      this.timeInput.value = ""
      this.onDateChange(null)
      return
    }

    const { dateStr, timeStr, timezoneOffset } = this.parseDateToInputs(date)
    this.dateInput.value = dateStr
    this.timeInput.value = timeStr
    this.timezoneSelect.value = timezoneOffset
    this.onDateChange(date)
  }

  public getElement(): HTMLElement {
    return this.container
  }
}

