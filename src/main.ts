import { Plugin, WorkspaceLeaf } from "obsidian"
import { OccurrenceStore } from "./occurrenceStore"
import { OCCURRENCES_VIEW, OccurrencesView } from "./occurrencesView"
import { DEFAULT_SETTINGS, OccurrencesPluginSettings } from "./settings"
import { OccurrencesSettingsTab } from "./settingsTab"
import { OccurrenceModal } from "./occurrenceModal/OccurrenceModal"

export default class OccurrencesPlugin extends Plugin {
  occurrenceStore: OccurrenceStore
  settings: OccurrencesPluginSettings

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
    // Register View
    this.registerView(OCCURRENCES_VIEW, leaf => new OccurrencesView(leaf, this))

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
      callback: () => {
        try {
          new OccurrenceModal(this).open()
        } catch (error) {
          console.error("Failed to create Occurrence:", error)
        }
      },
    })

    // TODO: Update mobile app to use add-occurrence
    this.registerObsidianProtocolHandler("add-occurrence", params => {
      // new OccurrenceModal(this, params as Partial<OccurrenceObject>, file => {
      //   this.app.workspace.openLinkText(file.path, "", false)
      // }).open()
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

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  onunload() {}
}
