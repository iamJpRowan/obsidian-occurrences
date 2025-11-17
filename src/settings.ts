import { OccurrenceObject } from "./types"

/**
 * Default property mapping configuration
 * Maps OccurrenceObject interface properties to frontmatter field names
 * Note: path, file, and title are interface-only properties and should not be mapped
 */
export const DEFAULT_PROPERTY_MAPPING: Partial<Record<keyof OccurrenceObject, string>> = {
  occurredAt: "occurred_at",
  toProcess: "to_process",
  participants: "participants",
  intents: "intents",
  location: "location",
}

/**
 * Plugin settings interface
 */
export interface OccurrencesPluginSettings {
  propertyMapping: Record<string, string>
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: OccurrencesPluginSettings = {
  propertyMapping: {
    occurredAt: "occurred_at",
    toProcess: "to_process",
    participants: "participants",
    intents: "intents",
    location: "location",
  },
}

/**
 * Get the property mapping for a given property
 * Returns the frontmatter field name for the given property
 */
export function getFrontmatterFieldName(
  property: keyof OccurrenceObject,
  settings: OccurrencesPluginSettings
): string {
  // Interface-only properties should never be mapped
  if (property === "path" || property === "file" || property === "title") {
    return property
  }

  // Tags is hardcoded to always use "tags"
  if (property === "tags") {
    return "tags"
  }

  return settings.propertyMapping[property] || DEFAULT_PROPERTY_MAPPING[property] || property
}

/**
 * Get the property name from a frontmatter field name (reverse lookup)
 */
export function getPropertyFromFrontmatterField(
  frontmatterField: string,
  settings: OccurrencesPluginSettings
): keyof OccurrenceObject | null {
  // Tags is hardcoded to always use "tags"
  if (frontmatterField === "tags") {
    return "tags"
  }

  // Check if it's a direct match first
  const directMatch = Object.keys(DEFAULT_PROPERTY_MAPPING).find(
    key => key === frontmatterField
  ) as keyof OccurrenceObject | undefined

  if (directMatch && (directMatch === "path" || directMatch === "file" || directMatch === "title")) {
    return directMatch
  }

  // Reverse lookup in settings
  const property = Object.keys(settings.propertyMapping).find(
    key => settings.propertyMapping[key] === frontmatterField
  ) as keyof OccurrenceObject | undefined

  if (property) {
    return property
  }

  // Fallback to default mapping
  const defaultProperty = Object.keys(DEFAULT_PROPERTY_MAPPING).find(
    key => DEFAULT_PROPERTY_MAPPING[key as keyof OccurrenceObject] === frontmatterField
  ) as keyof OccurrenceObject | undefined

  return defaultProperty || null
}

