# Architecture

This document describes the architecture, design patterns, and key components of the Occurrences plugin.

## Overview

The Occurrences plugin follows a modular architecture with clear separation of concerns:
- **Store Layer**: Manages occurrence data and file operations
- **View Layer**: Handles UI and user interactions
- **Service Layer**: Provides filtering, search, and event handling

## Core Architecture

### Store Pattern

The plugin uses an in-memory store pattern with file system event watching:

```
OccurrenceStore (Main Store)
  ├── items: Map<string, OccurrenceObject>
  ├── FileOperations (file parsing, validation)
  ├── StoreOperations (CRUD operations)
  ├── EventHandler (file system events)
  └── OccurrenceSearch (search and indexing)
```

### Data Flow

1. **File System Event** → EventHandler detects change
2. **File Parsing** → FileOperations parses frontmatter
3. **Store Update** → StoreOperations updates Map and indexes
4. **Event Notification** → EventHandler triggers view updates
5. **View Refresh** → View applies filters and re-renders

## Key Components

### OccurrenceStore

**Location**: `src/occurrenceStore/index.ts`

The main store class that coordinates all store-related operations.

**Responsibilities**:
- Maintains in-memory Map of occurrences
- Coordinates file operations, store operations, events, and search
- Provides public API for loading and querying occurrences

**Key Methods**:
- `load()` - Initial load of all occurrences
- `getAllOccurrences()` - Get all occurrences
- `search()` - Search occurrences with filters

### FileOperations

**Location**: `src/occurrenceStore/fileOperations.ts`

Handles all file-related operations.

**Responsibilities**:
- Parse markdown files and extract frontmatter
- Validate files and determine if they're occurrences
- Generate expected filenames based on content
- Normalize and compare occurrence objects

**Key Methods**:
- `isRelevantFile(path)` - Check if file is an occurrence
- `processFile(file)` - Parse file into OccurrenceObject
- `generateFileName(file)` - Generate expected filename

**File Detection**:
- Files must be in `Occurrences/` directory
- Files must have `.md` extension
- Files should have `occurred_at` frontmatter field

### StoreOperations

**Location**: `src/occurrenceStore/storeOperations.ts`

Handles CRUD operations on the store.

**Responsibilities**:
- Add, update, remove occurrences
- Maintain search indexes
- Trigger events for view updates

**Key Methods**:
- `addOccurrence(item)` - Add occurrence to store
- `updateOccurrence(item)` - Update occurrence in store
- `removeOccurrenceFromPath(path)` - Remove occurrence by path

### EventHandler

**Location**: `src/occurrenceStore/eventHandler.ts`

Handles file system events and metadata cache changes.

**Responsibilities**:
- Watch for file create, modify, delete, rename events
- Watch for metadata cache updates
- Coordinate store updates based on events
- Handle file renaming logic

**Event Types**:
- `vault-create` - New file created
- `vault-modify` - File modified
- `vault-delete` - File deleted
- `vault-rename` - File renamed
- `metadata-change` - Frontmatter changed

### OccurrenceSearch

**Location**: `src/occurrenceStore/search.ts`

Provides search and filtering capabilities.

**Responsibilities**:
- Maintain search indexes (tags, dates)
- Perform searches with multiple filters
- Support pagination and sorting

**Indexes**:
- `tagIndex`: Map<tag, Set<filePaths>>
- `dateIndex`: Map<"YYYY-MM-DD", Set<filePaths>>

**Search Options**:
- `query` - Text search in titles
- `tags` - Filter by tags
- `linksTo` - Find occurrences linking to a file
- `toProcess` - Filter by processing status
- `dateFrom` / `dateTo` - Date range filtering
- `sortOrder` - Ascending or descending
- `limit` / `offset` - Pagination

### OccurrencesView

**Location**: `src/occurrencesView/index.ts`

Main UI view extending Obsidian's `ItemView`.

**Responsibilities**:
- Render occurrence list
- Manage view state and filters
- Coordinate with services for filtering/searching
- Handle user interactions

**Child Components**:
- `Header` - View header with title
- `FilterControls` - Filter UI components
- `OccurrenceList` - List of occurrences
- `EmptyState` - Empty state message

**Services**:
- `FilterService` - Manages filter state
- `SearchService` - Handles search queries
- `EventService` - Listens to store events

### View Services

#### FilterService

**Location**: `src/occurrencesView/services/filterService.ts`

