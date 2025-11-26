# 2025-11-19: File Selector Filtering Feature

**Attribution**: 
- Developer: jprowan
- AI Model: claude-3.5-sonnet (via Cursor)

## Context

The OccurrenceModal includes three file-select fields: "Location", "Participants", and "Topics". As vaults grow, the file suggestion lists become unwieldy, making it difficult for users to find the specific files they need. Users needed a way to filter these suggestions based on:
- **Folders**: Include or exclude files from specific folders
- **Tags**: Include or exclude files with specific frontmatter tags

The feature needed to:
- Provide an intuitive UI for configuring filters in settings
- Apply filters in real-time to file suggestions
- Support both include and exclude logic for folders and tags
- Work seamlessly with existing SingleFileSelector and MultiFileSelector components
- Maintain good performance even with large vaults

## Decisions

### Filtering Implementation Approach

- **Cached filtering**: Pre-compute filtered file lists and cache results
  - Pros: Better performance for very large vaults
  - Cons: More complex implementation, cache invalidation complexity
- **Real-time filtering**: Apply filters directly to `getMarkdownFiles()` results
  - Pros: Simpler implementation, leverages Obsidian's optimizations
  - Cons: May be slower for very large vaults (can add caching later)

**Decision**: Real-time filtering without caching
- **Rationale**: Simpler implementation, Obsidian's internal optimizations provide good performance. Can add caching later if performance issues arise. Reduces complexity and maintenance burden.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-19

### Filter Application Order

- **Query first**: Apply search query, then filters
  - Cons: Less efficient, processes larger dataset
- **Filters first**: Apply faster filters (folders) before slower ones (tags), then query
  - Pros: Reduces dataset size before expensive operations

**Decision**: Optimized filter order (folders → tags → query)
- **Rationale**: Folder path matching is faster than tag lookups. By applying folder filters first, we reduce the dataset size before more expensive tag operations. Query filtering happens last on the smallest dataset.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-19

### Settings UI Design

- **Separate section**: Dedicated "File Filters" section in settings
  - Pros: More discoverable
  - Cons: Takes more space, less contextual
- **Inline expandable**: Filter settings inline with each property, expandable via icon
  - Pros: Compact, contextual, reduces visual clutter
  - Cons: Less discoverable (relies on icon)

**Decision**: Inline expandable filter settings
- **Rationale**: Keeps filter settings contextual to their related properties. Compact design reduces visual clutter while maintaining discoverability through the filter icon. Matches user's preference for clean, organized settings UI.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-19

### Filter Input UI

- **Comma-separated text inputs**: Simple text fields with autocomplete (initially implemented)
  - Pros: Simple implementation
  - Cons: Poor UX, hard to see selections, difficult to manage
- **Pill-based multi-select**: Visual pills for selected items with autocomplete dropdown
  - Pros: Better visual feedback, easier selection, matches existing patterns
  - Cons: More complex implementation

**Decision**: Pill-based multi-select component
- **Rationale**: Provides better user experience than comma-separated text inputs. Visual feedback with pills, easier selection from autocomplete, matches existing component patterns (TagSelector, MultiFileSelector). Users can see all selections at a glance.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-19

### Visual Design

- **Filter icon color**: Use accent color when filters are enabled
- **Pill styling**: Folder pills styled like file pills, tag pills styled like tags

**Decision**: Visual consistency approach
- **Rationale**: Folder pills match file selector style (gray background, less rounded), tag pills match tag style (colored background, more rounded). Filter icon provides clear enabled state. Creates intuitive visual distinction.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-19

### Tag Source

- **Occurrence store only**: Only tags from files with occurrences
  - Cons: Limited tag list, doesn't match user expectations
- **All vault tags**: Scan all markdown files for tags in frontmatter
  - Pros: Complete tag list, matches user expectations

**Decision**: Get all tags from vault, not just occurrence store
- **Rationale**: Provides complete tag list for filtering. Users expect to filter by any tag in their vault, not just tags from files with occurrences. More useful and intuitive.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-19

## Implementation Details

### Settings Structure

Added `FileSelectorFilterSettings` interface to `src/settings.ts`:

```typescript
export interface FileSelectorFilterSettings {
  enabled?: boolean
  folders?: {
    include?: string[]
    exclude?: string[]
  }
  tags?: {
    include?: string[]
    exclude?: string[]
  }
}

export interface OccurrencesPluginSettings {
  // ... existing properties
  fileSelectorFilters: {
    location: FileSelectorFilterSettings
    participants: FileSelectorFilterSettings
    topics: FileSelectorFilterSettings
  }
}
```

