import { OccurrenceStore } from "@/occurrenceStore"
import { Component, debounce } from "obsidian"

export interface TagSelectorOptions {
  placeholder?: string
  debounceMs?: number
}

export class TagSelector extends Component {
  private tagContainer: HTMLElement
  private tagInputContainer: HTMLElement
  private tagInput: HTMLInputElement
  private suggestionsContainer: HTMLElement
  private suggestionsList: HTMLElement
  private inputWrapper: HTMLElement
  private onTagsChange: (tags: string[]) => void
  private debouncedSearchChange: (query: string) => void
  private options: TagSelectorOptions
  private occurrenceStore: OccurrenceStore
  private selectedTags: string[] = []
  private availableTags: Map<string, number> = new Map()
  private filteredTags: Array<[string, number]> = []
  private selectedSuggestionIndex: number = -1
  private selectedTagIndex: number = -1
  private visible: boolean = false
  private suggestionsVisible: boolean = false
  private cachedSingleLineHeight: number | null = null

  constructor(
    container: HTMLElement,
    occurrenceStore: OccurrenceStore,
    onTagsChange: (tags: string[]) => void,
    options: TagSelectorOptions = {}
  ) {
    super()
    this.occurrenceStore = occurrenceStore
    this.options = {
      placeholder: "Add tags...",
      debounceMs: 300,
      ...options,
    }
    this.onTagsChange = onTagsChange
    this.debouncedSearchChange = debounce((query: string) => {
      this.filterTags(query)
    }, this.options.debounceMs!)
    this.render(container)
    this.loadAvailableTags()
    this.updatePlaceholder()
  }

  private render(container: HTMLElement): void {
    // Create tag container (matches occurrence-modal-file-container structure)
    this.tagContainer = container.createEl("div", {
      cls: "occurrence-modal-file-container occurrence-modal-tag-container",
    })

    // Create tag input container (matches occurrence-modal-file-input-container)
    this.tagInputContainer = this.tagContainer.createEl("div", {
      cls: "occurrence-modal-file-input-container",
    })

    // Create input wrapper (matches occurrence-modal-file-input-wrapper)
    this.inputWrapper = this.tagInputContainer.createEl("div", {
      cls: "occurrence-modal-file-input-wrapper",
    })

    // Create tag input
    this.tagInput = this.inputWrapper.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder || "",
      attr: {
        id: "modal-tag-input",
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.tagInput.classList.add("occurrence-modal-file-input")

    // Create suggestions container (matches occurrence-modal-file-suggestions-container)
    this.suggestionsContainer = this.tagContainer.createEl("div", {
      cls: "occurrence-modal-file-suggestions-container",
    })
    this.suggestionsContainer.style.display = "none"

    this.suggestionsList = this.suggestionsContainer.createEl("div", {
      cls: "occurrence-modal-file-suggestions-list",
    })

    // Add event listeners
    this.registerDomEvent(this.tagInput, "input", e => {
      const target = e.target as HTMLInputElement
      this.debouncedSearchChange(target.value)

      // Clear tag selection when user starts typing
      if (target.value.trim().length > 0) {
        this.clearTagSelection()
      }
    })

    // Handle container focus and clicks
    this.registerDomEvent(this.tagInputContainer, "focus", () => {
      this.tagInput.focus()
    })

    this.registerDomEvent(this.tagInputContainer, "click", e => {
      // Don't focus if clicking on a tag pill
      if ((e.target as HTMLElement).closest(".occurrence-modal-tag-pill")) {
        return
      }
      this.tagInput.focus()
    })

    this.registerDomEvent(this.tagInput, "focus", () => {
      // Only show suggestions if user has started typing
      if (this.tagInput.value.trim().length > 0) {
        this.showSuggestions()
      }
    })

    this.registerDomEvent(this.tagInput, "blur", () => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(() => {
        this.hideSuggestions()
      }, 200)
    })

    this.registerDomEvent(this.tagInput, "keydown", e => {
      this.handleKeydown(e)
    })


    // Add delegated click handler for all suggestions
    this.registerDomEvent(this.suggestionsList, "click", e => {
      const suggestionEl = (e.target as HTMLElement).closest(".occurrence-modal-tag-suggestion")
      if (!suggestionEl) return

      const index = parseInt(suggestionEl.getAttribute("data-index") || "-1")
      const availableTags = this.filteredTags.filter(
        ([tag]) => !this.selectedTags.includes(tag)
      )

      if (index >= 0 && index < availableTags.length) {
        this.selectTag(availableTags[index][0])
      }
    })
  }

  /**
   * Load all available tags from the occurrence store
   */
  private loadAvailableTags(): void {
    const tagsWithCounts = this.occurrenceStore.getAllTags()

    // Sort tags alphabetically by tag name
    this.availableTags = new Map(
      Array.from(tagsWithCounts.entries()).sort((a, b) =>
        a[0].localeCompare(b[0])
      )
    )
  }

