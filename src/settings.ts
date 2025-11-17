import { OccurrenceObject } from "./types"

/**
 * Properties that can be mapped to frontmatter fields
 * Note: path, file, and title are interface-only properties and should not be mapped
 * Tags is hardcoded to always use "tags" and is not configurable
 */
export const MAPPABLE_PROPERTIES: (keyof OccurrenceObject)[] = [
  "occurredAt",
  "toProcess",
  "participants",
  "topics",
  "location",
]

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
    topics: "topics",
    location: "location",
  },
}

/**
 * Default property mapping configuration
 * Derived from DEFAULT_SETTINGS for backward compatibility
 * Maps OccurrenceObject interface properties to frontmatter field names
 */
export const DEFAULT_PROPERTY_MAPPING: Partial<Record<keyof OccurrenceObject, string>> =
  DEFAULT_SETTINGS.propertyMapping as Partial<Record<keyof OccurrenceObject, string>>

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

  // Check if it's a direct match first (interface-only properties)
  if (frontmatterField === "path" || frontmatterField === "file" || frontmatterField === "title") {
    return frontmatterField as keyof OccurrenceObject
  }

  // Reverse lookup in settings
  const property = Object.keys(settings.propertyMapping).find(
    key => settings.propertyMapping[key] === frontmatterField
  ) as keyof OccurrenceObject | undefined

  if (property) {
    return property
  }

  // Fallback to default settings mapping
  const defaultProperty = Object.keys(DEFAULT_SETTINGS.propertyMapping).find(
    key => DEFAULT_SETTINGS.propertyMapping[key] === frontmatterField
  ) as keyof OccurrenceObject | undefined

  return defaultProperty || null
}

