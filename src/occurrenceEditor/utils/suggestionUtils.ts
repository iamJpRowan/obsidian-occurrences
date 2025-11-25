/**
 * Utility functions for suggestion list management
 */
export class SuggestionUtils {
  /**
   * Update suggestion highlight based on selected index
   * @param suggestionsList The container element containing suggestions
   * @param selectedIndex The index of the currently selected suggestion
   * @param suggestionClass The CSS class for suggestion items (default: "occurrence-modal-file-suggestion")
   */
  static updateSuggestionHighlight(
    suggestionsList: HTMLElement,
    selectedIndex: number,
    suggestionClass: string = "occurrence-modal-file-suggestion"
  ): void {
    const suggestions = suggestionsList.querySelectorAll(`.${suggestionClass}`)
    suggestions.forEach((el, index) => {
      if (index === selectedIndex) {
        el.addClass("is-selected")
        // Scroll the selected element into view
        el.scrollIntoView({ block: "nearest", behavior: "smooth" })
      } else {
        el.removeClass("is-selected")
      }
    })
  }
}