  /**
   * Filter tags based on search query
   */
  private filterTags(query: string): void {
    if (!query.trim()) {
      this.hideSuggestions()
      return
    }

    const queryLower = query.toLowerCase()
    this.filteredTags = Array.from(this.availableTags.entries()).filter(
      ([tag]) => tag.toLowerCase().includes(queryLower)
    )

    this.renderSuggestions()
  }

  /**
   * Show all available tags
   */
  private showAllTags(): void {
    this.filteredTags = Array.from(this.availableTags.entries())
    this.renderSuggestions()
  }

  /**
   * Render suggestions list
   */
  private renderSuggestions(): void {
    this.suggestionsList.empty()
    this.selectedSuggestionIndex = -1

    // Filter out already selected tags
    const availableTags = this.filteredTags.filter(
      ([tag]) => !this.selectedTags.includes(tag)
    )

    if (availableTags.length === 0) {
      this.hideSuggestions()
      return
    }

    // Highlight the first suggestion by default
    this.selectedSuggestionIndex = 0

    availableTags.forEach(([tag, count], index) => {
      const suggestionEl = this.suggestionsList.createEl("div", {
        cls: "occurrence-modal-file-suggestion occurrence-modal-tag-suggestion",
        attr: { "data-index": index.toString() },
      })

      // Remove # symbol for display
      const displayTag = tag.startsWith("#") ? tag.slice(1) : tag

      // Create a container for the tag name
      const tagNameEl = suggestionEl.createEl("div", {
        cls: "occurrence-modal-file-suggestion-name",
      })

      // Highlight matching text
      const searchQuery = this.tagInput.value.toLowerCase()
      if (searchQuery && displayTag.toLowerCase().includes(searchQuery)) {
        const tagLower = displayTag.toLowerCase()
        const matchIndex = tagLower.indexOf(searchQuery)
        const beforeMatch = displayTag.substring(0, matchIndex)
        const match = displayTag.substring(
          matchIndex,
          matchIndex + searchQuery.length
        )
        const afterMatch = displayTag.substring(matchIndex + searchQuery.length)

        tagNameEl.innerHTML = `${beforeMatch}<strong>${match}</strong>${afterMatch}`
      } else {
        tagNameEl.textContent = displayTag
      }

      // Create a container for the count
      const countEl = suggestionEl.createEl("div", {
        cls: "occurrence-modal-file-suggestion-path",
        text: count.toString(),
      })
    })

    // Apply highlighting to the first suggestion
    this.updateSuggestionHighlight()
    this.showSuggestions()
  }

