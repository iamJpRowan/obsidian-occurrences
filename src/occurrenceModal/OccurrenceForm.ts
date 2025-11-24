import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { OccurrenceFormData } from "./OccurrenceModal"
import { TagSelector } from "./components/TagSelector"
import { SingleFileSelector } from "./components/SingleFileSelector"
import { MultiFileSelector } from "./components/MultiFileSelector"
import { DateTimeSelector } from "./components/DateTimeSelector"
import { getFrontmatterFieldName } from "@/settings"
import { extractTimezoneFromISOString } from "./utils/timezoneUtils"
import { OccurrenceFileOperations } from "./utils/occurrenceFileOperations"

export const OCCURRENCE_FORM_VIEW = "occurrence-form-view"

/**
 * Full-screen view for creating/editing occurrences on mobile
 * Uses ItemView pattern that works well with mobile keyboard
 */
export class OccurrenceForm extends ItemView {
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

  constructor(
    leaf: WorkspaceLeaf,
    plugin: OccurrencesPlugin,
    occurrence: OccurrenceObject | null = null
  ) {
    super(leaf)
    this.plugin = plugin
    this.occurrence = occurrence

    // Initialize form data from occurrence or defaults
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

  getViewType(): string {
    return OCCURRENCE_FORM_VIEW
  }

  getDisplayText(): string {
    return this.occurrence ? "Edit Occurrence" : "Create Occurrence"
  }

  getIcon(): string {
    return "calendar-range"
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement
    if (!container) return

    container.empty()
    container.addClass("occurrence-form-view")

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

    // Header with title field and close button
    const header = container.createEl("div", {
      cls: "occurrence-form-view-header",
    })

    // Title field (main header)
    const titleContainer = header.createEl("div", {
      cls: "occurrence-form-view-title-header",
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

    // Focus the title field when form opens (use requestAnimationFrame to ensure DOM is ready)
    requestAnimationFrame(() => {
      this.titleInput.focus()
    })

    // Close button (X)
    const closeButton = header.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "Close" },
    })
    setIcon(closeButton, "x")
    closeButton.addEventListener("click", () => {
      this.leaf.detach()
    })

    // Form container (scrollable)
    const formContainer = container.createEl("div", {
      cls: "occurrence-form-view-form",
    })

    // Occurred At field
    const occurredAtContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    const occurredAtIcon = occurredAtContainer.createEl("span", {
      cls: "occurrence-modal-field-icon",
    })
    setIcon(occurredAtIcon, "calendar")
    occurredAtContainer.createEl("label", {
      text: "Occurred At",
      cls: "occurrence-modal-field-label",
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
    const locationContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    const locationIcon = locationContainer.createEl("span", {
      cls: "occurrence-modal-field-icon",
    })
    setIcon(locationIcon, "map-pin")
    locationContainer.createEl("label", {
      text: "Location",
      cls: "occurrence-modal-field-label",
    })
    this.locationSelector = new SingleFileSelector(
      locationContainer,
      this.plugin.app,
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
    const participantsIcon = participantsContainer.createEl("span", {
      cls: "occurrence-modal-field-icon",
    })
    setIcon(participantsIcon, "users")
    participantsContainer.createEl("label", {
      text: "Participants",
      cls: "occurrence-modal-field-label",
    })
    this.participantsSelector = new MultiFileSelector(
      participantsContainer,
      this.plugin.app,
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
    const topicsIcon = topicsContainer.createEl("span", {
      cls: "occurrence-modal-field-icon",
    })
    setIcon(topicsIcon, "lightbulb")
    topicsContainer.createEl("label", {
      text: "Topics",
      cls: "occurrence-modal-field-label",
    })
    this.topicsSelector = new MultiFileSelector(
      topicsContainer,
      this.plugin.app,
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
    const tagsContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    const tagsIcon = tagsContainer.createEl("span", {
      cls: "occurrence-modal-field-icon",
    })
    setIcon(tagsIcon, "tags")
    tagsContainer.createEl("label", {
      text: "Tags",
      cls: "occurrence-modal-field-label",
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
    const toProcessContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    const toProcessIcon = toProcessContainer.createEl("span", {
      cls: "occurrence-modal-field-icon",
    })
    setIcon(toProcessIcon, "square-check-big")
    toProcessContainer.createEl("label", {
      text: "To Process",
      cls: "occurrence-modal-field-label",
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
    this.toProcessCheckbox.addEventListener("change", () => {
      this.formData.toProcess = this.toProcessCheckbox.checked
    })

    // Error message container (at bottom, above submit button)
    this.errorMessage = formContainer.createEl("div", {
      cls: "occurrence-modal-error",
    })
    // Start hidden but reserve space
    this.hideError()

    const errorIcon = this.errorMessage.createEl("span", {
      cls: "occurrence-modal-error-icon",
    })
    setIcon(errorIcon, "circle-alert")

    this.errorMessage.createEl("span", {
      cls: "occurrence-modal-error-text",
    })

    // Submit button (inside scrollable form)
    this.submitButton = formContainer.createEl("button", {
      cls: "mod-cta",
      text: this.occurrence ? "Update Occurrence" : "Create Occurrence",
    })
    this.submitButton.style.marginTop = "2rem"
    this.submitButton.style.width = "100%"
    this.submitButton.addEventListener("click", () => {
      this.handleSubmit()
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

    this.hideError()
    this.isSubmitting = true
    this.submitButton.disabled = true
    this.submitButton.textContent = this.occurrence ? "Updating..." : "Creating..."

    try {
      const timezoneOffset = this.dateTimeSelector.getTimezoneOffset()
      let file: TFile
      if (this.occurrence) {
        // Update existing occurrence
        file = await OccurrenceFileOperations.updateOccurrence(
          this.plugin.app,
          this.plugin,
          this.occurrence,
          this.formData,
          timezoneOffset
        )
      } else {
        // Create new occurrence
        file = await OccurrenceFileOperations.createOccurrence(
          this.plugin.app,
          this.plugin,
          this.formData,
          timezoneOffset
        )
        // Open the newly created file in the editor
        await this.plugin.app.workspace.openLinkText(file.path, "", false)
      }

      // Close the view
      this.leaf.detach()
    } catch (error) {
      console.error("Failed to save occurrence:", error)
      this.showError(error instanceof Error ? error.message : "Failed to save occurrence")
      this.submitButton.disabled = false
      this.submitButton.textContent = this.occurrence ? "Update Occurrence" : "Create Occurrence"
    } finally {
      this.isSubmitting = false
    }
  }

  private showError(message: string): void {
    const errorText = this.errorMessage.querySelector(".occurrence-modal-error-text")
    if (errorText) {
      errorText.textContent = message
    }
    // Show error by making it visible
    this.errorMessage.style.visibility = "visible"
    this.errorMessage.style.opacity = "1"
    this.errorMessage.style.minHeight = "auto"
  }

  private hideError(): void {
    // Hide error but reserve space
    this.errorMessage.style.visibility = "hidden"
    this.errorMessage.style.opacity = "0"
    this.errorMessage.style.minHeight = "1.5rem" // Reserve space for error message
    const errorText = this.errorMessage.querySelector(".occurrence-modal-error-text")
    if (errorText) {
      errorText.textContent = ""
    }
  }

  async onClose(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement
    if (container) {
      container.empty()
    }
  }
}

