import { Plugin, Platform, WorkspaceLeaf } from "obsidian"
import { OccurrenceStore } from "./occurrenceStore"
import { OCCURRENCES_VIEW, OccurrencesView } from "./occurrencesView"
import { DEFAULT_SETTINGS, OccurrencesPluginSettings } from "./settings"
import { OccurrencesSettingsTab } from "./settingsTab"
import { OccurrenceModal, OccurrenceForm, OCCURRENCE_FORM_VIEW } from "./occurrenceEditor"

export default class OccurrencesPlugin extends Plugin {
  occurrenceStore: OccurrenceStore
  settings: OccurrencesPluginSettings
  // Temporary storage for occurrence when opening form view
  private pendingOccurrence: import("./types").OccurrenceObject | null = null

  async onload() {
    await this.loadSettings()

    this.occurrenceStore = new OccurrenceStore(this.app, this.settings)

    this.addSettingTab(new OccurrencesSettingsTab(this.app, this))

    this.app.workspace.onLayoutReady(() => {
      this.occurrenceStore.load()
    })

    this.addRibbonIcon(
      "calendar-range",
      "Open Occurrences View",
      (evt: MouseEvent) => {
        this.openView()
      }
    )
    // Register Views
    this.registerView(OCCURRENCES_VIEW, leaf => new OccurrencesView(leaf, this))
    // OccurrenceForm - get occurrence from plugin's temporary storage
    this.registerView(OCCURRENCE_FORM_VIEW, leaf => {
      const occurrence = this.pendingOccurrence
      this.pendingOccurrence = null // Clear after use
      return new OccurrenceForm(leaf, this, occurrence)
    })

    // Add Commands
    this.addCommand({
      id: "open-occurrences-view",
      name: "Open Occurrences View",
      callback: () => {
        this.openView()
      },
    })

    // Create Occurrence
    this.addCommand({
      id: "add-occurrence",
      name: "Add Occurrence",
      callback: async () => {
        await this.openOccurrenceForm(null)
      },
    })

    // Obsidian protocol handler for mobile app
    this.registerObsidianProtocolHandler("add-occurrence", async params => {
      await this.openOccurrenceForm(null)
    })
  }

  private async openView(): Promise<void> {
    const { workspace } = this.app

    let leaf: WorkspaceLeaf | null = null
    const leaves = workspace.getLeavesOfType(OCCURRENCES_VIEW)

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0]
    } else {
      // Try to get an existing leaf or create a new one
      leaf = workspace.getLeftLeaf(false)
      if (leaf) {
        await leaf.setViewState({ type: OCCURRENCES_VIEW, active: true })
      }
    }

    if (leaf !== null) {
      // Ensure the sidebar is expanded
      workspace.leftSplit.expand()

      // Reveal the leaf
      workspace.revealLeaf(leaf)

      // Brief timeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  /**
   * Open occurrence form (view on mobile, modal on desktop)
   */
  async openOccurrenceForm(occurrence: import("./types").OccurrenceObject | null): Promise<void> {
    try {
      if (Platform.isMobile || Platform.isMobileApp) {
        const { workspace } = this.app
        // Store occurrence temporarily for view factory to use
        this.pendingOccurrence = occurrence
        const leaf = workspace.getLeaf(true)
        await leaf.setViewState({ type: OCCURRENCE_FORM_VIEW, active: true })
        workspace.revealLeaf(leaf)
      } else {
        new OccurrenceModal(this, occurrence).open()
      }
    } catch (error) {
      console.error("Failed to open occurrence form:", error)
      this.pendingOccurrence = null // Clear on error
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  onunload() {}
}
