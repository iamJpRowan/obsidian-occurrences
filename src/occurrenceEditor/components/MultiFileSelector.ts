import { App, Component, debounce, setIcon, TFile } from "obsidian"
import { FileSelectorFilterSettings } from "@/settings"
import { FileFilterUtils } from "../utils/fileFilterUtils"
import { SuggestionUtils } from "../utils/suggestionUtils"

export interface MultiFileSelectorOptions {
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

export class MultiFileSelector extends Component {
  private fileContainer: HTMLElement
  private fileInputContainer: HTMLElement
  private fileInput: HTMLInputElement
  private inputWrapper: HTMLElement
  private suggestionsContainer: HTMLElement
  private suggestionsList: HTMLElement
  private onFilesChange: (basenames: string[]) => void
  private debouncedSearchChange: (query: string) => void
  private options: MultiFileSelectorOptions
  private app: App
  private filterSettings: FileSelectorFilterSettings | null = null
  private selectedFiles: string[] = [] // Store basenames
  private suggestions: FileSuggestion[] = []
  private selectedSuggestionIndex: number = -1
  private selectedFileIndex: number = -1
  private visible: boolean = false
  private suggestionsVisible: boolean = false
  private blurTimeout: number | null = null

  constructor(
    container: HTMLElement,
    app: App,
    onFilesChange: (basenames: string[]) => void,
    options: MultiFileSelectorOptions = {}
  ) {
    super()
    this.app = app
    this.options = {
      placeholder: "Select files...",
      debounceMs: 300,
      allowCreate: true,
      ...options,
    }
    this.filterSettings = options.filterSettings || null
    this.onFilesChange = onFilesChange
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

    // Create input wrapper (will contain pills and input)
    this.inputWrapper = this.fileInputContainer.createEl("div", {
      cls: "occurrence-modal-file-input-wrapper",
    })

    // Create file input
    this.fileInput = this.inputWrapper.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder ?? "Select files...",
      attr: {
        spellcheck: "false",
      },
    })
    this.fileInput.classList.add("occurrence-modal-file-input")

    // Create suggestions container
    this.suggestionsContainer = this.fileContainer.createEl("div", {
      cls: "occurrence-modal-file-suggestions-container",
    })

    this.suggestionsList = this.suggestionsContainer.createEl("div", {
      cls: "occurrence-modal-file-suggestions-list",
    })

