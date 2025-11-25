import { App, Component, debounce, setIcon, TFile } from "obsidian"
import { FileSelectorFilterSettings } from "@/settings"
import { FileFilterUtils } from "../utils/fileFilterUtils"
import { SuggestionUtils } from "../utils/suggestionUtils"

export interface SingleFileSelectorOptions {
  placeholder?: string
  debounceMs?: number
  allowCreate?: boolean
  filterSettings?: FileSelectorFilterSettings
}

export interface FileSuggestion {
  file: TFile | null
  displayName: string
  fullPath: string
  isNew?: boolean
}

export class SingleFileSelector extends Component {
  private fileContainer: HTMLElement
  private fileInputContainer: HTMLElement
  private fileInput: HTMLInputElement
  private fileClear: HTMLElement
  private suggestionsContainer: HTMLElement
  private suggestionsList: HTMLElement
  private onFileChange: (basename: string | null) => void
  private debouncedSearchChange: (query: string) => void
  private options: SingleFileSelectorOptions
  private app: App
  private filterSettings: FileSelectorFilterSettings | null = null
  private selectedFile: TFile | null = null
  private suggestions: FileSuggestion[] = []
  private selectedSuggestionIndex: number = -1
  private visible: boolean = false
  private blurTimeout: number | null = null

  constructor(
    container: HTMLElement,
    app: App,
    onFileChange: (basename: string | null) => void,
    options: SingleFileSelectorOptions = {}
  ) {
    super()
    this.app = app
    this.options = {
      placeholder: "Select file...",
      debounceMs: 300,
      allowCreate: true,
      ...options,
    }
    this.filterSettings = options.filterSettings || null
    this.onFileChange = onFileChange
    this.debouncedSearchChange = debounce((query: string) => {
      this.searchFiles(query)
    }, this.options.debounceMs ?? 300)
    this.render(container)
  }

  private render(container: HTMLElement): void {
    // Create file container
    this.fileContainer = container.createEl("div", {
      cls: "occurrence-modal-file-container",
    })

    // Create file input container
    this.fileInputContainer = this.fileContainer.createEl("div", {
      cls: "occurrence-modal-file-input-container",
    })

    // Create link icon
    const linkIcon = this.fileInputContainer.createEl("div", {
      cls: "occurrence-modal-file-input-icon",
    })
    setIcon(linkIcon, "link")

    // Create input wrapper
    const inputWrapper = this.fileInputContainer.createEl("div", {
      cls: "occurrence-modal-file-input-wrapper",
    })

    // Create file input
    this.fileInput = inputWrapper.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder ?? "Select file...",
      attr: {
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.fileInput.classList.add("occurrence-modal-file-input")

    // Create clear button
    this.fileClear = inputWrapper.createEl("div", {
      cls: "occurrence-modal-clear-button",
      attr: {
        "aria-label": "Clear file selection",
      },
    })
    this.fileClear.style.display = "none"

    // Create suggestions container
    this.suggestionsContainer = this.fileContainer.createEl("div", {
      cls: "occurrence-modal-file-suggestions-container",
    })
    this.suggestionsContainer.style.display = "none"

    this.suggestionsList = this.suggestionsContainer.createEl("div", {
      cls: "occurrence-modal-file-suggestions-list",
    })

    // Add input event listeners
    this.registerDomEvent(this.fileInput, "input", e => {
      const target = e.target as HTMLInputElement
      this.updateClearButton(target.value)
      this.debouncedSearchChange(target.value)
    })

    this.registerDomEvent(this.fileInput, "focus", () => {
      // Only show suggestions if user has started typing
      if (this.fileInput.value.trim().length > 0) {
        this.showSuggestions()
      }
    })

    this.registerDomEvent(this.fileInput, "blur", () => {
      if (this.blurTimeout !== null) {
        clearTimeout(this.blurTimeout)
      }
      this.blurTimeout = window.setTimeout(() => {
        this.hideSuggestions()
        this.blurTimeout = null
      }, 200)
    })

    this.registerDomEvent(this.fileInput, "keydown", e => {
      this.handleKeydown(e)
    })

    // Add clear button event listener
    this.registerDomEvent(this.fileClear, "click", () => {
      this.clearSelection()
    })

    // Add suggestions click listeners
    this.registerDomEvent(this.suggestionsList, "click", e => {
      const target = e.target as HTMLElement
      const suggestionEl = target.closest(".occurrence-modal-file-suggestion")
      if (suggestionEl) {
        const index = parseInt(suggestionEl.getAttribute("data-index") || "0")
        this.selectSuggestion(index)
      }
    })
  }

  /**
   * Search for files matching the query
   */
  private searchFiles(query: string): void {
    if (!query.trim()) {
      this.showAllFiles()
      return
    }

    const allFiles = this.app.vault.getMarkdownFiles()
    const queryLower = query.toLowerCase()

    // Apply filters in optimized order: folders → tags → query
    let filtered = FileFilterUtils.applyFolderFilters(allFiles, this.filterSettings)
    filtered = FileFilterUtils.applyTagFilters(filtered, this.filterSettings, this.app)
    
    filtered = filtered.filter((file: TFile) => {
      const name = file.name.toLowerCase()
      const path = file.path.toLowerCase()
      return name.includes(queryLower) || path.includes(queryLower)
    })

    this.suggestions = filtered.map((file: TFile) => ({
      file,
      displayName: file.basename,
      fullPath: file.path,
      isNew: false,
    }))

    // Add "Create new" option if allowCreate is true and query doesn't match existing file
    if (this.options.allowCreate && query.trim()) {
      const queryBasename = query.trim()
      const exactMatch = this.suggestions.some(
        s => s.file?.basename.toLowerCase() === queryBasename.toLowerCase()
      )
      if (!exactMatch) {
        this.suggestions.push({
          file: null,
          displayName: `Create "${queryBasename}"`,
          fullPath: queryBasename, // Store basename for new files
          isNew: true,
        })
      }
    }

    this.renderSuggestions()
  }

  /**
   * Show all files
   */
  private showAllFiles(): void {
    const allFiles = this.app.vault.getMarkdownFiles()
    
    // Apply filters
    let filtered = FileFilterUtils.applyFolderFilters(allFiles, this.filterSettings)
    filtered = FileFilterUtils.applyTagFilters(filtered, this.filterSettings, this.app)
    
    this.suggestions = filtered.map((file: TFile) => ({
      file,
      displayName: file.basename,
      fullPath: file.path,
      isNew: false,
    }))
    this.renderSuggestions()
  }

  /**
   * Render suggestions list
   */
  private renderSuggestions(): void {
    this.suggestionsList.empty()
    this.selectedSuggestionIndex = -1

    if (this.suggestions.length === 0) {
      this.hideSuggestions()
      return
    }

    this.selectedSuggestionIndex = 0

    this.suggestions.forEach((suggestion, index) => {
      const suggestionEl = this.suggestionsList.createEl("div", {
        cls: "occurrence-modal-file-suggestion",
        attr: { "data-index": index.toString() },
      })

      if (suggestion.isNew) {
        suggestionEl.addClass("is-new")
        const icon = suggestionEl.createEl("span", {
          cls: "occurrence-modal-file-suggestion-icon",
        })
        setIcon(icon, "plus")
      }

      suggestionEl.createEl("div", {
        cls: "occurrence-modal-file-suggestion-name",
        text: suggestion.displayName,
      })

      if (!suggestion.isNew && suggestion.file) {
        const pathParts = suggestion.fullPath.split("/")
        pathParts.pop()
        const pathText = pathParts.join("/") + "/"
        suggestionEl.createEl("div", {
          cls: "occurrence-modal-file-suggestion-path",
          text: pathText,
        })
      }
    })

    this.updateSuggestionHighlight()
    this.showSuggestions()
  }

  /**
   * Select a suggestion
   */
  private selectSuggestion(index: number): void {
    if (index < 0 || index >= this.suggestions.length) return

    const suggestion = this.suggestions[index]

    if (suggestion.isNew) {
      // Create new file - fullPath contains the basename
      this.selectedFile = null
      this.fileInput.value = suggestion.fullPath
      this.updateClearButton(this.fileInput.value)
      this.hideSuggestions()
      this.onFileChange(suggestion.fullPath) // Pass basename
    } else if (suggestion.file) {
      // Select existing file
      this.selectedFile = suggestion.file
      this.fileInput.value = suggestion.displayName // Already basename
      this.updateClearButton(this.fileInput.value)
      this.hideSuggestions()
      this.onFileChange(suggestion.file.basename) // Pass basename
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (this.suggestionsContainer.style.display === "none") return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.suggestions.length - 1
        )
        this.updateSuggestionHighlight()
        break
      case "ArrowUp":
        e.preventDefault()
        this.selectedSuggestionIndex = Math.max(
          this.selectedSuggestionIndex - 1,
          -1
        )
        this.updateSuggestionHighlight()
        break
      case "Enter":
        e.preventDefault()
        if (this.selectedSuggestionIndex >= 0) {
          this.selectSuggestion(this.selectedSuggestionIndex)
        }
        break
      case "Escape":
        this.hideSuggestions()
        break
    }
  }

