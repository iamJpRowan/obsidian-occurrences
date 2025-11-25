import { Modal, TFile, setIcon } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { TagSelector } from "./components/TagSelector"
import { SingleFileSelector } from "./components/SingleFileSelector"
import { MultiFileSelector } from "./components/MultiFileSelector"
import { DateTimeSelector } from "./components/DateTimeSelector"
import { getFrontmatterFieldName } from "@/settings"
import { extractTimezoneFromISOString } from "./utils/timezoneUtils"
import { OccurrenceFileOperations } from "./utils/occurrenceFileOperations"
import { createFieldContainer } from "./utils/fieldHelpers"

export interface OccurrenceFormData {
  title: string
  occurredAt: Date | null
  tags: string[]
  location: string | null
  participants: string[]
  topics: string[]
  toProcess: boolean
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
  private toProcessCheckbox: HTMLInputElement
  private errorMessage: HTMLElement
  private isSubmitting: boolean = false
  private keyboardHandler: (e: KeyboardEvent) => void
  private toProcessCheckboxHandler: (() => void) | null = null
  private submitButtonHandler: (() => void) | null = null

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
        ? OccurrenceFileOperations.extractBasename(occurrence.location.target)
        : null,
      participants:
        occurrence?.participants.map(p => OccurrenceFileOperations.extractBasename(p.target)) || [],
      topics: occurrence?.topics.map(t => OccurrenceFileOperations.extractBasename(t.target)) || [],
      toProcess: occurrence?.toProcess ?? true,
    }
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass("occurrence-modal")

    // Parse timezone offset and toProcess from frontmatter if editing an existing occurrence
    let savedTimezoneOffset: string | null = null
    if (this.occurrence) {
      const fileCache = this.plugin.app.metadataCache.getFileCache(this.occurrence.file)
      const frontmatter = fileCache?.frontmatter ?? {}
      const occurredAtField = getFrontmatterFieldName("occurredAt", this.plugin.settings)
      const occurredAtValue = frontmatter[occurredAtField]
      
      if (occurredAtValue && typeof occurredAtValue === "string") {
        savedTimezoneOffset = extractTimezoneFromISOString(occurredAtValue)
      }

      // Read toProcess from frontmatter
      const toProcessField = getFrontmatterFieldName("toProcess", this.plugin.settings)
      const toProcessValue = frontmatter[toProcessField]
      if (typeof toProcessValue === "boolean") {
        this.formData.toProcess = toProcessValue
      }
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

    // Create form container
    const formContainer = contentEl.createEl("div", {
      cls: "occurrence-modal-form",
    })

    // Occurred At field - restructured to match other fields
    const occurredAtContainer = createFieldContainer(formContainer, {
      icon: "calendar",
      label: "Occurred At",
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

    // Location field
    const locationContainer = createFieldContainer(formContainer, {
      icon: "map-pin",
      label: "Location",
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
    const participantsContainer = createFieldContainer(formContainer, {
      icon: "users",
      label: "Participants",
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
    const topicsContainer = createFieldContainer(formContainer, {
      icon: "lightbulb",
      label: "Topics",
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

    // Tags field (moved after topics)
    const tagsContainer = createFieldContainer(formContainer, {
      icon: "tags",
      label: "Tags",
    })
    this.tagSelector = new TagSelector(
      tagsContainer,
      this.plugin.occurrenceStore,
      (tags: string[]) => {
        this.formData.tags = tags
      }
    )
    if (this.formData.tags.length > 0) {
      this.tagSelector.setValue(this.formData.tags)
    }

    // To Process field
    const toProcessContainer = createFieldContainer(formContainer, {
      icon: "square-check-big",
      label: "To Process",
    })
    const toProcessCheckboxContainer = toProcessContainer.createEl("div", {
      cls: "occurrence-modal-to-process",
    })
    this.toProcessCheckbox = toProcessCheckboxContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "occurrence-to-process",
      },
    }) as HTMLInputElement
    this.toProcessCheckbox.checked = this.formData.toProcess
    this.toProcessCheckboxHandler = () => {
      this.formData.toProcess = this.toProcessCheckbox.checked
    }
    this.toProcessCheckbox.addEventListener("change", this.toProcessCheckboxHandler)

    // Create error message container (at bottom of form)
    this.errorMessage = formContainer.createEl("div", {
      cls: "occurrence-modal-error",
    })
    // Start hidden but reserve space
    this.hideError()
    
    // Create icon container for error
    const errorIcon = this.errorMessage.createEl("span", {
      cls: "occurrence-modal-error-icon",
    })
    setIcon(errorIcon, "circle-alert")
    
    // Create text container for error message
    this.errorMessage.createEl("span", {
      cls: "occurrence-modal-error-text",
    })

    // Submit button
    const buttonContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-actions",
    })
    this.submitButton = buttonContainer.createEl("button", {
      text: this.occurrence ? "Update Occurrence" : "Create Occurrence",
      cls: "mod-cta",
    }) as HTMLButtonElement

    this.submitButtonHandler = () => {
      this.handleSubmit()
    }
    this.submitButton.addEventListener("click", this.submitButtonHandler)

    // Add keyboard handler for Cmd+Enter / Ctrl+Enter
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        (e.metaKey || e.ctrlKey) &&
        !this.isSubmitting
      ) {
        e.preventDefault()
        this.handleSubmit()
      }
    }
    document.addEventListener("keydown", this.keyboardHandler)

    // Focus title input on open
    requestAnimationFrame(() => {
      this.titleInput.focus()
    })
  }

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return

    // Update form data from inputs
    this.formData.title = this.titleInput.value.trim()
    this.formData.occurredAt = this.dateTimeSelector.getValue()
    this.formData.toProcess = this.toProcessCheckbox.checked

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
      const timezoneOffset = this.dateTimeSelector.getTimezoneOffset()
      let file: TFile

      if (this.occurrence) {
        // Update existing occurrence
        file = await OccurrenceFileOperations.updateOccurrence(
          this.app,
          this.plugin,
          this.occurrence,
          this.formData,
          timezoneOffset
        )
      } else {
        // Create new occurrence
        file = await OccurrenceFileOperations.createOccurrence(
          this.app,
          this.plugin,
          this.formData,
          timezoneOffset
        )
        // Open the newly created file in the editor
        await this.app.workspace.openLinkText(file.path, "", false)
      }

      // Close modal on success
      this.close()
    } catch (error) {
      this.showError(error instanceof Error ? error.message : "An error occurred")
      this.isSubmitting = false
      this.submitButton.disabled = false
      this.submitButton.textContent = this.occurrence ? "Update Occurrence" : "Create Occurrence"
    }
  }

  private showError(message: string): void {
    const errorText = this.errorMessage.querySelector(".occurrence-modal-error-text")
    if (errorText) {
      errorText.textContent = message
    }
    this.errorMessage.addClass("is-visible")
  }

  private hideError(): void {
    this.errorMessage.removeClass("is-visible")
    const errorText = this.errorMessage.querySelector(".occurrence-modal-error-text")
    if (errorText) {
      errorText.textContent = ""
    }
  }

  onClose() {
    const { contentEl } = this
    
    // Unload all child components
    if (this.dateTimeSelector) {
      this.dateTimeSelector.unload()
    }
    if (this.tagSelector) {
      this.tagSelector.unload()
    }
    if (this.locationSelector) {
      this.locationSelector.unload()
    }
    if (this.participantsSelector) {
      this.participantsSelector.unload()
    }
    if (this.topicsSelector) {
      this.topicsSelector.unload()
    }
    
    // Remove event listeners
    if (this.toProcessCheckboxHandler && this.toProcessCheckbox) {
      this.toProcessCheckbox.removeEventListener("change", this.toProcessCheckboxHandler)
    }
    if (this.submitButtonHandler && this.submitButton) {
      this.submitButton.removeEventListener("click", this.submitButtonHandler)
    }
    
    // Remove keyboard event listener
    if (this.keyboardHandler) {
      document.removeEventListener("keydown", this.keyboardHandler)
    }
    
    contentEl.empty()
  }
}