### FilterMultiSelect Component

Created `src/settingsTab/components/FilterMultiSelect.ts` - a reusable pill-based multi-select component with:
- **Pill display**: Selected items shown as interactive pills
- **Autocomplete suggestions**: Real-time filtered suggestions dropdown
- **Keyboard navigation**: Arrow keys, Enter, Escape support
- **Mouse interaction**: Click to select, hover to highlight
- **Debounced input**: 200ms debounce for performance
- **Pill styling**: Supports both 'folder' and 'tag' styles

Key features:
- `onSelectionChange` callback to update parent settings
- `suggestions` array passed via options
- `pillStyle` option to control visual appearance
- `updateDisplay()` method to re-render pills
- Proper component lifecycle management

### Settings UI Implementation

Updated `src/settingsTab.ts` to:
- Add filter icon button next to each file-select property (Location, Participants, Topics)
- Create expandable filter section with enable toggle
- Use `FilterMultiSelect` for four filter inputs:
  - Include folders
  - Exclude folders
  - Include tags
  - Exclude tags
- Update filter icon color based on enabled state
- Initialize icon color on display

### Filter Application Logic

Updated `SingleFileSelector.ts` and `MultiFileSelector.ts` to:
- Accept `filterSettings` in options
- Apply filters in optimized order: `applyFolderFilters()` → `applyTagFilters()` → query filter
- Remove 10-result limit (show all filtered results)
- Handle both include and exclude logic

**Folder filtering:**
- Include: File path must start with at least one included folder
- Exclude: File path must not start with any excluded folder
- Normalizes folder paths (adds trailing slash if missing)

**Tag filtering:**
- Include: File must have at least one of the included tags in frontmatter
- Exclude: File must not have any of the excluded tags in frontmatter
- Reads tags from `fileCache.frontmatter.tags` (supports array or single value)

### Helper Methods

Added to `settingsTab.ts`:
- `getAllFolders()`: Scans all markdown files, extracts unique folder paths, returns sorted array
- `getAllTags()`: Scans all markdown files, extracts tags from frontmatter, handles both array and single tag formats, returns sorted unique tags

### CSS Styling

Created `src/settingsTab.css` with:
- Filter icon accent color styling (`.file-filter-icon-enabled`)
- FilterMultiSelect component styles
- Folder pill styles (matches file pill appearance)
- Tag pill styles (matches tag appearance)
- Suggestions dropdown styling

**Folder pill style:**
- Gray background (`var(--background-modifier-border)`)
- 4px border radius
- Normal text color
- Remove button: muted color, turns red on hover

**Tag pill style:**
- Tag-colored background (`var(--tag-background)`)
- 12px border radius
- Tag text color
- Remove button: tag color, hover background

### Integration Points

- `OccurrenceModal.ts`: Passes filter settings from plugin settings to file selectors
- Settings are saved automatically when changed
- No migration needed (backward compatible, filters default to disabled)

## Future Considerations

### Performance Optimization
- Current real-time filtering works well for typical vaults
- Could add caching if performance issues arise with very large vaults (1000+ files)
- Could cache folder/tag lists if they become expensive to compute

### Filter Suggestions
- Currently shows all folders/tags from vault
- Could add search/filter within suggestions dropdown
- Could prioritize recently used folders/tags

### Filter Presets
- Could allow saving filter configurations as presets
- Could share filter presets between properties
- Could export/import filter configurations

### Advanced Filtering
- Could add date-based filtering (files modified/created within date range)
- Could add file name pattern matching
- Could add frontmatter field-based filtering

### UI Improvements
- Could add filter count indicators (e.g., "3 folders, 2 tags")
- Could add "Clear all filters" button
- Could add filter validation/error messages

### Accessibility
- FilterMultiSelect uses keyboard navigation
- Could add ARIA labels for better screen reader support
- Could add keyboard shortcuts for common filter operations

### Testing
- Filter logic should be unit tested
- Component interaction should be integration tested
- Edge cases: empty filters, overlapping include/exclude, invalid paths/tags

### Documentation
- Could add tooltips explaining filter behavior
- Could add examples in settings UI
- Could document filter syntax/patterns

