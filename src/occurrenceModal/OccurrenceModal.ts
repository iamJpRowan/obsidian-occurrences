import { Modal, TFile } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { TagSelector } from "@/occurrencesView/components/tagSelector"
import { SingleFileSelector } from "./components/SingleFileSelector"
import { MultiFileSelector } from "./components/MultiFileSelector"
import { OCCURRENCE_DATE_FORMAT } from "@/types"
import { getFrontmatterFieldName } from "@/settings"

export interface OccurrenceFormData {
  title: string
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
    // Convert link targets to full file paths (add .md if needed)
    this.formData = {
      title: occurrence?.title || "",
      tags: occurrence?.tags || [],
      location: occurrence?.location?.target
        ? this.ensureFullPath(occurrence.location.target)
        : null,
      participants:
        occurrence?.participants.map(p => this.ensureFullPath(p.target)) || [],
      topics: occurrence?.topics.map(t => this.ensureFullPath(t.target)) || [],
    }
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass("occurrence-modal")

    // Create error message container
    this.errorMessage = contentEl.createEl("div", {
      cls: "occurrence-modal-error",
    })
    this.errorMessage.style.display = "none"

    // Create form container
    const formContainer = contentEl.createEl("div", {
      cls: "occurrence-modal-form",
    })

    // Title field
    const titleContainer = formContainer.createEl("div", {
      cls: "occurrence-modal-field",
    })
    titleContainer.createEl("label", {
      text: "Title",
      attr: { for: "occurrence-title" },
    })
    this.titleInput = titleContainer.createEl("input", {
      type: "text",
      attr: {
        id: "occurrence-title",
        placeholder: "Enter occurrence title...",
      },
    }) as HTMLInputElement
    this.titleInput.value = this.formData.title

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
      (filePath: string | null) => {
        this.formData.location = filePath
      },
      {
        placeholder: "Select location...",
        allowCreate: true,
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
      (filePaths: string[]) => {
        this.formData.participants = filePaths
      },
      {
        placeholder: "Add participants...",
        allowCreate: true,
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
      (filePaths: string[]) => {
        this.formData.topics = filePaths
      },
      {
        placeholder: "Add topics...",
        allowCreate: true,
      }
    )
    if (this.formData.topics.length > 0) {
      this.topicsSelector.setValue(this.formData.topics)
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

    // Validate
    if (!this.formData.title) {
      this.showError("Title is required")
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
    const now = new Date()
    const datePrefix = this.formatDatePrefix(now, OCCURRENCE_DATE_FORMAT)
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

    // Create frontmatter
    const frontmatter: Record<string, any> = {
      [occurredAtField]: this.formatDateForFrontmatter(now),
      [toProcessField]: false,
    }

    // Add tags
    if (formData.tags.length > 0) {
      frontmatter.tags = formData.tags
    }

    // Add location
    if (formData.location) {
      // Ensure location file exists if it's a new path
      await this.ensureFileExists(formData.location)
      // Use just the filename for wikilink
      const locationName = this.getFilenameForWikilink(formData.location)
      frontmatter[locationField] = `[[${locationName}]]`
    }

    // Add participants
    if (formData.participants.length > 0) {
      // Ensure participant files exist
      for (const participantPath of formData.participants) {
        await this.ensureFileExists(participantPath)
      }
      frontmatter[participantsField] = formData.participants.map(
        p => `[[${this.getFilenameForWikilink(p)}]]`
      )
    }

    // Add topics
    if (formData.topics.length > 0) {
      // Ensure topic files exist
      for (const topicPath of formData.topics) {
        await this.ensureFileExists(topicPath)
      }
      frontmatter[topicsField] = formData.topics.map(t => `[[${this.getFilenameForWikilink(t)}]]`)
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

    // Update title (which affects filename if date prefix exists)
    const occurredAtField = getFrontmatterFieldName("occurredAt", this.plugin.settings)
    const occurredAt = updatedFrontmatter[occurredAtField]
    
    if (occurredAt) {
      const date = new Date(occurredAt)
      const datePrefix = this.formatDatePrefix(date, OCCURRENCE_DATE_FORMAT)
      const newFileName = `${datePrefix} ${formData.title}.md`
      const newFilePath = `Occurrences/${newFileName}`

      // Rename file if title changed
      if (newFilePath !== file.path) {
        if (app.vault.getAbstractFileByPath(newFilePath)) {
          throw new Error(`File "${newFileName}" already exists`)
        }
        await app.vault.rename(file, newFilePath)
      }
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
      const locationName = this.getFilenameForWikilink(formData.location)
      updatedFrontmatter[locationField] = `[[${locationName}]]`
    } else {
      delete updatedFrontmatter[locationField]
    }

    // Update participants
    if (formData.participants.length > 0) {
      for (const participantPath of formData.participants) {
        await this.ensureFileExists(participantPath)
      }
      updatedFrontmatter[participantsField] = formData.participants.map(
        p => `[[${this.getFilenameForWikilink(p)}]]`
      )
    } else {
      delete updatedFrontmatter[participantsField]
    }

    // Update topics
    if (formData.topics.length > 0) {
      for (const topicPath of formData.topics) {
        await this.ensureFileExists(topicPath)
      }
      updatedFrontmatter[topicsField] = formData.topics.map(t => `[[${this.getFilenameForWikilink(t)}]]`)
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

  private async ensureFileExists(filePath: string): Promise<void> {
    const { app } = this
    // Ensure path has .md extension
    const normalizedPath = filePath.endsWith(".md") ? filePath : `${filePath}.md`
    const file = app.vault.getAbstractFileByPath(normalizedPath)

    if (!file) {
      // Create the file if it doesn't exist
      // Ensure parent directory exists
      const pathParts = normalizedPath.split("/")
      pathParts.pop() // Remove filename
      const folderPath = pathParts.join("/")

      if (folderPath) {
        const folder = app.vault.getAbstractFileByPath(folderPath)
        if (!folder) {
          await app.vault.createFolder(folderPath)
        }
      }

      // Create empty markdown file
      await app.vault.create(normalizedPath, "")
    }
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

  private formatDateForFrontmatter(date: Date): string {
    const localISOTime = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, -1)

    const offset = date.getTimezoneOffset()
    const offsetHours = Math.floor(Math.abs(offset) / 60)
    const offsetMinutes = Math.abs(offset) % 60
    const offsetSign = offset <= 0 ? "+" : "-"
    const offsetString = `${offsetSign}${offsetHours
      .toString()
      .padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`

    return localISOTime + offsetString
  }

  private formatFrontmatter(frontmatter: Record<string, any>): string {
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

  private removeMdExtension(path: string): string {
    return path.endsWith(".md") ? path.slice(0, -3) : path
  }

  /**
   * Extract just the filename (without path and .md extension) for wikilinks
   */
  private getFilenameForWikilink(filePath: string): string {
    // Remove .md extension if present
    const withoutExt = this.removeMdExtension(filePath)
    // Extract just the filename (basename) from the path
    const pathParts = withoutExt.split("/")
    return pathParts[pathParts.length - 1]
  }

  private ensureFullPath(path: string): string {
    // If path doesn't have .md extension, try to find the file
    if (!path.endsWith(".md")) {
      const file = this.app.vault.getAbstractFileByPath(`${path}.md`)
      if (file) {
        return file.path
      }
      // If file doesn't exist, return path with .md
      return `${path}.md`
    }
    return path
  }

  private formatYamlValue(value: any): string {
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