Manages filter state and applies filters.

**Responsibilities**:
- Maintain current filter state
- Apply filters to occurrence list
- Notify view of filter changes

#### SearchService

**Location**: `src/occurrencesView/services/searchService.ts`

Handles search functionality.

**Responsibilities**:
- Execute search queries
- Coordinate with OccurrenceSearch
- Provide search results to view

#### EventService

**Location**: `src/occurrencesView/services/eventService.ts`

Listens to store events and updates view.

**Responsibilities**:
- Listen to store events (loaded, item-added, item-updated, item-removed)
- Update view when store changes
- Handle active file changes

## Design Patterns

### Service Pattern

Services encapsulate specific functionality:
- **FilterService**: Filter state management
- **SearchService**: Search execution
- **EventService**: Event handling

### Component Composition

UI is built from composable components:
- Each component has a single responsibility
- Components communicate via callbacks
- State flows down, events flow up

### Event-Driven Updates

Store changes trigger view updates:
- Store operations trigger events
- EventService listens to events
- View refreshes based on events

### In-Memory Indexing

Search uses in-memory indexes for performance:
- Indexes updated on add/update/remove
- Fast lookups without scanning all items
- Trade-off: Memory usage vs. speed

## Data Structures

### OccurrenceObject

```typescript
interface OccurrenceObject {
  path: string              // File path (unique identifier)
  file: TFile              // Obsidian file reference
  title: string            // Display title (filename without date prefix)
  tags?: string[]          // Tags from frontmatter
  occurredAt: Date         // When the occurrence happened
  toProcess: boolean       // Whether occurrence needs processing
  participants: ObsidianLink[]  // Linked participants
  intents: ObsidianLink[]       // Linked intents
  location: ObsidianLink | null // Linked location
}
```

### SearchFilters

```typescript
interface SearchFilters {
  searchQuery?: string
  selectedTags?: string[]
  selectedFiles?: string[]
  dateRange?: {
    from?: Date
    to?: Date
  }
  groupBy?: "date" | "file" | "tag"
}
```

## File Path as Unique Identifier

**Critical Pattern**: `file.path` is the only reliable unique identifier.

**Implications**:
- When a file is renamed, `file.path` changes
- Old path must be removed from store
- New path must be added to store
- This prevents duplicates and ensures proper cleanup

**Implementation**:
- EventHandler detects rename events
- Removes item with old path
- Adds item with new path
- View updates accordingly

## Frontmatter Mapping

Frontmatter fields are configurable via settings:

**Default Mappings**:
- `occurredAt` → `occurred_at`
- `toProcess` → `to_process`
- `participants` → `participants`
- `intents` → `intents`
- `location` → `location`
- `tags` → `tags` (not configurable)

**Implementation**:
- Settings stored in `OccurrencesPluginSettings`
- `getFrontmatterFieldName()` converts property to field name
- `FileOperations` uses mappings when parsing files

## Date Format

**Format**: `YYYY-MM-DD HHmm` (e.g., `2024-01-15 1400`)

**Usage**:
- Optional prefix in filenames
- Extracted and removed to get title
- Can be applied when generating filenames

**Implementation**:
- `removeDatePrefix()` - Removes date from filename
- `applyDatePrefix()` - Adds date to filename
- Uses regex pattern matching

## Error Handling

### File Processing Errors
- Invalid dates → Marked as `toProcess: true`
- Missing frontmatter → File ignored
- Parse errors → Logged to console, file skipped

### Event Handling Errors
- File not found → Gracefully handled
- Cache not ready → Retry with backoff
- Rename conflicts → Old path removed first

## Performance Considerations

### In-Memory Storage
- Fast access for typical use cases (< 1000 occurrences)
- No persistence (reloads on startup)
- Memory usage scales with number of occurrences

### Search Indexes
- Tag index: O(1) lookup by tag
- Date index: O(1) lookup by date
- Text search: O(n) scan (acceptable for current scale)

### View Rendering
- Filters applied before rendering
- Only visible items rendered
- Virtual scrolling not implemented (may be needed for large lists)

## Future Architecture Considerations

### Persistence
- Could add local storage for caching
- Could persist indexes for faster startup
- Trade-off: Complexity vs. performance

### Performance Optimizations
- Virtual scrolling for large lists
- Debounced search input
- Lazy loading of occurrence content

### Scalability
- Pagination already supported in search
- May need database for very large vaults
- Current architecture supports growth