    // Add input event listeners
    this.registerDomEvent(this.fileInput, "input", e => {
      const target = e.target as HTMLInputElement
      this.debouncedSearchChange(target.value)
      
      // Clear file selection when user starts typing
      if (target.value.trim().length > 0) {
        this.clearFileSelection()
      }
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
      return (
        (name.includes(queryLower) || path.includes(queryLower)) &&
        !this.selectedFiles.includes(file.basename)
      )
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
      if (!exactMatch && !this.selectedFiles.includes(queryBasename)) {
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
   * Show all files (excluding already selected ones)
   */
  private showAllFiles(): void {
    const allFiles = this.app.vault
      .getMarkdownFiles()
      .filter((file: TFile) => !this.selectedFiles.includes(file.basename))
    
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
    const basename = suggestion.isNew ? suggestion.fullPath : (suggestion.file?.basename ?? "")

    if (!this.selectedFiles.includes(basename)) {
      this.selectedFiles.push(basename)
      this.updateSelectedFilesDisplay()
      this.fileInput.value = ""
      this.clearFileSelection()
      this.hideSuggestions()
      this.onFilesChange([...this.selectedFiles])
    }
  }

  /**
   * Remove a file
   */
  private removeFile(basename: string): void {
    this.selectedFiles = this.selectedFiles.filter(b => b !== basename)
    this.updateSelectedFilesDisplay()
    this.onFilesChange([...this.selectedFiles])
  }

  /**
   * Update the display of selected files
   */
  private updateSelectedFilesDisplay(): void {
    // Remove existing pills
    const existingPills = this.inputWrapper.querySelectorAll(".occurrence-modal-file-pill")
    existingPills.forEach(pill => pill.remove())

    // Create pills for selected files, before the input
    this.selectedFiles.forEach(basename => {
      // Find file by basename
      const allFiles = this.app.vault.getMarkdownFiles()
      const file = allFiles.find((f: TFile) => f.basename === basename)
      const displayName = file ? file.basename : basename

      const pill = this.inputWrapper.createEl("div", {
        cls: "occurrence-modal-file-pill",
      })

      this.inputWrapper.insertBefore(pill, this.fileInput)

      pill.createEl("span", {
        cls: "occurrence-modal-file-pill-text",
        text: displayName,
      })

      const removeButton = pill.createEl("div", {
        cls: "occurrence-modal-file-pill-remove",
      })
      removeButton.textContent = "×"

      this.registerDomEvent(removeButton, "click", () => {
        this.removeFile(basename)
      })
    })

    // Update placeholder
    this.updatePlaceholder()

    // Update file highlight for keyboard navigation
    this.updateFileHighlight()
  }

  /**
   * Update placeholder based on selected files count
   */
  private updatePlaceholder(): void {
    if (this.selectedFiles.length === 0) {
      this.fileInput.placeholder = this.options.placeholder || ""
    } else {
      this.fileInput.placeholder = ""
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    const hasText = this.fileInput.value.trim().length > 0

    // Handle file navigation when suggestions are hidden, we have selected files, and input is empty
    if (!this.suggestionsVisible && this.selectedFiles.length > 0 && !hasText) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          this.navigateToPreviousFile()
          break
        case "ArrowRight":
          e.preventDefault()
          this.navigateToNextFile()
          break
        case "Backspace":
          e.preventDefault()
          this.handleFileRemoval()
          break
        case "Delete":
          e.preventDefault()
          this.handleFileRemoval()
          break
        case "Escape":
          this.clearFileSelection()
          break
      }
      return
    }

    // Handle suggestion navigation when suggestions are visible
    if (this.suggestionsVisible) {
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
        // Only handle file navigation when input is empty
        case "ArrowLeft":
          if (!hasText) {
            e.preventDefault()
            this.navigateToPreviousFile()
          }
          break
        case "ArrowRight":
          if (!hasText) {
            e.preventDefault()
            this.navigateToNextFile()
          }
          break
        case "Backspace":
          if (!hasText) {
            e.preventDefault()
            this.handleFileRemoval()
          }
          break
        case "Delete":
          if (!hasText) {
            e.preventDefault()
            this.handleFileRemoval()
          }
          break
      }
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
   * Navigate to the previous file
   */
  private navigateToPreviousFile(): void {
    if (this.selectedFiles.length === 0) return

    if (this.selectedFileIndex === -1) {
      // Start from the last file
      this.selectedFileIndex = this.selectedFiles.length - 1
    } else {
      // Move to previous file
      this.selectedFileIndex = Math.max(0, this.selectedFileIndex - 1)
    }

    this.updateFileHighlight()
  }

  /**
   * Navigate to the next file
   */
  private navigateToNextFile(): void {
    if (this.selectedFiles.length === 0) return

    if (this.selectedFileIndex === -1) {
      // Start from the first file
      this.selectedFileIndex = 0
    } else {
      // Move to next file
      this.selectedFileIndex = Math.min(
        this.selectedFiles.length - 1,
        this.selectedFileIndex + 1
      )
    }

    this.updateFileHighlight()
  }

  /**
   * Handle file removal via keyboard
   */
  private handleFileRemoval(): void {
    if (this.selectedFiles.length === 0) return

    // If no file is selected, select the last one
    if (this.selectedFileIndex === -1) {
      this.selectedFileIndex = this.selectedFiles.length - 1
      this.updateFileHighlight()
      return
    }

    // Remove the currently selected file
    const fileToRemove = this.selectedFiles[this.selectedFileIndex]
    this.removeFile(fileToRemove)

    // Adjust the selected index
    if (this.selectedFiles.length === 0) {
      this.selectedFileIndex = -1
    } else if (this.selectedFileIndex >= this.selectedFiles.length) {
      this.selectedFileIndex = this.selectedFiles.length - 1
    }

    this.updateFileHighlight()
  }

  /**
   * Clear file selection
   */
  private clearFileSelection(): void {
    this.selectedFileIndex = -1
    this.updateFileHighlight()
  }

  /**
   * Update file highlight for keyboard navigation
   */
  private updateFileHighlight(): void {
    const filePills = this.inputWrapper.querySelectorAll(".occurrence-modal-file-pill")
    filePills.forEach((pill, index) => {
      if (index === this.selectedFileIndex) {
        pill.addClass("is-keyboard-selected")
      } else {
        pill.removeClass("is-keyboard-selected")
      }
    })
  }

  /**
   * Show suggestions container
   */
  private showSuggestions(): void {
    this.suggestionsContainer.addClass("is-visible")
    this.suggestionsVisible = true
  }

  /**
   * Hide suggestions container
   */
  private hideSuggestions(): void {
    this.suggestionsContainer.removeClass("is-visible")
    this.suggestionsVisible = false
    this.selectedSuggestionIndex = -1
  }

  /**
   * Get the current selected file basenames
   */
  public getValue(): string[] {
    return [...this.selectedFiles]
  }

  /**
   * Set the value programmatically (expects basenames)
   */
  public setValue(basenames: string[]): void {
    this.selectedFiles = [...basenames]
    this.selectedFileIndex = -1
    this.updateSelectedFilesDisplay()
    this.onFilesChange([...this.selectedFiles])
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

