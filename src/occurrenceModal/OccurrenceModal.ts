import { Modal, TFile } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { TagSelector } from "@/occurrencesView/components/tagSelector"
import { SingleFileSelector } from "./components/SingleFileSelector"
import { MultiFileSelector } from "./components/MultiFileSelector"
import { DateTimeSelector } from "./components/DateTimeSelector"
import { OCCURRENCE_DATE_FORMAT } from "@/types"
import { getFrontmatterFieldName } from "@/settings"
import {
  timezoneOffsetToISOString,
  parseTimezoneOffset,
  extractTimezoneFromISOString,
} from "./utils/timezoneUtils"

export interface OccurrenceFormData {
  title: string
  occurredAt: Date | null
  tags: string[]
  location: string | null
  participants: string[]
  topics: string[]
}

export class OccurrenceModal extends Modal {
  private plugin: OccurrencesPlugin
  private occurrence: OccurrenceObject | null
  private formData: OccurrenceFormData
  private titleInput: HTMLInputElement
  private dateTimeSelector: DateTimeSelector
  private tagSelector: TagSelector
  private locationSelector: SingleFileSelector
  private participantsSelector: MultiFileSelector
  private topicsSelector: MultiFileSelector
  private submitButton: HTMLButtonElement
  private errorMessage: HTMLElement
  private isSubmitting: boolean = false

