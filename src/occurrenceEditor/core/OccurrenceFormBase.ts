import { App, TFile } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { DateTimeSelector } from "../components/DateTimeSelector"

export interface OccurrenceFormData {
  title: string
  occurredAt: Date | null
  tags: string[]
  location: string | null
  participants: string[]
  topics: string[]
  toProcess: boolean
}
import { SingleFileSelector } from "../components/SingleFileSelector"
import { MultiFileSelector } from "../components/MultiFileSelector"
import { TagSelector } from "../components/TagSelector"
import { getFrontmatterFieldName } from "@/settings"
import { extractTimezoneFromISOString } from "../utils/timezoneUtils"
import { OccurrenceFileOperations } from "../utils/occurrenceFileOperations"
import {
  buildFormFields,
  buildToProcessField,
  buildErrorMessage,
  buildSubmitButton,
} from "./formFieldBuilder"

export interface OccurrenceFormView {
  getApp(): App
  getContainer(): HTMLElement
  getFormContainer(): HTMLElement
  getTitleContainerClass(): string
  getSubmitButtonContainerClass(): string | null
  handleSuccess(file: TFile): Promise<void>
}

/**
 * Base class for occurrence form logic
 * Uses composition pattern to work with both Modal and ItemView
 */
export class OccurrenceFormBase {
  protected plugin: OccurrencesPlugin
  protected occurrence: OccurrenceObject | null
  protected formData: OccurrenceFormData
  protected titleInput: HTMLInputElement
  protected dateTimeSelector: DateTimeSelector
  protected tagSelector: TagSelector
  protected locationSelector: SingleFileSelector
  protected participantsSelector: MultiFileSelector
  protected topicsSelector: MultiFileSelector
  protected submitButton: HTMLButtonElement
  protected toProcessCheckbox: HTMLInputElement
  protected errorMessage: HTMLElement
  protected isSubmitting: boolean = false
  protected keyboardHandler: (e: KeyboardEvent) => void
  protected toProcessCheckboxHandler: (() => void) | null = null
  protected submitButtonHandler: (() => void) | null = null
  private view: OccurrenceFormView
  private formContainerEl: HTMLElement | null = null

  constructor(
    plugin: OccurrencesPlugin,
    view: OccurrenceFormView,
    occurrence: OccurrenceObject | null = null
  ) {
    this.plugin = plugin
    this.view = view
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

  /**
   * Initialize the form - called by subclasses in their onOpen methods
   */
  public initializeForm(): void {
    const container = this.view.getContainer()
    
    // Check if title container already exists (e.g., in form view header)
    const existingTitleContainer = container.querySelector(`.${this.view.getTitleContainerClass()}`)
    
    // Only empty container if title container doesn't exist (modal case)
    if (!existingTitleContainer) {
      container.empty()
    }

    // Parse timezone offset and toProcess from frontmatter if editing an existing occurrence
    let savedTimezoneOffset: string | null = null
    if (this.occurrence) {
      const fileCache = this.plugin.app.metadataCache.getFileCache(this.occurrence.file)
      const frontmatter = (fileCache?.frontmatter ?? {}) as Record<string, unknown>
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

    // Build title field - use existing container if found, otherwise create new one
    const titleContainer = existingTitleContainer || 
      container.createEl("div", { cls: this.view.getTitleContainerClass() })
    this.titleInput = titleContainer.createEl("input", {
      type: "text",
      attr: {
        id: "occurrence-title",
        "aria-label": "Title",
        placeholder: "Enter occurrence title...",
      },
    })
    this.titleInput.value = this.formData.title

    // Build form container
    const formContainer = this.view.getFormContainer()
    this.formContainerEl = formContainer

    // Build all form fields
    const fieldBuilders = buildFormFields({
      formData: this.formData,
      plugin: this.plugin,
      formContainer,
      savedTimezoneOffset,
      onFormDataChange: (data) => {
        Object.assign(this.formData, data)
      },
    })

    this.dateTimeSelector = fieldBuilders.dateTimeSelector
    this.locationSelector = fieldBuilders.locationSelector
    this.participantsSelector = fieldBuilders.participantsSelector
    this.topicsSelector = fieldBuilders.topicsSelector
    this.tagSelector = fieldBuilders.tagSelector

    // Build To Process field
    this.toProcessCheckbox = buildToProcessField(formContainer, this.formData, (value) => {
      this.formData.toProcess = value
    })
    this.toProcessCheckboxHandler = () => {
      this.formData.toProcess = this.toProcessCheckbox.checked
    }
    this.toProcessCheckbox.addEventListener("change", this.toProcessCheckboxHandler)

    // Build error message
    this.errorMessage = buildErrorMessage(formContainer)
    this.hideError()

    // Build submit button
    this.submitButton = buildSubmitButton(
      formContainer,
      !!this.occurrence,
      this.view.getSubmitButtonContainerClass()
    )

    this.submitButtonHandler = () => {
      void this.handleSubmit()
    }
    this.submitButton.addEventListener("click", this.submitButtonHandler)

    // Add keyboard handler for Cmd+Enter / Ctrl+Enter
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !this.isSubmitting) {
        e.preventDefault()
        void this.handleSubmit()
      }
    }
    document.addEventListener("keydown", this.keyboardHandler)

    // Focus title input on open
    requestAnimationFrame(() => {
      this.titleInput.focus()
    })
  }

  /**
   * Handle form submission
   */
  protected async handleSubmit(): Promise<void> {
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
          this.view.getApp(),
          this.plugin,
          this.occurrence,
          this.formData,
          timezoneOffset
        )
      } else {
        // Create new occurrence
        file = await OccurrenceFileOperations.createOccurrence(
          this.view.getApp(),
          this.plugin,
          this.formData,
          timezoneOffset
        )
        // Open the newly created file in the editor
        await this.view.getApp().workspace.openLinkText(file.path, "", false)
      }

      // Handle success (close modal or detach view)
      await this.view.handleSuccess(file)
    } catch (error) {
      this.showError(error instanceof Error ? error.message : "An error occurred")
      this.isSubmitting = false
      this.submitButton.disabled = false
      this.submitButton.textContent = this.occurrence ? "Update Occurrence" : "Create Occurrence"
    }
  }

  /**
   * Show error message
   */
  protected showError(message: string): void {
    const errorText = this.errorMessage.querySelector(".occurrence-modal-error-text")
    if (errorText) {
      errorText.textContent = message
    }
    this.errorMessage.addClass("is-visible")
  }

  /**
   * Hide error message
   */
  protected hideError(): void {
    this.errorMessage.removeClass("is-visible")
    const errorText = this.errorMessage.querySelector(".occurrence-modal-error-text")
    if (errorText) {
      errorText.textContent = ""
    }
  }

  /**
   * Cleanup form - called by subclasses in their onClose methods
   */
  public cleanupForm(): void {
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
  }
}

