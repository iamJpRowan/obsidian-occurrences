import { App, TFile } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject, OCCURRENCE_DATE_FORMAT } from "@/types"
import { OccurrenceFormData } from "../core/OccurrenceFormBase"
import { getFrontmatterFieldName } from "@/settings"
import {
  timezoneOffsetToISOString,
  parseTimezoneOffset,
} from "./timezoneUtils"

/**
 * Shared utilities for occurrence file operations
 * Used by both OccurrenceModal and OccurrenceForm
 */
export class OccurrenceFileOperations {
  /**
   * Extract basename from a link target (which may be a basename or path)
   * If it's a path, extract the basename; otherwise return as-is
   */
  static extractBasename(target: string): string {
    // If target contains a slash, it's a path - extract basename
    if (target.includes("/")) {
      const pathParts = target.split("/")
      const lastPart = pathParts[pathParts.length - 1]
      // Remove .md extension if present
      return lastPart.endsWith(".md") ? lastPart.slice(0, -3) : lastPart
    }
    // Otherwise, assume it's already a basename
    // Remove .md extension if present
    return target.endsWith(".md") ? target.slice(0, -3) : target
  }

  /**
   * Ensure a file exists, creating it if necessary
   * @param app Obsidian app instance
   * @param basename The basename of the file (without extension or path)
   */
  static async ensureFileExists(app: App, basename: string): Promise<void> {
    // basename is expected to be just the filename without extension
    // Try to find the file by searching all markdown files
    const allFiles = app.vault.getMarkdownFiles()
    const file = allFiles.find(f => f.basename === basename)

    if (!file) {
      // File doesn't exist, create it in the root
      // Create empty markdown file with basename
      const filePath = `${basename}.md`
      await app.vault.create(filePath, "")
    }
  }

  /**
   * Format date prefix for filename
   */
  static formatDatePrefix(date: Date, format: string): string {
    return format
      .replace("YYYY", date.getFullYear().toString())
      .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
      .replace("DD", String(date.getDate()).padStart(2, "0"))
      .replace("HH", String(date.getHours()).padStart(2, "0"))
      .replace("mm", String(date.getMinutes()).padStart(2, "0"))
      .replace("ss", String(date.getSeconds()).padStart(2, "0"))
  }

