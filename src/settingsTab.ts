import { App, PluginSettingTab, Setting, setIcon } from "obsidian"
import OccurrencesPlugin from "./main"
import { MAPPABLE_PROPERTIES } from "./settings"
import { OccurrenceObject } from "./types"
import { FilterMultiSelect } from "@/settingsTab/components/FilterMultiSelect"

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

    containerEl.createEl("p", {
      text: "Configure which frontmatter fields are used for each occurrence property.",
    })

    // Create a setting for each mappable property
    MAPPABLE_PROPERTIES.forEach(property => {
      const setting = new Setting(containerEl)
        .setName(this.getPropertyDisplayName(property))
        .setDesc(this.getPropertyDescription(property))
      
      // Add icon to the name element (prepend so it appears before the text)
      const iconEl = document.createElement('span')
      iconEl.className = 'setting-item-icon'
      setting.nameEl.prepend(iconEl)
      setIcon(iconEl, this.getPropertyIcon(property))
      
      setting.addText(text => {
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

      // Add filter button for file-select properties
      if (['participants', 'topics', 'location'].includes(property)) {
        const filterButton = setting.controlEl.createEl('button', {
          cls: 'clickable-icon',
          attr: { 'aria-label': 'Configure file suggestions filter' },
        })
        setIcon(filterButton, 'filter')
        
        // Type guard to ensure property is a valid key
        const filterKey = property as 'participants' | 'topics' | 'location'
        
        // Create expandable filter section (initially hidden)
        const filterSection = containerEl.createEl('div', {
          cls: 'file-filter-inline',
          attr: { 'data-property': property },
        })
        filterSection.style.display = 'none'
        filterSection.style.marginTop = '8px'
        filterSection.style.marginBottom = '16px'
        filterSection.style.padding = '12px'
        filterSection.style.border = '1px solid var(--background-modifier-border)'
        filterSection.style.borderRadius = '4px'
        filterSection.style.backgroundColor = 'var(--background-secondary)'

        // Enable toggle
        new Setting(filterSection)
          .setName('Enable filtering')
          .setDesc(`Filter file suggestions for ${this.getPropertyDisplayName(property)}`)
          .addToggle(toggle => {
            toggle
              .setValue(this.plugin.settings.fileSelectorFilters[filterKey].enabled ?? false)
              .onChange(async value => {
                this.plugin.settings.fileSelectorFilters[filterKey].enabled = value
                await this.plugin.saveSettings()
                this.updateFilterSectionVisibility(filterSection, value)
                this.updateFilterIconColor(filterButton, value)
              })
          })
        
        // Initialize filter icon color based on enabled state
        this.updateFilterIconColor(
          filterButton,
          this.plugin.settings.fileSelectorFilters[filterKey].enabled ?? false
        )

        // Filter inputs container
        const inputsContainer = filterSection.createEl('div', {
          cls: 'file-filter-inputs',
        })
        inputsContainer.style.display = 'grid'
        inputsContainer.style.gridTemplateColumns = '1fr 1fr'
        inputsContainer.style.gap = '12px'
        inputsContainer.style.marginTop = '12px'

        // Include folders
        const includeFoldersSetting = new Setting(inputsContainer)
          .setName('Include folders')
          .setDesc('Only show files from these folders')
        const includeFoldersContainer = includeFoldersSetting.controlEl.createEl('div')
        new FilterMultiSelect(
          includeFoldersContainer,
          this.app,
          this.plugin.settings.fileSelectorFilters[filterKey].folders?.include || [],
          async (folders: string[]) => {
            this.plugin.settings.fileSelectorFilters[filterKey].folders = {
              ...this.plugin.settings.fileSelectorFilters[filterKey].folders,
              include: folders.length > 0 ? folders : undefined,
            }
            await this.plugin.saveSettings()
          },
          {
            placeholder: 'Type to search folders...',
            icon: 'folder',
            suggestions: this.getAllFolders(),
            pillStyle: 'folder',
          }
        )
        includeFoldersSetting.settingEl.style.gridColumn = '1 / -1'

        // Exclude folders
        const excludeFoldersSetting = new Setting(inputsContainer)
          .setName('Exclude folders')
          .setDesc('Hide files from these folders')
        const excludeFoldersContainer = excludeFoldersSetting.controlEl.createEl('div')
        new FilterMultiSelect(
          excludeFoldersContainer,
          this.app,
          this.plugin.settings.fileSelectorFilters[filterKey].folders?.exclude || [],
          async (folders: string[]) => {
            this.plugin.settings.fileSelectorFilters[filterKey].folders = {
              ...this.plugin.settings.fileSelectorFilters[filterKey].folders,
              exclude: folders.length > 0 ? folders : undefined,
            }
            await this.plugin.saveSettings()
          },
          {
            placeholder: 'Type to search folders...',
            icon: 'folder',
            suggestions: this.getAllFolders(),
            pillStyle: 'folder',
          }
        )
        excludeFoldersSetting.settingEl.style.gridColumn = '1 / -1'

        // Include tags
        const includeTagsSetting = new Setting(inputsContainer)
          .setName('Include tags')
          .setDesc('Only show files with at least one of these tags')
        const includeTagsContainer = includeTagsSetting.controlEl.createEl('div')
        new FilterMultiSelect(
          includeTagsContainer,
          this.app,
          this.plugin.settings.fileSelectorFilters[filterKey].tags?.include || [],
          async (tags: string[]) => {
            this.plugin.settings.fileSelectorFilters[filterKey].tags = {
              ...this.plugin.settings.fileSelectorFilters[filterKey].tags,
              include: tags.length > 0 ? tags : undefined,
            }
            await this.plugin.saveSettings()
          },
          {
            placeholder: 'Type to search tags...',
            icon: 'tags',
            suggestions: this.getAllTags(),
          }
        )
        includeTagsSetting.settingEl.style.gridColumn = '1 / -1'

        // Exclude tags
        const excludeTagsSetting = new Setting(inputsContainer)
          .setName('Exclude tags')
          .setDesc('Hide files with any of these tags')
        const excludeTagsContainer = excludeTagsSetting.controlEl.createEl('div')
        new FilterMultiSelect(
          excludeTagsContainer,
          this.app,
          this.plugin.settings.fileSelectorFilters[filterKey].tags?.exclude || [],
          async (tags: string[]) => {
            this.plugin.settings.fileSelectorFilters[filterKey].tags = {
              ...this.plugin.settings.fileSelectorFilters[filterKey].tags,
              exclude: tags.length > 0 ? tags : undefined,
            }
            await this.plugin.saveSettings()
          },
          {
            placeholder: 'Type to search tags...',
            icon: 'tags',
            suggestions: this.getAllTags(),
          }
        )
        excludeTagsSetting.settingEl.style.gridColumn = '1 / -1'

        // Toggle filter section visibility
        filterButton.addEventListener('click', () => {
          const isVisible = filterSection.style.display !== 'none'
          filterSection.style.display = isVisible ? 'none' : 'block'
          setIcon(filterButton, isVisible ? 'filter' : 'filter')
        })

        // Initialize visibility based on enabled state
        this.updateFilterSectionVisibility(
          filterSection,
          this.plugin.settings.fileSelectorFilters[filterKey].enabled ?? false
        )
      }
    })
  }

  /**
   * Get all unique folder paths from the vault
   */
  private getAllFolders(): string[] {
    const folders = new Set<string>()
    const allFiles = this.app.vault.getMarkdownFiles()
    
    allFiles.forEach(file => {
      const pathParts = file.path.split('/')
      pathParts.pop() // Remove filename
      
      if (pathParts.length > 0) {
        // Add all parent folder paths
        let currentPath = ''
        pathParts.forEach(part => {
          currentPath = currentPath ? `${currentPath}/${part}` : part
          folders.add(currentPath + '/')
        })
      }
    })
    
    return Array.from(folders).sort()
  }

  /**
   * Get all tags from all files in the vault
   */
  private getAllTags(): string[] {
    const tags = new Set<string>()
    const allFiles = this.app.vault.getMarkdownFiles()
    
    allFiles.forEach(file => {
      const fileCache = this.app.metadataCache.getFileCache(file)
      const fileTags = fileCache?.frontmatter?.tags || []
      
      // Handle both array and single tag formats
      if (Array.isArray(fileTags)) {
        fileTags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim()) {
            tags.add(tag.trim())
          }
        })
      } else if (typeof fileTags === 'string' && fileTags.trim()) {
        tags.add(fileTags.trim())
      }
    })
    
    return Array.from(tags).sort()
  }


  /**
   * Get a human-readable display name for a property
   */
  private getPropertyDisplayName(property: keyof OccurrenceObject): string {
    const names: Record<string, string> = {
      occurredAt: "Occurred at",
      toProcess: "To process",
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

  /**
   * Get an icon name for a property
   */
  private getPropertyIcon(property: keyof OccurrenceObject): string {
    const icons: Record<string, string> = {
      occurredAt: "calendar-clock",
      toProcess: "square-check-big",
      participants: "users",
      topics: "lightbulb",
      location: "map-pin",
      tags: "tags",
    }
    return icons[property] || "file"
  }

  /**
   * Update filter section visibility based on enabled state
   */
  private updateFilterSectionVisibility(filterSection: HTMLElement, enabled: boolean): void {
    const inputsContainer = filterSection.querySelector('.file-filter-inputs') as HTMLElement
    if (inputsContainer) {
      inputsContainer.style.display = enabled ? 'grid' : 'none'
    }
  }

  /**
   * Update filter icon color based on enabled state
   */
  private updateFilterIconColor(filterButton: HTMLElement, enabled: boolean): void {
    if (enabled) {
      filterButton.addClass('file-filter-icon-enabled')
    } else {
      filterButton.removeClass('file-filter-icon-enabled')
    }
  }
}
