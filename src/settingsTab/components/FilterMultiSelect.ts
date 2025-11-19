import { App, Component, debounce, setIcon } from "obsidian"

export interface FilterMultiSelectOptions {
  placeholder?: string
  suggestions: string[]
  getDisplayText?: (item: string) => string
  icon?: string
  pillStyle?: 'folder' | 'tag'
}

export class FilterMultiSelect extends Component {
  private container: HTMLElement
  private inputContainer: HTMLElement
  private inputWrapper: HTMLElement
  private input: HTMLInputElement
  private suggestionsContainer: HTMLElement
  private suggestionsList: HTMLElement
  private onSelectionChange: (items: string[]) => void
  private options: FilterMultiSelectOptions
  private app: App
  private selectedItems: string[] = []
  private filteredSuggestions: string[] = []
  private selectedSuggestionIndex: number = -1
  private debouncedFilter: (query: string) => void

  constructor(
    container: HTMLElement,
    app: App,
    initialValues: string[],
    onSelectionChange: (items: string[]) => void,
    options: FilterMultiSelectOptions
  ) {
    super()
    this.app = app
    this.options = {
      placeholder: "Type to search...",
      icon: "search",
      getDisplayText: (item) => item,
      pillStyle: "tag",
      ...options,
    }
    this.selectedItems = [...initialValues]
    this.onSelectionChange = onSelectionChange
    this.debouncedFilter = debounce((query: string) => {
      this.filterSuggestions(query)
    }, 200)
    this.render(container)
  }

  private render(container: HTMLElement): void {
    this.container = container

    // Create input container
    this.inputContainer = container.createEl("div", {
      cls: "filter-multiselect-container",
    })

    // Create icon if specified
    if (this.options.icon) {
      const iconEl = this.inputContainer.createEl("div", {
        cls: "filter-multiselect-icon",
      })
      setIcon(iconEl, this.options.icon)
    }

    // Create input wrapper (contains pills and input)
    this.inputWrapper = this.inputContainer.createEl("div", {
      cls: "filter-multiselect-wrapper",
    })

    // Create input
    this.input = this.inputWrapper.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder,
      cls: "filter-multiselect-input",
      attr: {
        spellcheck: "false",
      },
    }) as HTMLInputElement

    // Create suggestions container (as child of inputContainer for proper positioning)
    this.suggestionsContainer = this.inputContainer.createEl("div", {
      cls: "filter-multiselect-suggestions",
    })
    this.suggestionsContainer.style.display = "none"

    this.suggestionsList = this.suggestionsContainer.createEl("div", {
      cls: "filter-multiselect-suggestions-list",
    })

    // Event listeners
    this.registerDomEvent(this.input, "input", (e) => {
      const target = e.target as HTMLInputElement
      this.debouncedFilter(target.value)
    })

    this.registerDomEvent(this.input, "focus", () => {
      this.showSuggestions()
      if (this.input.value === "") {
        this.showAllSuggestions()
      }
    })

    this.registerDomEvent(this.input, "blur", () => {
      setTimeout(() => {
        this.hideSuggestions()
      }, 200)
    })

    this.registerDomEvent(this.input, "keydown", (e) => {
      this.handleKeydown(e)
    })

    this.registerDomEvent(this.suggestionsList, "click", (e) => {
      const target = e.target as HTMLElement
      const itemEl = target.closest(".filter-multiselect-suggestion-item")
      if (itemEl) {
        const index = parseInt(itemEl.getAttribute("data-index") || "0")
        this.selectSuggestion(index)
      }
    })

    // Initial render
    this.updateDisplay()
  }

  private filterSuggestions(query: string): void {
    if (!query.trim()) {
      this.showAllSuggestions()
      return
    }

    const queryLower = query.toLowerCase()
    this.filteredSuggestions = this.options.suggestions.filter(
      (item) =>
        item.toLowerCase().includes(queryLower) &&
        !this.selectedItems.includes(item)
    )

    this.renderSuggestions()
  }

  private showAllSuggestions(): void {
    this.filteredSuggestions = this.options.suggestions.filter(
      (item) => !this.selectedItems.includes(item)
    )
    this.renderSuggestions()
  }

  private renderSuggestions(): void {
    this.suggestionsList.empty()
    this.selectedSuggestionIndex = -1

    if (this.filteredSuggestions.length === 0) {
      this.hideSuggestions()
      return
    }

    this.selectedSuggestionIndex = 0

    this.filteredSuggestions.forEach((item, index) => {
      const itemEl = this.suggestionsList.createEl("div", {
        cls: "filter-multiselect-suggestion-item",
        attr: { "data-index": index.toString() },
        text: this.options.getDisplayText!(item),
      })

      itemEl.addEventListener("mouseenter", () => {
        this.selectedSuggestionIndex = index
        this.updateHighlight()
      })
    })

    this.updateHighlight()
    this.showSuggestions()
  }

  private selectSuggestion(index: number): void {
    if (index < 0 || index >= this.filteredSuggestions.length) return

    const item = this.filteredSuggestions[index]
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item)
      this.input.value = ""
      this.updateDisplay()
      this.showAllSuggestions()
      this.showSuggestions()
      this.onSelectionChange([...this.selectedItems])
    }
  }

  private removeItem(item: string): void {
    this.selectedItems = this.selectedItems.filter((i) => i !== item)
    this.updateDisplay()
    this.showAllSuggestions()
    this.onSelectionChange([...this.selectedItems])
  }

  private updateDisplay(): void {
    // Remove existing pills
    const existingPills = this.inputWrapper.querySelectorAll(
      ".filter-multiselect-pill"
    )
    existingPills.forEach((pill) => pill.remove())

    // Create pills for selected items, before the input
    this.selectedItems.forEach((item) => {
      const pillClass = this.options.pillStyle === 'folder' 
        ? "filter-multiselect-pill filter-multiselect-pill-folder"
        : "filter-multiselect-pill filter-multiselect-pill-tag"
      
      const pill = this.inputWrapper.createEl("div", {
        cls: pillClass,
      })

      this.inputWrapper.insertBefore(pill, this.input)

      pill.createEl("span", {
        cls: "filter-multiselect-pill-text",
        text: this.options.getDisplayText!(item),
      })

      const removeButton = pill.createEl("div", {
        cls: "filter-multiselect-pill-remove",
      })
      removeButton.textContent = "×"

      this.registerDomEvent(removeButton, "click", () => {
        this.removeItem(item)
      })
    })

    // Update placeholder
    this.input.placeholder =
      this.selectedItems.length === 0
        ? this.options.placeholder || ""
        : ""
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.suggestionsContainer.style.display === "none") return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.filteredSuggestions.length - 1
        )
        this.updateHighlight()
        break
      case "ArrowUp":
        e.preventDefault()
        this.selectedSuggestionIndex = Math.max(
          this.selectedSuggestionIndex - 1,
          -1
        )
        this.updateHighlight()
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

  private updateHighlight(): void {
    const items = this.suggestionsList.querySelectorAll(
      ".filter-multiselect-suggestion-item"
    )
    items.forEach((el, index) => {
      if (index === this.selectedSuggestionIndex) {
        el.addClass("is-selected")
        el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      } else {
        el.removeClass("is-selected")
      }
    })
  }

  private showSuggestions(): void {
    this.suggestionsContainer.style.display = "block"
  }

  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
    this.selectedSuggestionIndex = -1
  }

  public getValue(): string[] {
    return [...this.selectedItems]
  }

  public setValue(items: string[]): void {
    this.selectedItems = [...items]
    this.updateDisplay()
    this.onSelectionChange([...this.selectedItems])
  }
}

