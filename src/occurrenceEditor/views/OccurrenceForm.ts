import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { OccurrenceFormBase, OccurrenceFormView } from "../core/OccurrenceFormBase"

export const OCCURRENCE_FORM_VIEW = "occurrence-form-view"

/**
 * Full-screen view for creating/editing occurrences on mobile
 * Uses ItemView pattern that works well with mobile keyboard
 */
export class OccurrenceForm extends ItemView implements OccurrenceFormView {
  private formBase: OccurrenceFormBase
  private plugin: OccurrencesPlugin
  private closeButton: HTMLButtonElement | null = null
  private closeButtonHandler: (() => void) | null = null

  constructor(
    leaf: WorkspaceLeaf,
    plugin: OccurrencesPlugin,
    occurrence: OccurrenceObject | null = null
  ) {
    super(leaf)
    this.plugin = plugin
    this.formBase = new OccurrenceFormBase(plugin, this, occurrence)
  }

  getViewType(): string {
    return OCCURRENCE_FORM_VIEW
  }

  getDisplayText(): string {
    return this.formBase["occurrence"] ? "Edit Occurrence" : "Create Occurrence"
  }

  getIcon(): string {
    return "calendar-range"
  }

  // OccurrenceFormView implementation
  getApp() {
    return this.plugin.app
  }

  getContainer(): HTMLElement {
    const container = this.containerEl.children[1] as HTMLElement
    if (!container) {
      throw new Error("Container not found")
    }
    return container
  }

  getFormContainer(): HTMLElement {
    return this.getContainer().createEl("div", {
      cls: "occurrence-form-view-form",
    })
  }

  getTitleContainerClass(): string {
    return "occurrence-form-view-title-header"
  }

  getSubmitButtonContainerClass(): string | null {
    return null // Submit button goes directly in form container
  }

  handleSuccess(file: TFile): Promise<void> {
    this.leaf.detach()
    return Promise.resolve()
  }

  onOpen(): Promise<void> {
    const container = this.getContainer()
    container.addClass("occurrence-form-view")

    // Header with title field and close button
    const header = container.createEl("div", {
      cls: "occurrence-form-view-header",
    })

    // Create title container in header (form base will find and use it)
    header.createEl("div", {
      cls: "occurrence-form-view-title-header",
    })

    // Close button (X)
    this.closeButton = header.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "Close" },
    })
    setIcon(this.closeButton, "x")
    this.closeButtonHandler = () => {
      this.leaf.detach()
    }
    this.closeButton.addEventListener("click", this.closeButtonHandler)

    // Initialize form (title will be built into the header's title container)
    this.formBase.initializeForm()

    // Focus the title field when form opens
    requestAnimationFrame(() => {
      const titleInput = container.querySelector("#occurrence-title") as HTMLInputElement
      if (titleInput) {
        titleInput.focus()
      }
    })
    return Promise.resolve()
  }

  onClose(): Promise<void> {
    // Remove close button listener
    if (this.closeButton && this.closeButtonHandler) {
      this.closeButton.removeEventListener("click", this.closeButtonHandler)
    }

    this.formBase.cleanupForm()

    const container = this.getContainer()
    if (container) {
      container.empty()
    }
    return Promise.resolve()
  }

}