  /**
   * Select a tag
   */
  private selectTag(tag: string): void {
    if (!this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag)
      this.updateSelectedTagsDisplay()
      this.tagInput.value = ""
      this.hideSuggestions()
      this.onTagsChange([...this.selectedTags])
    }
  }

  /**
   * Remove a tag
   */
  private removeTag(tag: string): void {
    this.selectedTags = this.selectedTags.filter(t => t !== tag)
    this.updateSelectedTagsDisplay()
    this.onTagsChange([...this.selectedTags])
  }

  /**
   * Update the display of selected tags
   */
  private updateSelectedTagsDisplay(): void {
    // Remove existing tag pills from wrapper
    const existingPills = this.inputWrapper.querySelectorAll(".occurrence-modal-tag-pill")
    existingPills.forEach(pill => pill.remove())

    // Create tag pills directly in wrapper, before the input
    this.selectedTags.forEach(tag => {
      const tagPill = this.inputWrapper.createEl("div", {
        cls: "occurrence-modal-tag-pill",
      })

      // Insert before the input element
      this.inputWrapper.insertBefore(tagPill, this.tagInput)

      // Remove # symbol for display
      const displayTag = tag.startsWith("#") ? tag.slice(1) : tag
      const tagText = tagPill.createEl("span", {
        cls: "occurrence-modal-tag-pill-text",
        text: displayTag,
      })

      const removeButton = tagPill.createEl("div", {
        cls: "occurrence-modal-tag-pill-remove",
      })
      removeButton.textContent = "×"

      this.registerDomEvent(removeButton, "click", () => {
        this.removeTag(tag)
      })
    })

    // Update placeholder based on selected tags
    this.updatePlaceholder()

    // Update tag highlight for keyboard navigation
    this.updateTagHighlight()
  }

  /**
   * Get the single-line height (cached)
   */
  private getSingleLineHeight(): number {
    if (this.cachedSingleLineHeight === null) {
      this.cachedSingleLineHeight =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--input-height"
          )
        ) || 32
    }
    return this.cachedSingleLineHeight
  }

  /**
   * Update placeholder based on selected tags count
   */
  private updatePlaceholder(): void {
    if (this.selectedTags.length === 0) {
      this.tagInput.placeholder = this.options.placeholder || ""
    } else {
      this.tagInput.placeholder = ""
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    const hasText = this.tagInput.value.trim().length > 0

    // Handle tag navigation when suggestions are hidden, we have selected tags, and input is empty
    if (!this.suggestionsVisible && this.selectedTags.length > 0 && !hasText) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          this.navigateToPreviousTag()
          break
        case "ArrowRight":
          e.preventDefault()
          this.navigateToNextTag()
          break
        case "Backspace":
          e.preventDefault()
          this.handleTagRemoval()
          break
        case "Delete":
          e.preventDefault()
          this.handleTagRemoval()
          break
        case "Escape":
          this.clearTagSelection()
          break
      }
      return
    }

    // Handle suggestion navigation when suggestions are visible
    if (this.suggestionsVisible) {
      // Get available tags (excluding already selected ones)
      const availableTags = this.filteredTags.filter(
        ([tag]) => !this.selectedTags.includes(tag)
      )

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          this.selectedSuggestionIndex = Math.min(
            this.selectedSuggestionIndex + 1,
            availableTags.length - 1
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
            // Select the currently highlighted suggestion
            this.selectTag(availableTags[this.selectedSuggestionIndex][0])
          } else if (availableTags.length > 0) {
            // Select the first suggestion if none is highlighted
            this.selectTag(availableTags[0][0])
          }
          break
        case "Escape":
          this.hideSuggestions()
          break
        // Only handle tag navigation when input is empty
        case "ArrowLeft":
          if (!hasText) {
            e.preventDefault()
            this.navigateToPreviousTag()
          }
          break
        case "ArrowRight":
          if (!hasText) {
            e.preventDefault()
            this.navigateToNextTag()
          }
          break
        case "Backspace":
          if (!hasText) {
            e.preventDefault()
            this.handleTagRemoval()
          }
          break
        case "Delete":
          if (!hasText) {
            e.preventDefault()
            this.handleTagRemoval()
          }
          break
      }
    }
  }

  /**
   * Update suggestion highlight
   */
  private updateSuggestionHighlight(): void {
    const suggestions = this.suggestionsList.querySelectorAll(".occurrence-modal-tag-suggestion")
    suggestions.forEach((el, index) => {
      if (index === this.selectedSuggestionIndex) {
        el.addClass("is-selected")
        // Scroll the selected element into view
        el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      } else {
        el.removeClass("is-selected")
      }
    })
  }

  /**
   * Navigate to the previous tag
   */
  private navigateToPreviousTag(): void {
    if (this.selectedTags.length === 0) return

    if (this.selectedTagIndex === -1) {
      // Start from the last tag
      this.selectedTagIndex = this.selectedTags.length - 1
    } else {
      // Move to previous tag
      this.selectedTagIndex = Math.max(0, this.selectedTagIndex - 1)
    }

    this.updateTagHighlight()
  }

  /**
   * Navigate to the next tag
   */
  private navigateToNextTag(): void {
    if (this.selectedTags.length === 0) return

    if (this.selectedTagIndex === -1) {
      // Start from the first tag
      this.selectedTagIndex = 0
    } else {
      // Move to next tag
      this.selectedTagIndex = Math.min(
        this.selectedTags.length - 1,
        this.selectedTagIndex + 1
      )
    }

    this.updateTagHighlight()
  }

  /**
   * Handle tag removal via keyboard
   */
  private handleTagRemoval(): void {
    if (this.selectedTags.length === 0) return

    // If no tag is selected, select the last one
    if (this.selectedTagIndex === -1) {
      this.selectedTagIndex = this.selectedTags.length - 1
      this.updateTagHighlight()
      return
    }

    // Remove the currently selected tag
    const tagToRemove = this.selectedTags[this.selectedTagIndex]
    this.removeTag(tagToRemove)

    // Adjust the selected index
    if (this.selectedTags.length === 0) {
      this.selectedTagIndex = -1
    } else if (this.selectedTagIndex >= this.selectedTags.length) {
      this.selectedTagIndex = this.selectedTags.length - 1
    }

    this.updateTagHighlight()
  }

  /**
   * Clear tag selection
   */
  private clearTagSelection(): void {
    this.selectedTagIndex = -1
    this.updateTagHighlight()
  }

  /**
   * Update tag highlight for keyboard navigation
   */
  private updateTagHighlight(): void {
    const tagPills = this.inputWrapper.querySelectorAll(".occurrence-modal-tag-pill")
    tagPills.forEach((pill, index) => {
      if (index === this.selectedTagIndex) {
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
    this.suggestionsContainer.style.display = "block"
    this.suggestionsVisible = true
  }

  /**
   * Hide suggestions container
   */
  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
    this.suggestionsVisible = false
    this.selectedSuggestionIndex = -1
  }

  /**
   * Get the current selected tags
   */
  public getValue(): string[] {
    return [...this.selectedTags]
  }

  /**
   * Set tags programmatically
   */
  public setValue(tags: string[]): void {
    this.selectedTags = [...tags]
    this.selectedTagIndex = -1
    this.updateSelectedTagsDisplay()
    this.onTagsChange([...this.selectedTags])
  }

  /**
   * Check if the tag selector is visible
   */
  public isVisible(): boolean {
    return this.visible
  }

  /**
   * Public method to refresh available tags
   */
  public refreshTags(): void {
    this.loadAvailableTags()
  }

  public getElement(): HTMLElement {
    return this.tagContainer
  }

  /**
   * Clean up when component is destroyed
   */
  onunload(): void {
    // Cleanup handled by Component base class
  }
}

