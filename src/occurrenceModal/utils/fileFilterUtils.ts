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

    return files.filter(file => {
      // Include logic
      if (filterSettings.folders.include?.length) {
        const matches = filterSettings.folders.include.some(folder => {
          const normalizedFolder = folder.endsWith("/") ? folder : folder + "/"
          return file.path.startsWith(normalizedFolder) || file.path === folder
        })
        if (!matches) return false
      }

      // Exclude logic
      if (filterSettings.folders.exclude?.length) {
        const matches = filterSettings.folders.exclude.some(folder => {
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

    return files.filter(file => {
      const fileCache = app.metadataCache.getFileCache(file)
      const fileTags = fileCache?.frontmatter?.tags || []

      // Include: must have at least one tag
      if (filterSettings.tags.include?.length) {
        const hasInclude = filterSettings.tags.include.some(tag =>
          fileTags.includes(tag)
        )
        if (!hasInclude) return false
      }

      // Exclude: must not have any tag
      if (filterSettings.tags.exclude?.length) {
        const hasExclude = filterSettings.tags.exclude.some(tag =>
          fileTags.includes(tag)
        )
        if (hasExclude) return false
      }

      return true
    })
  }
}

