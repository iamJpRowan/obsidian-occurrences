import { App, TFile } from "obsidian"
import { FileSelectorFilterSettings } from "@/settings"

/**
 * Utility functions for filtering files based on folder and tag settings
 */
export class FileFilterUtils {
  /**
   * Apply folder filters to file list
   */
  static applyFolderFilters(
    files: TFile[],
    filterSettings: FileSelectorFilterSettings | null
  ): TFile[] {
    if (!filterSettings?.enabled || !filterSettings.folders) {
      return files
    }

    const folders = filterSettings.folders
    return files.filter(file => {
      // Include logic
      if (folders.include?.length) {
        const matches = folders.include.some(folder => {
          const normalizedFolder = folder.endsWith("/") ? folder : folder + "/"
          return file.path.startsWith(normalizedFolder) || file.path === folder
        })
        if (!matches) return false
      }

      // Exclude logic
      if (folders.exclude?.length) {
        const matches = folders.exclude.some(folder => {
          const normalizedFolder = folder.endsWith("/") ? folder : folder + "/"
          return file.path.startsWith(normalizedFolder) || file.path === folder
        })
        if (matches) return false
      }

      return true
    })
  }

  /**
   * Apply tag filters to file list
   */
  static applyTagFilters(
    files: TFile[],
    filterSettings: FileSelectorFilterSettings | null,
    app: App
  ): TFile[] {
    if (!filterSettings?.enabled || !filterSettings.tags) {
      return files
    }

    const tags = filterSettings.tags
    return files.filter(file => {
      const fileCache = app.metadataCache.getFileCache(file)
      const frontmatter = fileCache?.frontmatter as Record<string, unknown> | undefined
      const fileTagsRaw = frontmatter?.tags
      const fileTags = Array.isArray(fileTagsRaw) 
        ? fileTagsRaw.filter((tag): tag is string => typeof tag === "string")
        : []

      // Include: must have at least one tag
      if (tags.include?.length) {
        const hasInclude = tags.include.some(tag =>
          fileTags.includes(tag)
        )
        if (!hasInclude) return false
      }

      // Exclude: must not have any tag
      if (tags.exclude?.length) {
        const hasExclude = tags.exclude.some(tag =>
          fileTags.includes(tag)
        )
        if (hasExclude) return false
      }

      return true
    })
  }
}

