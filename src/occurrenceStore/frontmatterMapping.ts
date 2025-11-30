import { OccurrenceObject } from "@/types"
import { MAPPABLE_PROPERTIES, OccurrencesPluginSettings, getFrontmatterFieldName } from "@/settings"

/**
 * Get the property mapping from settings
 * This function converts the settings format to the format expected by applyFrontmatterUpdates
 */
export function getPropertyMapping(
  settings: OccurrencesPluginSettings
): Record<string, string> {
  const mapping: Record<string, string> = {}
  
  // Get all mappable properties (exclude tags which is hardcoded)
  MAPPABLE_PROPERTIES.forEach(property => {
    const frontmatterField = getFrontmatterFieldName(property, settings)
    mapping[property] = frontmatterField
  })

  // Tags is hardcoded to always use "tags"
  mapping.tags = "tags"

  return mapping
}

/**
 * Interface properties that should never be stored in frontmatter
 * These are computed or runtime-only properties
 */
export const INTERFACE_ONLY_PROPERTIES = new Set<keyof OccurrenceObject>([
  "file",
  "title",
])

/**
 * Properties that are computed dynamically and shouldn't be stored in frontmatter
 */
export const COMPUTED_PROPERTIES = new Set<string>(["children"])

/**
 * Transform a value before storing it in frontmatter based on the property type
 * Frontmatter values can be of various types (string, number, Date, array, object, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformValueForFrontmatter(key: string, value: any): any {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return undefined
  }

  // Handle Date objects - convert to ISO string with timezone
  if (value instanceof Date) {
    const localISOTime = new Date(
      value.getTime() - value.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, -1)

    const offset = value.getTimezoneOffset()
    const offsetHours = Math.floor(Math.abs(offset) / 60)
    const offsetMinutes = Math.abs(offset) % 60
    const offsetSign = offset <= 0 ? "+" : "-"
    const offsetString = `${offsetSign}${offsetHours
      .toString()
      .padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`

    return localISOTime + offsetString
  }

  // Handle arrays of objects (like links) - convert to string format
  if (
    Array.isArray(value) &&
    value.length > 0 &&
      typeof value[0] === "object" &&
      value[0] !== null &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      value[0].target
  ) {
    return value
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .map(item => (item && item.target ? `[[${item.target}]]` : null))
      .filter(item => item !== null)
  }

  // Handle arrays with null values - filter out nulls
  if (Array.isArray(value) && value.some(item => item === null)) {
    return value.filter(item => item !== null)
  }

  // Handle single objects with target (like links) - convert to string format
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (value && typeof value === "object" && value.target) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return `[[${value.target}]]`
  }

  return value
}

/**
 * Generic function to apply frontmatter updates using a property mapping
 */
/**
 * Apply frontmatter updates using a property mapping
 * @param frontmatter - Obsidian's frontmatter object (inherently any type)
 */
export function applyFrontmatterUpdates<T extends OccurrenceObject>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontmatter: any,
  updates: Partial<T>,
  propertyMapping: Record<string, string>
): void {
  // Process mapped properties first (these take precedence)
  for (const [interfaceProperty, frontmatterField] of Object.entries(
    propertyMapping
  )) {
    if (updates[interfaceProperty as keyof T] !== undefined) {
      const value = updates[interfaceProperty as keyof T]
      // transformValueForFrontmatter returns any due to frontmatter type flexibility
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const transformedValue = transformValueForFrontmatter(
        interfaceProperty,
        value
      )

      if (Array.isArray(transformedValue) && transformedValue.length === 0) {
        // Remove empty arrays
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete frontmatter[frontmatterField]
      } else if (
        transformedValue !== undefined &&
        transformedValue !== null &&
        transformedValue !== ""
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        frontmatter[frontmatterField] = transformedValue
      } else {
        // Remove undefined/null/empty values
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete frontmatter[frontmatterField]
      }
    }
  }

  // Process unmapped properties (but skip interface-only, computed, and already-mapped properties)
  const mappedInterfaceProperties = new Set(Object.keys(propertyMapping))
  const frontmatterFieldNames = new Set(Object.values(propertyMapping))

  for (const [key, value] of Object.entries(updates)) {
    const isInterfaceOnlyProperty = INTERFACE_ONLY_PROPERTIES.has(
      key as keyof OccurrenceObject
    )
    const isComputedProperty = COMPUTED_PROPERTIES.has(key)
    const isAlreadyMappedProperty = mappedInterfaceProperties.has(key)
    const isFrontmatterFieldName = frontmatterFieldNames.has(key)

    if (
      !isInterfaceOnlyProperty &&
      !isComputedProperty &&
      !isAlreadyMappedProperty &&
      !isFrontmatterFieldName
    ) {
      // transformValueForFrontmatter returns any due to frontmatter type flexibility
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const transformedValue = transformValueForFrontmatter(key, value)

      if (
        transformedValue !== undefined &&
        transformedValue !== null &&
        transformedValue !== ""
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        frontmatter[key] = transformedValue
      } else {
        // Remove undefined/null/empty values
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete frontmatter[key]
      }
    }
  }
}
