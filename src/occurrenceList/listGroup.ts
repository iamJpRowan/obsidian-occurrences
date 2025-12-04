import { App, Component, setIcon, setTooltip } from "obsidian"
import { ListItem } from "./listItem"

// Generic type parameter allows flexibility for different item types
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic type parameter allows flexible item types
export class ListGroup<T = any> extends Component {
  private app: App
  private isCollapsed: boolean
  private listItems: ListItem<T>[] = []
  private itemContainer: HTMLElement
  private headerContainer: HTMLElement
  private iconContainer: HTMLElement
  private headerTextEl: HTMLElement
  private buttonsContainer: HTMLElement
  private showCollapsible: boolean
  private showCount: boolean
  private group: HTMLElement

  constructor(
    container: Element,
    title: string,
    app: App,
    options: {
      initialCollapsed?: boolean
      collapsible?: boolean
      showCount?: boolean
      onToggle?: (collapsed: boolean) => void
    } = {}
  ) {
    super()
    this.app = app
    this.isCollapsed = options.initialCollapsed || false
    this.showCollapsible = options.collapsible !== false // Default to true
    this.showCount = options.showCount !== false // Default to true

    // Create group container
    this.group = container.createEl("div", { cls: "intent-group" })

    // Create header container
    this.headerContainer = this.group.createEl("div", {
      cls: "intent-group-header",
    })

    // Create icon container
    this.iconContainer = this.headerContainer.createEl("span", {
      cls: "intent-group-icon",
    })

    // Create group header text
    this.headerTextEl = this.headerContainer.createEl("small", {
      text: title + (this.showCount ? " (0)" : ""),
      cls: "intent-group-title",
    })

    // Create buttons container
    this.buttonsContainer = this.headerContainer.createEl("div", {
      cls: "intent-group-buttons",
    })

    // Create item container
    this.itemContainer = this.group.createEl("div", {
      cls: "intent-group-items",
    })

    // Set up collapsible behavior if enabled
    if (this.showCollapsible) {
      // Dynamic cursor style needed for interactive element
      // eslint-disable-next-line obsidianmd/no-static-styles-assignment -- Cursor style must be set dynamically for interactive elements
      this.headerContainer.style.cursor = "pointer"
      this.headerContainer.addClass("is-collapsible")

      // Set initial collapsed state
      if (this.isCollapsed) {
        // Dynamic display toggle needed for collapsible functionality
        // eslint-disable-next-line obsidianmd/no-static-styles-assignment -- Display state must be set dynamically for collapsible UI
        this.itemContainer.style.display = "none"
        this.itemContainer.addClass("is-collapsed")
        setIcon(this.iconContainer, "chevron-right")
      } else {
        setIcon(this.iconContainer, "chevron-down")
      }

      // Add click handler for toggling
      this.registerDomEvent(this.headerContainer, "click", e => {
        // Don't toggle if clicking on buttons
        if (
          e.target &&
          (e.target as HTMLElement).closest(".intent-group-buttons")
        ) {
          return
        }

        this.toggle()

        // Report the state change to controller
        if (options.onToggle) {
          options.onToggle(this.isCollapsed)
        }
      })
    }
  }

  /**
   * Add a list item to the group
   */
  public addListItem(item: ListItem<T>): this {
    this.listItems.push(item)
    this.itemContainer.appendChild(item.getContainerEl())
    this.updateCount()
    return this
  }

  /**
   * Insert a list item at a specific position in the group
   */
  public insertListItemAt(item: ListItem<T>, index: number): this {
    this.listItems.splice(index, 0, item)

    // Insert the DOM element at the correct position
    if (index === 0) {
      this.itemContainer.insertBefore(
        item.getContainerEl(),
        this.itemContainer.firstChild
      )
    } else if (index >= this.listItems.length - 1) {
      this.itemContainer.appendChild(item.getContainerEl())
    } else {
      const nextItem = this.listItems[index + 1]
      this.itemContainer.insertBefore(
        item.getContainerEl(),
        nextItem.getContainerEl()
      )
    }

    this.updateCount()
    return this
  }

  /**
   * Remove a list item from the group
   */
  public removeListItem(item: ListItem<T>): this {
    const index = this.listItems.indexOf(item)
    if (index > -1) {
      this.listItems.splice(index, 1)
      // Add this line to actually remove the DOM element:
      item.getContainerEl().remove()
      this.updateCount()
    }
    return this
  }

  /**
   * Set the icon for the group header
   */
  public setHeaderIcon(icon: string): this {
    // Create or find an icon container
    let iconEl = this.headerContainer.querySelector(".intent-group-icon-header")

    if (!iconEl) {
      // Create a new one if it doesn't exist
      iconEl = this.headerContainer.createEl("span", {
        cls: "intent-group-icon-header",
      })

      // Position it before the title
      this.headerContainer.insertBefore(iconEl, this.headerTextEl)
    }

    // Set the icon using Obsidian's utility
    setIcon(iconEl as HTMLElement, icon)

    return this
  }

  /**
   * Add a button to the group header
   */
  public addButton(icon: string, tooltip: string, onClick: () => void): this {
    const button = this.buttonsContainer.createEl("button", {
      cls: "clickable-icon intent-group-button",
      attr: { "aria-label": tooltip },
    })

    setIcon(button, icon)
    setTooltip(button, tooltip)

    this.registerDomEvent(button, "click", e => {
      e.stopPropagation()
      onClick()
    })

    return this
  }

  /**
   * Toggle the collapsed state
   */
  public toggle(): this {
    this.isCollapsed = !this.isCollapsed

    if (this.isCollapsed) {
      // Dynamic display toggle needed for collapsible functionality
      // eslint-disable-next-line obsidianmd/no-static-styles-assignment -- Display state must be set dynamically for collapsible UI
      this.itemContainer.style.display = "none"
      this.itemContainer.addClass("is-collapsed")
      setIcon(this.iconContainer, "chevron-right")
    } else {
      // Dynamic display toggle needed for collapsible functionality
      // eslint-disable-next-line obsidianmd/no-static-styles-assignment -- Display state must be set dynamically for collapsible UI
      this.itemContainer.style.display = "block"
      this.itemContainer.removeClass("is-collapsed")
      setIcon(this.iconContainer, "chevron-down")
    }

    return this
  }

  /**
   * Update the count in the header
   */
  private updateCount(): void {
    if (this.showCount) {
      const currentText = this.headerTextEl.textContent || ""
      const baseText = currentText.replace(/\s*\(\d+\)$/, "")
      this.headerTextEl.textContent = `${baseText} (${this.listItems.length})`
    }
  }

  /**
   * Get all list items
   */
  public getListItems(): ListItem<T>[] {
    return this.listItems
  }

  /**
   * Get the item container element
   */
  public getItemContainer(): HTMLElement {
    return this.itemContainer
  }

  /**
   * Get the root element
   */
  public getRootEl(): HTMLElement {
    return this.group
  }
}

