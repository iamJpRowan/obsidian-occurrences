# 2025-11-18: DateTime Selector Feature

**Attribution**: 
- Developer: jprowan
- AI Model: claude-3.5-sonnet (via Cursor)

## Context

The OccurrenceModal needed a way to capture the "occurred at" timestamp for occurrences with support for date, time, and timezone selection. The initial implementation used separate inputs, but the user wanted a unified input experience that matched the style of other form fields in the modal.

The feature needed to:
- Support date, time, and timezone selection
- Preserve the selected timezone when saving to frontmatter
- Display the saved timezone when editing existing occurrences
- Match the visual style of other form fields (like TagSelector)
- Work seamlessly with the existing frontmatter storage format

## Decisions

### UI/UX Approach

- **Separate inputs**: Date, time, and timezone as distinct fields (initially implemented)
- **Unified input**: Single field appearance with segmented editing
  - Cons: More complex implementation, less accessible
- **Always-visible native inputs**: Three native inputs styled to look unified
  - Pros: Best accessibility, no custom date picker needed, matches user's preference for direct editing

**Decision**: Always-visible native HTML5 inputs
- **Rationale**: Best accessibility, no need for custom date picker implementation, provides native browser date/time pickers. Users can directly edit any of the three values (date, time, timezone).
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-18

### Timezone Handling

- **Local timezone only**: Convert all times to user's local timezone
  - Cons: Loses timezone information, inaccurate for events in different timezones
- **Preserve selected timezone**: Store the exact timezone offset selected by user
  - Pros: Maintains accuracy for events in different timezones, allows proper timezone display when editing

**Decision**: Preserve selected timezone offset in frontmatter
- **Rationale**: Maintains accuracy for events occurring in different timezones. When editing, the original timezone is displayed, not converted to local timezone. Critical for users who track events across timezones.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-18

### Component Architecture

- **Inline implementation**: Date/time logic directly in OccurrenceModal
  - Cons: Harder to maintain, less reusable
- **Standalone component**: Separate DateTimeSelector component
  - Pros: Better separation of concerns, reusable, easier to test and maintain

**Decision**: Create standalone DateTimeSelector component
- **Rationale**: Better separation of concerns, reusable, easier to test and maintain. Follows the same pattern as TagSelector and other form components.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-18

### Styling Approach

- **Field wrapper with label**: Traditional form field with label and border (initially implemented)
  - Cons: Takes more space, less integrated appearance
- **Minimal styling**: No wrapper, no label, inputs sit directly on modal
  - Pros: Cleaner, more integrated appearance, matches user's preference

**Decision**: Minimal styling - no wrapper, no label, no separators
- **Rationale**: Matches user's preference for cleaner, more integrated appearance. Text sits directly on the modal, creating a more seamless experience.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-18

### Timezone Offset Storage

- **ISO 8601 format**: Store as `YYYY-MM-DDTHH:mm:ss+/-HH:MM`
  - Pros: Standard format, easy to parse, preserves timezone information
- **UTC only**: Convert to UTC and store offset separately
  - Cons: More complex, requires separate storage

**Decision**: ISO 8601 format
- **Rationale**: Standard format, easy to parse, preserves timezone information. Widely supported and human-readable.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-18

### Code Organization

- **Duplicate timezone logic**: Keep timezone conversion in both DateTimeSelector and OccurrenceModal
  - Cons: Code duplication, harder to maintain
- **Shared utilities**: Extract timezone utilities to shared module
  - Pros: Eliminates duplication, centralizes logic, easier to test

**Decision**: Extract timezone utilities to shared module
- **Rationale**: Eliminates code duplication across DateTimeSelector and OccurrenceModal. Centralizes timezone conversion logic for easier maintenance and testing. Reduces ~100+ lines of duplicate code.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-18

### Timezone Offset Tracking

- **Date object only**: Rely solely on JavaScript Date object
  - Cons: Date objects always convert to local timezone, loses original timezone
- **Separate offset storage**: Store timezone offset separately from Date object
  - Pros: Preserves original timezone, allows proper display when editing