  constructor(
    plugin: OccurrencesPlugin,
    occurrence: OccurrenceObject | null = null
  ) {
    super(plugin.app)
    this.plugin = plugin
    this.occurrence = occurrence

    // Initialize form data from occurrence or defaults
    // Extract basenames from link targets (assume targets are basenames)
    this.formData = {
      title: occurrence?.title || "",
      occurredAt: occurrence?.occurredAt || new Date(),
      tags: occurrence?.tags || [],
      location: occurrence?.location?.target
        ? this.extractBasename(occurrence.location.target)
        : null,
      participants:
        occurrence?.participants.map(p => this.extractBasename(p.target)) || [],
      topics: occurrence?.topics.map(t => this.extractBasename(t.target)) || [],
    }
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass("occurrence-modal")

    // Parse timezone offset from frontmatter if editing an existing occurrence
    let savedTimezoneOffset: string | null = null
    if (this.occurrence) {
      const fileCache = this.plugin.app.metadataCache.getFileCache(this.occurrence.file)
      const frontmatter = fileCache?.frontmatter ?? {}
      const occurredAtField = getFrontmatterFieldName("occurredAt", this.plugin.settings)
      const occurredAtValue = frontmatter[occurredAtField]
      
      if (occurredAtValue && typeof occurredAtValue === "string") {
        savedTimezoneOffset = extractTimezoneFromISOString(occurredAtValue)
      }
    }

    // Occurred At field
    const occurredAtContainer = contentEl.createEl("div", {
      cls: "occurrence-modal-datetime-header",
    })
    this.dateTimeSelector = new DateTimeSelector(
      occurredAtContainer,
      (date: Date | null) => {
        this.formData.occurredAt = date
      }
    )
    if (this.formData.occurredAt) {
      this.dateTimeSelector.setValue(this.formData.occurredAt, savedTimezoneOffset)
    }

    // Title field (header-style)
    const titleContainer = contentEl.createEl("div", {
      cls: "occurrence-modal-title-header",
    })
    this.titleInput = titleContainer.createEl("input", {
      type: "text",
      attr: {
        id: "occurrence-title",
        "aria-label": "Title",
        placeholder: "Enter occurrence title...",
      },
    }) as HTMLInputElement
    this.titleInput.value = this.formData.title

    // Create error message container
    this.errorMessage = contentEl.createEl("div", {
      cls: "occurrence-modal-error",
    })
    this.errorMessage.style.display = "none"

    // Create form container
    const formContainer = contentEl.createEl("div", {
      cls: "occurrence-modal-form",
    })

    // Location field
    const locationContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    locationContainer.createEl("label", {
      text: "Location",
    })
    this.locationSelector = new SingleFileSelector(
      locationContainer,
      this.app,
      (basename: string | null) => {
        this.formData.location = basename
      },
      {
        placeholder: "Select location...",
        allowCreate: true,
        filterSettings: this.plugin.settings.fileSelectorFilters.location,
      }
    )
    if (this.formData.location) {
      this.locationSelector.setValue(this.formData.location)
    }

    // Participants field
    const participantsContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    participantsContainer.createEl("label", {
      text: "Participants",
    })
    this.participantsSelector = new MultiFileSelector(
      participantsContainer,
      this.app,
      (basenames: string[]) => {
        this.formData.participants = basenames
      },
      {
        placeholder: "Add participants...",
        allowCreate: true,
        filterSettings: this.plugin.settings.fileSelectorFilters.participants,
      }
    )
    if (this.formData.participants.length > 0) {
      this.participantsSelector.setValue(this.formData.participants)
    }

    // Topics field
    const topicsContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    topicsContainer.createEl("label", {
      text: "Topics",
    })
    this.topicsSelector = new MultiFileSelector(
      topicsContainer,
      this.app,
      (basenames: string[]) => {
        this.formData.topics = basenames
      },
      {
        placeholder: "Add topics...",
        allowCreate: true,
        filterSettings: this.plugin.settings.fileSelectorFilters.topics,
      }
    )
    if (this.formData.topics.length > 0) {
      this.topicsSelector.setValue(this.formData.topics)
    }

    // Tags field
    const tagsContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    tagsContainer.createEl("label", {
      text: "Tags",
    })
    const tagSelectorContainer = tagsContainer.createEl("div")
    this.tagSelector = new TagSelector(
      tagSelectorContainer,
      this.plugin.occurrenceStore,
      (tags: string[]) => {
        this.formData.tags = tags
      },
      {
        placeholder: "Add tags...",
      }
    )
    this.tagSelector.show()
    if (this.formData.tags.length > 0) {
      this.tagSelector.setValue(this.formData.tags)
    }

    // Submit button
    const buttonContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-actions",
    })
    this.submitButton = buttonContainer.createEl("button", {
      text: this.occurrence ? "Update" : "Create",
      cls: "mod-cta",
    }) as HTMLButtonElement

    this.submitButton.addEventListener("click", () => {
      this.handleSubmit()
    })

    // Focus title input on open
    setTimeout(() => {
      this.titleInput.focus()
      // If creating new occurrence and title is empty, submit on Enter
      if (!this.occurrence && this.titleInput.value === "") {
        this.titleInput.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter" && !this.isSubmitting) {
            e.preventDefault()
            this.handleSubmit()
          }
        })
      }
    }, 100)
  }

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return

    // Update form data from inputs
    this.formData.title = this.titleInput.value.trim()
    this.formData.occurredAt = this.dateTimeSelector.getValue()

    // Validate
    if (!this.formData.title) {
      this.showError("Title is required")
      return
    }

    if (!this.formData.occurredAt) {
      this.showError("Occurred At date is required")
      return
    }

    this.isSubmitting = true
    this.submitButton.disabled = true
    this.submitButton.textContent = this.occurrence ? "Updating..." : "Creating..."
    this.hideError()

    try {
      let file: TFile

      if (this.occurrence) {
        // Update existing occurrence
        file = await this.updateOccurrence(this.occurrence, this.formData)
      } else {
        // Create new occurrence
        file = await this.createOccurrence(this.formData)
        // Open the newly created file in the editor
        await this.app.workspace.openLinkText(file.path, "", false)
      }

      // Close modal on success
      this.close()
    } catch (error) {
      this.showError(error instanceof Error ? error.message : "An error occurred")
      this.isSubmitting = false
      this.submitButton.disabled = false
      this.submitButton.textContent = this.occurrence ? "Update" : "Create"
    }
  }

  private async createOccurrence(
    formData: OccurrenceFormData
  ): Promise<TFile> {
    const { app } = this

    // Ensure Occurrences directory exists
    const occurrencesFolder = "Occurrences"
    const folder = app.vault.getAbstractFileByPath(occurrencesFolder)
    if (!folder) {
      await app.vault.createFolder(occurrencesFolder)
    }

    // Generate filename with date prefix
    const occurredAt = formData.occurredAt || new Date()
    const datePrefix = this.formatDatePrefix(occurredAt, OCCURRENCE_DATE_FORMAT)
    const fileName = `${datePrefix} ${formData.title}.md`
    const filePath = `${occurrencesFolder}/${fileName}`

    // Check if file already exists
    if (app.vault.getAbstractFileByPath(filePath)) {
      throw new Error(`File "${fileName}" already exists`)
    }

    // Get frontmatter field names from settings
    const occurredAtField = getFrontmatterFieldName("occurredAt", this.plugin.settings)
    const toProcessField = getFrontmatterFieldName("toProcess", this.plugin.settings)
    const locationField = getFrontmatterFieldName("location", this.plugin.settings)
    const participantsField = getFrontmatterFieldName("participants", this.plugin.settings)
    const topicsField = getFrontmatterFieldName("topics", this.plugin.settings)

    // Get timezone offset from the selector
    const timezoneOffset = this.dateTimeSelector.getTimezoneOffset()

    // Create frontmatter
    const frontmatter: Record<string, string | string[] | boolean | number> = {
      [occurredAtField]: this.formatDateForFrontmatter(occurredAt, timezoneOffset),
      [toProcessField]: true,
    }

    // Add tags
    if (formData.tags.length > 0) {
      frontmatter.tags = formData.tags
    }

    // Add location
    if (formData.location) {
      // Ensure location file exists (formData.location is a basename)
      await this.ensureFileExists(formData.location)
      // Use basename directly for wikilink
      frontmatter[locationField] = `[[${formData.location}]]`
    }

    // Add participants
    if (formData.participants.length > 0) {
      // Ensure participant files exist (formData.participants contains basenames)
      for (const participantBasename of formData.participants) {
        await this.ensureFileExists(participantBasename)
      }
      frontmatter[participantsField] = formData.participants.map(
        p => `[[${p}]]`
      )
    }

    // Add topics
    if (formData.topics.length > 0) {
      // Ensure topic files exist (formData.topics contains basenames)
      for (const topicBasename of formData.topics) {
        await this.ensureFileExists(topicBasename)
      }
      frontmatter[topicsField] = formData.topics.map(t => `[[${t}]]`)
    }

    // Create file content with frontmatter
    const frontmatterYaml = this.formatFrontmatter(frontmatter)
    const content = `---\n${frontmatterYaml}---\n\n`

    // Create the file
    const file = await app.vault.create(filePath, content)

    // Wait for metadata cache to be ready
    await app.metadataCache.getFileCache(file)

    return file
  }

  private async updateOccurrence(
    occurrence: OccurrenceObject,
    formData: OccurrenceFormData
  ): Promise<TFile> {
    const { app } = this
    const file = occurrence.file

    // Read current file content
    const content = await app.vault.read(file)
    const fileCache = app.metadataCache.getFileCache(file)
    const frontmatter = fileCache?.frontmatter ?? {}

    // Update frontmatter
    const updatedFrontmatter = { ...frontmatter }

    // Update occurredAt
    const occurredAtField = getFrontmatterFieldName("occurredAt", this.plugin.settings)
    const occurredAt = formData.occurredAt || new Date()
    // Get timezone offset from the selector
    const timezoneOffset = this.dateTimeSelector.getTimezoneOffset()
    updatedFrontmatter[occurredAtField] = this.formatDateForFrontmatter(occurredAt, timezoneOffset)
    
    // Update filename if date or title changed
    const datePrefix = this.formatDatePrefix(occurredAt, OCCURRENCE_DATE_FORMAT)
      const newFileName = `${datePrefix} ${formData.title}.md`
      const newFilePath = `Occurrences/${newFileName}`

    // Rename file if path changed
      if (newFilePath !== file.path) {
        if (app.vault.getAbstractFileByPath(newFilePath)) {
          throw new Error(`File "${newFileName}" already exists`)
        }
        await app.vault.rename(file, newFilePath)
    }

    // Update tags
    if (formData.tags.length > 0) {
      updatedFrontmatter.tags = formData.tags
    } else {
      delete updatedFrontmatter.tags
    }

    // Get frontmatter field names from settings
    const locationField = getFrontmatterFieldName("location", this.plugin.settings)
    const participantsField = getFrontmatterFieldName("participants", this.plugin.settings)
    const topicsField = getFrontmatterFieldName("topics", this.plugin.settings)

    // Update location
    if (formData.location) {
      await this.ensureFileExists(formData.location)
      // Use basename directly for wikilink
      updatedFrontmatter[locationField] = `[[${formData.location}]]`
    } else {
      delete updatedFrontmatter[locationField]
    }

    // Update participants
    if (formData.participants.length > 0) {
      for (const participantBasename of formData.participants) {
        await this.ensureFileExists(participantBasename)
      }
      updatedFrontmatter[participantsField] = formData.participants.map(
        p => `[[${p}]]`
      )
    } else {
      delete updatedFrontmatter[participantsField]
    }

    // Update topics
    if (formData.topics.length > 0) {
      for (const topicBasename of formData.topics) {
        await this.ensureFileExists(topicBasename)
      }
      updatedFrontmatter[topicsField] = formData.topics.map(t => `[[${t}]]`)
    } else {
      delete updatedFrontmatter[topicsField]
    }

    // Reconstruct file content
    const frontmatterYaml = this.formatFrontmatter(updatedFrontmatter)
    const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
    const body = bodyMatch ? bodyMatch[1] : ""
    const newContent = `---\n${frontmatterYaml}---\n${body}`

    // Write updated content
    await app.vault.modify(file, newContent)

    return file
  }

  /**
   * Ensure a file exists, creating it if necessary
   * @param basename The basename of the file (without extension or path)
   */
  private async ensureFileExists(basename: string): Promise<void> {
    const { app } = this
    // basename is expected to be just the filename without extension
    // Try to find the file by searching all markdown files
    const allFiles = app.vault.getMarkdownFiles()
    const file = allFiles.find(f => f.basename === basename)

    if (!file) {
      // File doesn't exist, create it in the root
      // Create empty markdown file with basename
      const filePath = `${basename}.md`
      await app.vault.create(filePath, "")
    }
  }

  /**
   * Extract basename from a link target (which may be a basename or path)
   * If it's a path, extract the basename; otherwise return as-is
   */
  private extractBasename(target: string): string {
    // If target contains a slash, it's a path - extract basename
    if (target.includes("/")) {
      const pathParts = target.split("/")
      const lastPart = pathParts[pathParts.length - 1]
      // Remove .md extension if present
      return lastPart.endsWith(".md") ? lastPart.slice(0, -3) : lastPart
    }
    // Otherwise, assume it's already a basename
    // Remove .md extension if present
    return target.endsWith(".md") ? target.slice(0, -3) : target
  }

  private formatDatePrefix(date: Date, format: string): string {
    return format
      .replace("YYYY", date.getFullYear().toString())
      .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
      .replace("DD", String(date.getDate()).padStart(2, "0"))
      .replace("HH", String(date.getHours()).padStart(2, "0"))
      .replace("mm", String(date.getMinutes()).padStart(2, "0"))
      .replace("ss", String(date.getSeconds()).padStart(2, "0"))
  }

  private formatDateForFrontmatter(date: Date, timezoneOffset?: string | null): string {
    // Determine offset string to use
    let offsetString = timezoneOffset || timezoneOffsetToISOString(date.getTimezoneOffset())
    
    // Validate offset format
    let offsetMinutes = parseTimezoneOffset(offsetString)
    if (offsetMinutes === null) {
      // Fallback to date's timezone
      offsetString = timezoneOffsetToISOString(date.getTimezoneOffset())
      offsetMinutes = parseTimezoneOffset(offsetString)
      if (offsetMinutes === null) {
        // Last resort: use ISO string without timezone
        return date.toISOString().slice(0, -1) + "Z"
      }
    }

    // Calculate local time in the specified timezone
    const localTime = new Date(date.getTime() + offsetMinutes * 60000)
    
    // Format as ISO string
    const year = localTime.getUTCFullYear()
    const month = String(localTime.getUTCMonth() + 1).padStart(2, "0")
    const day = String(localTime.getUTCDate()).padStart(2, "0")
    const hours = String(localTime.getUTCHours()).padStart(2, "0")
    const minutes = String(localTime.getUTCMinutes()).padStart(2, "0")
    const seconds = String(localTime.getUTCSeconds()).padStart(2, "0")
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`
  }

  private formatFrontmatter(frontmatter: Record<string, string | string[] | boolean | number>): string {
    const lines: string[] = []
    for (const [key, value] of Object.entries(frontmatter)) {
      if (value === null || value === undefined) continue

      if (Array.isArray(value)) {
        if (value.length === 0) continue
        lines.push(`${key}:`)
        for (const item of value) {
          lines.push(`  - ${this.formatYamlValue(item)}`)
        }
      } else {
        lines.push(`${key}: ${this.formatYamlValue(value)}`)
      }
    }
    return lines.join("\n") + "\n"
  }


  private formatYamlValue(value: string | string[] | boolean | number): string {
    if (typeof value === "string") {
      // Escape special characters if needed
      if (value.includes(":") || value.includes("#") || value.startsWith("[")) {
        return `"${value.replace(/"/g, '\\"')}"`
      }
      return value
    }
    if (typeof value === "number") {
      return value.toString()
    }
    if (typeof value === "boolean") {
      return value.toString()
    }
    return JSON.stringify(value)
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message
    this.errorMessage.style.display = "block"
  }

  private hideError(): void {
    this.errorMessage.style.display = "none"
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}

