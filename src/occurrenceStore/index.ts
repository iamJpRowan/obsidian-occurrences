import { OccurrenceObject } from "@/types"
import { App, TFile } from "obsidian"
import { OccurrencesPluginSettings } from "@/settings"
import { EventHandler } from "./eventHandler"
import { FileOperations } from "./fileOperations"
import { OccurrenceSearch, SearchOptions, SearchResult } from "./search"
import { StoreOperations } from "./storeOperations"

/**
 * Store for managing Occurrence objects
 * Provides functionality for loading, managing, and processing occurrence collections
 */
export class OccurrenceStore {
  protected items: Map<string, OccurrenceObject> = new Map()
  protected isLoading: boolean = false
  private searchService: OccurrenceSearch
  public fileOps: FileOperations
  private storeOps: StoreOperations
  private eventHandler: EventHandler
  private settings: OccurrencesPluginSettings

  constructor(protected app: App, settings: OccurrencesPluginSettings) {
    this.settings = settings
    this.searchService = new OccurrenceSearch(app, this.items)
    this.fileOps = new FileOperations(app, settings)
    this.storeOps = new StoreOperations(this.items, this.searchService, null) // Will be set after eventHandler
    this.eventHandler = new EventHandler(app, this.fileOps, this.storeOps)
    this.storeOps.eventHandler = this.eventHandler // Fix the circular reference
    this.eventHandler.registerEvents()
  }

  /**
   * Update settings and reload the store
   */
  public updateSettings(settings: OccurrencesPluginSettings): void {
    this.settings = settings
    this.fileOps.updateSettings(settings)
  }

  /**
   * Load occurrences from the vault
   */
  public load(): void {
    if (this.isLoading) return

    this.isLoading = true

    try {
      this.items.clear()
      this.searchService.clear()

      const files = this.app.vault
        .getMarkdownFiles()
        .filter(file => this.fileOps.isRelevantFile(file.path))

      for (const file of files) {
        const processedItem = this.fileOps.processFile(file)
        if (processedItem) {
          this.items.set(file.path, processedItem)
          this.searchService.updateIndexes(processedItem, "add")
        }
      }
    } catch (error) {
      // Error type is unknown in catch blocks
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Error objects in catch blocks are type-unsafe
      console.error(`Error loading OccurrenceStore`, error)
    } finally {
      this.isLoading = false
      this.eventHandler.trigger("loaded")
    }
  }

  /**
   * Get an occurrence by its file path
   */
  public get(path: string): OccurrenceObject | undefined {
    return this.items.get(path)
  }

  /**
   * Add an occurrence to the store
   * @param file The file to add to the store
   * @emits added { OccurrenceObject } - The occurrence that was created
   */
  public add(file: TFile): void {
    if (!this.fileOps.isRelevantFile(file.path)) {
      return
    }
    const item = this.fileOps.processFile(file)
    if (!item) {
      return
    }
    this.storeOps.addOccurrence(item)
  }

  /**
   * Remove an occurrence by its file path
   * @param path The file path of the occurrence to delete
   * @emits deleted { string } - The path of the occurrence that was deleted
   */
  public remove(path: string): void {
    this.storeOps.removeOccurrenceFromPath(path)
  }

  /**
   * Check if the store has been loaded
   */
  public get isLoaded(): boolean {
    return !this.isLoading && this.items.size > 0
  }

  /**
   * Search occurrences with advanced filtering and pagination
   */
  public search(options: SearchOptions = {}): SearchResult {
    return this.searchService.search(options)
  }

  /**
   * Get all tags with their occurrence counts
   */
  public getAllTags(): Map<string, number> {
    return this.searchService.getAllTags()
  }

  /**
   * Subscribe to store events
   * Event callbacks can have various argument types
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event system requires flexible callback signatures
  public on(event: string, callback: (...args: any[]) => void) {
    return this.eventHandler.on(event, callback)
  }

  /**
   * Unsubscribe from store events
   * Event callbacks can have various argument types
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event system requires flexible callback signatures
  public off(event: string, callback: (...args: any[]) => void) {
    this.eventHandler.off(event, callback)
  }

  /**
   * Trigger store events
   * Event arguments can be of various types
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event system requires flexible argument types
  public trigger(event: string, ...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Event arguments are validated but type-unsafe
    this.eventHandler.trigger(event, ...args)
  }
}
