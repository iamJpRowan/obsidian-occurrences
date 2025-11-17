import { App, PluginSettingTab, Setting } from "obsidian"
import OccurrencesPlugin from "./main"
import { DEFAULT_SETTINGS, MAPPABLE_PROPERTIES, OccurrencesPluginSettings } from "./settings"
import { OccurrenceObject } from "./types"

/**
 * Settings tab for the Occurrences plugin
 */
export class OccurrencesSettingsTab extends PluginSettingTab {
  plugin: OccurrencesPlugin

  constructor(app: App, plugin: OccurrencesPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    containerEl.createEl("h2", { text: "Occurrences Plugin Settings" })

    containerEl.createEl("p", {
      text: "Configure which frontmatter fields are used for each occurrence property.",
    })

    // Property mapping settings
    containerEl.createEl("h3", { text: "Property Mapping" })

    containerEl.createEl("p", {
      text: "Map OccurrenceObject properties to frontmatter field names. These determine which frontmatter fields are read when creating occurrence objects.",
      cls: "setting-item-description",
    })

    // Create a setting for each mappable property
    MAPPABLE_PROPERTIES.forEach(property => {
      new Setting(containerEl)
        .setName(this.getPropertyDisplayName(property))
        .setDesc(this.getPropertyDescription(property))
        .addText(text => {
          text
            .setPlaceholder("Enter frontmatter field name")
            .setValue(this.plugin.settings.propertyMapping[property] || "")
            .onChange(async value => {
              this.plugin.settings.propertyMapping[property] = value
              await this.plugin.saveSettings()
              // Update store settings and reload to apply new mappings
              this.plugin.occurrenceStore.updateSettings(this.plugin.settings)
              await this.plugin.occurrenceStore.load()
            })
        })
    })

    // Reset to defaults button
    new Setting(containerEl)
      .setName("Reset to Defaults")
      .setDesc("Reset all property mappings to their default values")
      .addButton(button => {
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.propertyMapping = {
            ...DEFAULT_SETTINGS.propertyMapping,
          }
          await this.plugin.saveSettings()
          // Update store settings and reload to apply new mappings
          this.plugin.occurrenceStore.updateSettings(this.plugin.settings)
          await this.plugin.occurrenceStore.load()
          this.display() // Refresh the UI
        })
      })
  }

  /**
   * Get a human-readable display name for a property
   */
  private getPropertyDisplayName(property: keyof OccurrenceObject): string {
    const names: Record<string, string> = {
      occurredAt: "Occurred At",
      toProcess: "To Process",
      participants: "Participants",
      topics: "Topics",
      location: "Location",
      tags: "Tags",
    }
    return names[property] || property
  }

  /**
   * Get a description for a property
   */
  private getPropertyDescription(property: keyof OccurrenceObject): string {
    const descriptions: Record<string, string> = {
      occurredAt: "The frontmatter field name for the occurrence date/time",
      toProcess: "The frontmatter field name for the to-process flag",
      participants: "The frontmatter field name for participants (array of links)",
      topics: "The frontmatter field name for topics (array of links)",
      location: "The frontmatter field name for location (single link)",
      tags: "The frontmatter field name for tags (array of strings)",
    }
    return descriptions[property] || `The frontmatter field name for ${property}`
  }
}