**Decision**: Store timezone offset separately from Date object
- **Rationale**: JavaScript Date objects always convert to local timezone. By storing the selected timezone offset separately, we can preserve and display the original timezone when editing. The Date object is still used for calculations, but the timezone offset is tracked independently.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-18

## Implementation Details

### Component Structure

```
DateTimeSelector (Component)
  ├── dateInput (HTMLInputElement, type="date")
  ├── timeInput (HTMLInputElement, type="time")
  ├── timezoneSelect (HTMLSelectElement)
  ├── selectedTimezoneOffset (string | null)
  └── Methods:
      ├── setValue(date, timezoneOffset?)
      ├── getValue(): Date | null
      ├── getTimezoneOffset(): string | null
      └── dateToLocalStrings(date, timezoneOffset)
```

### Timezone Utilities Module

Created `src/occurrenceModal/utils/timezoneUtils.ts` with:
- `timezoneOffsetToISOString(offsetMinutes)`: Converts JavaScript timezone offset to `+/-HH:MM` format
- `parseTimezoneOffset(offsetString)`: Parses timezone offset string to minutes
- `extractTimezoneFromISOString(isoString)`: Extracts timezone from ISO date strings
- `getLocalTimezoneOffset()`: Gets user's local timezone offset

### Frontmatter Format

Dates are stored in frontmatter as ISO 8601 strings with timezone:
```
occurred_at: "2025-01-15T14:00:00+05:00"
```

When no timezone is provided (backward compatibility), defaults to user's local timezone.

### Timezone Selection

The timezone selector includes all UTC offsets from -12:00 to +14:00 in 15-minute increments:
- Defaults to user's local timezone
- Displays as "UTC+05:00", "UTC-08:00", etc.
- Stores value as "+05:00", "-08:00" format

### Date/Time Conversion Flow

**When setting a value:**
1. If timezone offset provided: Convert Date (UTC) to local time in that timezone
2. If no timezone: Use Date's local timezone
3. Populate date, time, and timezone inputs

**When getting a value:**
1. Read date, time, and timezone from inputs
2. Construct ISO string: `YYYY-MM-DDTHH:mm:00+/-HH:MM`
3. Create Date object from ISO string
4. Store timezone offset separately

**When saving to frontmatter:**
1. Get Date object and timezone offset from selector
2. Convert Date (UTC) to local time in specified timezone
3. Format as ISO string with timezone: `YYYY-MM-DDTHH:mm:ss+/-HH:MM`

**When loading from frontmatter:**
1. Parse Date from ISO string
2. Extract timezone offset from ISO string
3. Pass both Date and timezone offset to `setValue()`

### Styling

The component uses CSS to create a unified appearance:
- All three inputs styled to remove borders and backgrounds
- Transparent backgrounds to blend with modal
- Gap between inputs for visual separation
- Focus states for accessibility
- Native input styling preserved for date/time pickers

### Refactoring

After initial implementation, the code was refactored to:
- Extract timezone utilities to shared module
- Simplify `setValue()` method with helper function
- Reduce `formatDateForFrontmatter()` from ~60 lines to ~28 lines
- Remove duplicate timezone conversion logic (~100+ lines eliminated)
- Remove unused options parameter from DateTimeSelector

## Future Considerations

### Timezone Display
- Could add timezone name display (e.g., "PST", "EST") in addition to offset
- Could use IANA timezone identifiers instead of just offsets
- Would require a timezone database/library

### Date/Time Validation
- Currently relies on native input validation
- Could add custom validation for edge cases
- Could validate against future dates if needed

### Date Format Options
- Currently uses ISO 8601 format in frontmatter
- Could make format configurable
- Could support different display formats

### Performance
- Timezone selector generates ~100+ options
- Could lazy-load or virtualize if performance becomes an issue
- Current implementation is fast enough for typical use

### Accessibility
- Uses native inputs for best accessibility
- ARIA labels on all inputs
- Keyboard navigation works natively
- Could add additional ARIA attributes if needed

### Testing
- Utility functions are good candidates for unit tests
- Component could benefit from integration tests
- Timezone conversion logic should be thoroughly tested

### Internationalization
- Date/time format follows user's locale via native inputs
- Timezone display could be localized
- Could support different date format preferences

