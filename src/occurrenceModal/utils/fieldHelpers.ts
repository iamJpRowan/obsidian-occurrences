import { setIcon } from "obsidian"

/**
 * Field configuration for creating standardized field containers
 */
export interface FieldConfig {
  icon: string
  label: string
}

/**
 * Creates a standardized field container with icon and label
 * @param parentContainer The parent container to append the field to
 * @param config Field configuration (icon and label)
 * @returns The field container element
 */
export function createFieldContainer(
  parentContainer: HTMLElement,
  config: FieldConfig
): HTMLElement {
  const fieldContainer = parentContainer.createEl("div", {
    cls: "occurrence-modal-field",
  })

  const fieldIcon = fieldContainer.createEl("span", {
    cls: "occurrence-modal-field-icon",
  })
  setIcon(fieldIcon, config.icon)

  fieldContainer.createEl("label", {
    text: config.label,
    cls: "occurrence-modal-field-label",
  })

  return fieldContainer
}