  /**
   * Update suggestion highlight
   */
  private updateSuggestionHighlight(): void {
    SuggestionUtils.updateSuggestionHighlight(
      this.suggestionsList,
      this.selectedSuggestionIndex
    )
  }

  /**
   * Update clear button visibility
   */
  private updateClearButton(value: string): void {
    this.fileClear.style.display = value.length > 0 ? "flex" : "none"
  }

  /**
   * Clear the current selection
   */
  private clearSelection(): void {
    this.fileInput.value = ""
    this.updateClearButton(this.fileInput.value)
    this.selectedFile = null
    this.hideSuggestions()
    this.onFileChange(null)
  }

  /**
   * Show suggestions container
   */
  private showSuggestions(): void {
    this.suggestionsContainer.style.display = "block"
  }

  /**
   * Hide suggestions container
   */
  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
    this.selectedSuggestionIndex = -1
  }

  /**
   * Get the current selected file basename
   */
  public getValue(): string | null {
    if (this.selectedFile) {
      return this.selectedFile.basename
    }
    // If input has a value but no file selected, it might be a new file basename
    if (this.fileInput.value.trim()) {
      return this.fileInput.value.trim()
    }
    return null
  }

  /**
   * Set the value programmatically (expects a basename)
   */
  public setValue(basename: string | null): void {
    if (!basename) {
      this.clearSelection()
      return
    }

    // Try to find the file by basename
    const allFiles = this.app.vault.getMarkdownFiles()
    const file = allFiles.find((f: TFile) => f.basename === basename)
    
    if (file) {
      this.selectedFile = file
      this.fileInput.value = file.basename
    } else {
      this.selectedFile = null
      this.fileInput.value = basename
    }
    this.updateClearButton(this.fileInput.value)
  }


  public getElement(): HTMLElement {
    return this.fileContainer
  }

  /**
   * Clean up when component is destroyed
   */
  onunload(): void {
    // Clear any pending timeouts
    if (this.blurTimeout !== null) {
      clearTimeout(this.blurTimeout)
      this.blurTimeout = null
    }
    // Cancel any pending debounced calls
    // Note: Obsidian's debounce doesn't expose a cancel method, but it's safe
    // as the component will be destroyed and callbacks won't execute
  }
}

