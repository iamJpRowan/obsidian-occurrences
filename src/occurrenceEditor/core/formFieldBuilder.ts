import { setIcon } from "obsidian"
import OccurrencesPlugin from "@/main"
import { OccurrenceFormData } from "./OccurrenceFormBase"
import { DateTimeSelector } from "../components/DateTimeSelector"
import { SingleFileSelector } from "../components/SingleFileSelector"
import { MultiFileSelector } from "../components/MultiFileSelector"
import { TagSelector } from "../components/TagSelector"
import { createFieldContainer } from "../utils/fieldHelpers"

export interface FormFieldBuilders {
  dateTimeSelector: DateTimeSelector
  locationSelector: SingleFileSelector
  participantsSelector: MultiFileSelector
  topicsSelector: MultiFileSelector
  tagSelector: TagSelector
}

export interface FormFieldBuilderOptions {
  formData: OccurrenceFormData
  plugin: OccurrencesPlugin
  formContainer: HTMLElement
  savedTimezoneOffset: string | null
  onFormDataChange: (data: Partial<OccurrenceFormData>) => void
}

/**
 * Builds all form fields and returns references to the selectors
 */
export function buildFormFields(options: FormFieldBuilderOptions): FormFieldBuilders {
  const { formData, plugin, formContainer, savedTimezoneOffset, onFormDataChange } = options

  // Occurred At field
  const occurredAtContainer = createFieldContainer(formContainer, {
    icon: "calendar",
    label: "Occurred At",
  })
  const dateTimeSelector = new DateTimeSelector(
    occurredAtContainer,
    (date: Date | null) => {
      onFormDataChange({ occurredAt: date })
    }
  )
  if (formData.occurredAt) {
    dateTimeSelector.setValue(formData.occurredAt, savedTimezoneOffset)
  }

  // Location field
  const locationContainer = createFieldContainer(formContainer, {
    icon: "map-pin",
    label: "Location",
  })
  const locationSelector = new SingleFileSelector(
    locationContainer,
    plugin.app,
    (basename: string | null) => {
      onFormDataChange({ location: basename })
    },
    {
      placeholder: "Select location...",
      allowCreate: true,
      filterSettings: plugin.settings.fileSelectorFilters.location,
    }
  )
  if (formData.location) {
    locationSelector.setValue(formData.location)
  }

  // Participants field
  const participantsContainer = createFieldContainer(formContainer, {
    icon: "users",
    label: "Participants",
  })
  const participantsSelector = new MultiFileSelector(
    participantsContainer,
    plugin.app,
    (basenames: string[]) => {
      onFormDataChange({ participants: basenames })
    },
    {
      placeholder: "Add participants...",
      allowCreate: true,
      filterSettings: plugin.settings.fileSelectorFilters.participants,
    }
  )
  if (formData.participants.length > 0) {
    participantsSelector.setValue(formData.participants)
  }

  // Topics field
  const topicsContainer = createFieldContainer(formContainer, {
    icon: "lightbulb",
    label: "Topics",
  })
  const topicsSelector = new MultiFileSelector(
    topicsContainer,
    plugin.app,
    (basenames: string[]) => {
      onFormDataChange({ topics: basenames })
    },
    {
      placeholder: "Add topics...",
      allowCreate: true,
      filterSettings: plugin.settings.fileSelectorFilters.topics,
    }
  )
  if (formData.topics.length > 0) {
    topicsSelector.setValue(formData.topics)
  }

  // Tags field
  const tagsContainer = createFieldContainer(formContainer, {
    icon: "tags",
    label: "Tags",
  })
  const tagSelector = new TagSelector(
    tagsContainer,
    plugin.occurrenceStore,
    (tags: string[]) => {
      onFormDataChange({ tags })
    }
  )
  if (formData.tags.length > 0) {
    tagSelector.setValue(formData.tags)
  }

  return {
    dateTimeSelector,
    locationSelector,
    participantsSelector,
    topicsSelector,
    tagSelector,
  }
}

/**
 * Builds the title input field
 */
export function buildTitleField(
  container: HTMLElement,
  formData: OccurrenceFormData,
  titleContainerClass: string
): HTMLInputElement {
  const titleContainer = container.createEl("div", {
    cls: titleContainerClass,
  })
  const titleInput = titleContainer.createEl("input", {
    type: "text",
    attr: {
      id: "occurrence-title",
      "aria-label": "Title",
      placeholder: "Enter occurrence title...",
    },
  }) as HTMLInputElement
  titleInput.value = formData.title
  return titleInput
}

/**
 * Builds the To Process checkbox field
 */
export function buildToProcessField(
  formContainer: HTMLElement,
  formData: OccurrenceFormData,
  onToProcessChange: (value: boolean) => void
): HTMLInputElement {
  const toProcessContainer = createFieldContainer(formContainer, {
    icon: "square-check-big",
    label: "To Process",
  })
  const toProcessCheckboxContainer = toProcessContainer.createEl("div", {
    cls: "occurrence-modal-to-process",
  })
  const toProcessCheckbox = toProcessCheckboxContainer.createEl("input", {
    type: "checkbox",
    attr: {
      id: "occurrence-to-process",
    },
  }) as HTMLInputElement
  toProcessCheckbox.checked = formData.toProcess
  toProcessCheckbox.addEventListener("change", () => {
    onToProcessChange(toProcessCheckbox.checked)
  })
  return toProcessCheckbox
}

/**
 * Builds the error message container
 */
export function buildErrorMessage(formContainer: HTMLElement): HTMLElement {
  const errorMessage = formContainer.createEl("div", {
    cls: "occurrence-modal-error",
  })

  const errorIcon = errorMessage.createEl("span", {
    cls: "occurrence-modal-error-icon",
  })
  setIcon(errorIcon, "circle-alert")

  errorMessage.createEl("span", {
    cls: "occurrence-modal-error-text",
  })

  return errorMessage
}

/**
 * Builds the submit button
 */
export function buildSubmitButton(
  formContainer: HTMLElement,
  isEditing: boolean,
  buttonContainerClass: string | null = null
): HTMLButtonElement {
  let buttonContainer: HTMLElement
  if (buttonContainerClass) {
    buttonContainer = formContainer.createEl("div", {
      cls: buttonContainerClass,
    })
  } else {
    buttonContainer = formContainer
  }

  const submitButton = buttonContainer.createEl("button", {
    text: isEditing ? "Update Occurrence" : "Create Occurrence",
    cls: "mod-cta",
  }) as HTMLButtonElement

  return submitButton
}

