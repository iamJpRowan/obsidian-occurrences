import { Modal, TFile } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { OccurrenceFormBase, OccurrenceFormView } from "../core/OccurrenceFormBase"

/**
 * Modal view for creating/editing occurrences
 */
export class OccurrenceModal extends Modal implements OccurrenceFormView {
  private formBase: OccurrenceFormBase

  constructor(plugin: OccurrencesPlugin, occurrence: OccurrenceObject | null = null) {
    super(plugin.app)
    this.formBase = new OccurrenceFormBase(plugin, this, occurrence)
  }

  // OccurrenceFormView implementation
  getApp() {
    return this.app
  }

  getContainer(): HTMLElement {
    return this.contentEl
  }

  getFormContainer(): HTMLElement {
    return this.contentEl.createEl("div", {
      cls: "occurrence-modal-form",
    })
  }

  getTitleContainerClass(): string {
    return "occurrence-modal-title-header"
  }

  getSubmitButtonContainerClass(): string | null {
    return "occurrence-modal-actions"
  }

  async handleSuccess(file: TFile): Promise<void> {
    this.close()
  }

  onOpen() {
    const { contentEl } = this
    contentEl.addClass("occurrence-modal")
    this.formBase.initializeForm()
  }

  onClose() {
    this.formBase.cleanupForm()
    const { contentEl } = this
    contentEl.empty()
  }
}