  /**
   * Format date for frontmatter with timezone offset
   */
  static formatDateForFrontmatter(date: Date, timezoneOffset?: string | null): string {
    // Determine offset string to use
    let offsetString = timezoneOffset || timezoneOffsetToISOString(date.getTimezoneOffset())
    
    // Validate offset format
    let offsetMinutes = parseTimezoneOffset(offsetString)
    if (offsetMinutes === null) {
      // Fallback to date's timezone
      offsetString = timezoneOffsetToISOString(date.getTimezoneOffset())
      offsetMinutes = parseTimezoneOffset(offsetString)
      if (offsetMinutes === null) {
        // Last resort: use ISO string without timezone
        return date.toISOString().slice(0, -1) + "Z"
      }
    }

    // Calculate local time in the specified timezone
    const localTime = new Date(date.getTime() + offsetMinutes * 60000)
    
    // Format as ISO string
    const year = localTime.getUTCFullYear()
    const month = String(localTime.getUTCMonth() + 1).padStart(2, "0")
    const day = String(localTime.getUTCDate()).padStart(2, "0")
    const hours = String(localTime.getUTCHours()).padStart(2, "0")
    const minutes = String(localTime.getUTCMinutes()).padStart(2, "0")
    const seconds = String(localTime.getUTCSeconds()).padStart(2, "0")
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`
  }

  /**
   * Format frontmatter object to YAML string
   */
  static formatFrontmatter(frontmatter: Record<string, string | string[] | boolean | number>): string {
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

  /**
   * Format a single YAML value
   */
  static formatYamlValue(value: string | string[] | boolean | number): string {
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

  /**
   * Create a new occurrence file
   */
  static async createOccurrence(
    app: App,
    plugin: OccurrencesPlugin,
    formData: OccurrenceFormData,
    timezoneOffset: string | null
  ): Promise<TFile> {
    // Ensure Occurrences directory exists
    const occurrencesFolder = "Occurrences"
    const folder = app.vault.getAbstractFileByPath(occurrencesFolder)
    if (!folder) {
      await app.vault.createFolder(occurrencesFolder)
    }

    // Generate filename with date prefix
    const occurredAt = formData.occurredAt || new Date()
    const datePrefix = this.formatDatePrefix(occurredAt, OCCURRENCE_DATE_FORMAT)
    const fileName = `${datePrefix} ${formData.title}.md`
    const filePath = `${occurrencesFolder}/${fileName}`

    // Check if file already exists
    if (app.vault.getAbstractFileByPath(filePath)) {
      throw new Error(`File "${fileName}" already exists`)
    }

    // Get frontmatter field names from settings
    const occurredAtField = getFrontmatterFieldName("occurredAt", plugin.settings)
    const toProcessField = getFrontmatterFieldName("toProcess", plugin.settings)
    const locationField = getFrontmatterFieldName("location", plugin.settings)
    const participantsField = getFrontmatterFieldName("participants", plugin.settings)
    const topicsField = getFrontmatterFieldName("topics", plugin.settings)

    // Create frontmatter
    const frontmatter: Record<string, string | string[] | boolean | number> = {
      [occurredAtField]: this.formatDateForFrontmatter(occurredAt, timezoneOffset),
      [toProcessField]: formData.toProcess,
    }

    // Add tags
    if (formData.tags.length > 0) {
      frontmatter.tags = formData.tags
    }

    // Add location
    if (formData.location) {
      await this.ensureFileExists(app, formData.location)
      frontmatter[locationField] = `[[${formData.location}]]`
    }

    // Add participants
    if (formData.participants.length > 0) {
      for (const participantBasename of formData.participants) {
        await this.ensureFileExists(app, participantBasename)
      }
      frontmatter[participantsField] = formData.participants.map(p => `[[${p}]]`)
    }

    // Add topics
    if (formData.topics.length > 0) {
      for (const topicBasename of formData.topics) {
        await this.ensureFileExists(app, topicBasename)
      }
      frontmatter[topicsField] = formData.topics.map(t => `[[${t}]]`)
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

  /**
   * Update an existing occurrence file
   */
  static async updateOccurrence(
    app: App,
    plugin: OccurrencesPlugin,
    occurrence: OccurrenceObject,
    formData: OccurrenceFormData,
    timezoneOffset: string | null
  ): Promise<TFile> {
    const file = occurrence.file

    // Read current file content
    const content = await app.vault.read(file)
    const fileCache = app.metadataCache.getFileCache(file)
    const frontmatter = fileCache?.frontmatter ?? {}

    // Update frontmatter
    const updatedFrontmatter = { ...frontmatter }

    // Update occurredAt
    const occurredAtField = getFrontmatterFieldName("occurredAt", plugin.settings)
    const occurredAt = formData.occurredAt || new Date()
    updatedFrontmatter[occurredAtField] = this.formatDateForFrontmatter(occurredAt, timezoneOffset)
    
    // Update filename if date or title changed
    const datePrefix = this.formatDatePrefix(occurredAt, OCCURRENCE_DATE_FORMAT)
    const newFileName = `${datePrefix} ${formData.title}.md`
    const newFilePath = `Occurrences/${newFileName}`

    // Rename file if path changed
    if (newFilePath !== file.path) {
      if (app.vault.getAbstractFileByPath(newFilePath)) {
        throw new Error(`File "${newFileName}" already exists`)
      }
      await app.vault.rename(file, newFilePath)
    }

    // Update tags
    if (formData.tags.length > 0) {
      updatedFrontmatter.tags = formData.tags
    } else {
      delete updatedFrontmatter.tags
    }

    // Get frontmatter field names from settings
    const toProcessField = getFrontmatterFieldName("toProcess", plugin.settings)
    const locationField = getFrontmatterFieldName("location", plugin.settings)
    const participantsField = getFrontmatterFieldName("participants", plugin.settings)
    const topicsField = getFrontmatterFieldName("topics", plugin.settings)

    // Update toProcess
    updatedFrontmatter[toProcessField] = formData.toProcess

    // Update location
    if (formData.location) {
      await this.ensureFileExists(app, formData.location)
      updatedFrontmatter[locationField] = `[[${formData.location}]]`
    } else {
      delete updatedFrontmatter[locationField]
    }

    // Update participants
    if (formData.participants.length > 0) {
      for (const participantBasename of formData.participants) {
        await this.ensureFileExists(app, participantBasename)
      }
      updatedFrontmatter[participantsField] = formData.participants.map(p => `[[${p}]]`)
    } else {
      delete updatedFrontmatter[participantsField]
    }

    // Update topics
    if (formData.topics.length > 0) {
      for (const topicBasename of formData.topics) {
        await this.ensureFileExists(app, topicBasename)
      }
      updatedFrontmatter[topicsField] = formData.topics.map(t => `[[${t}]]`)
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
}

