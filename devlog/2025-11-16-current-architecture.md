# 2025-11-16: Current Architecture and State

**Attribution**: 
- Developer: jprowan
- AI Model: claude-3.5-sonnet (via Cursor)

## Context

The Occurrences plugin is a working Obsidian plugin that tracks time-stamped events (occurrences) in a vault. The plugin provides filtering, search, and viewing capabilities for occurrences stored as markdown files with frontmatter.

Current state of the plugin:
- Fully functional occurrence tracking and viewing
- File system event watching for automatic updates
- Configurable frontmatter field mappings
- Search and filtering capabilities
- Mobile and desktop compatible

## Considerations

### Data Storage
- **In-memory Map**: Fast access, simple implementation, but lost on reload
- **Persistent storage**: More complex, but survives reloads
- **Decision**: In-memory Map - acceptable for single-user environment, can reload on startup

### File Detection
- **Polling**: Check files periodically (inefficient)
- **File system events**: React to changes immediately (efficient)
- **Decision**: File system events via Obsidian's metadata cache and vault events

### Architecture Pattern
- **Monolithic**: All logic in one class (hard to maintain)
- **Separated concerns**: Store, operations, events, UI (maintainable)
- **Decision**: Separated concerns with clear responsibilities

### Frontmatter Mapping
- **Hardcoded field names**: Simple but inflexible
- **Configurable mappings**: More complex but flexible
- **Decision**: Configurable mappings with sensible defaults

## Decision Log

### Decision: Use in-memory Map for storage
- **Rationale**: Fast access, simple implementation, acceptable for single-user environment. Can reload on startup. No persistence needed for current scale.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: Use file system events for file detection
- **Rationale**: More efficient than polling, reacts immediately to changes. Leverages Obsidian's metadata cache and vault events.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: Separate concerns architecture pattern
- **Rationale**: More maintainable than monolithic approach. Clear separation between store, operations, events, and UI. Easier to test and modify.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: Configurable frontmatter field mappings
- **Rationale**: Provides flexibility for different vault structures while maintaining sensible defaults. Users can customize field names to match their existing frontmatter.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: Store Architecture Components
- **Rationale**: Separated into OccurrenceStore (main), FileOperations (parsing), StoreOperations (CRUD), EventHandler (events), OccurrenceSearch (search). Each has clear single responsibility.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: View Architecture with Services Pattern
- **Rationale**: OccurrencesView extends ItemView. Uses services (FilterService, SearchService, EventService) for view logic. Component composition for UI. View maintains filtered state, store maintains source of truth.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: File path as unique identifier
- **Rationale**: `file.path` is the only reliable unique identifier in Obsidian. When file.path changes (rename), item is removed and re-added with new path to prevent duplicates.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: Files in Occurrences/ directory with .md extension
- **Rationale**: Simple file detection pattern. Hardcoded for now, but could be made configurable. Files must have occurred_at frontmatter field.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: Optional date prefix in filenames (YYYY-MM-DD HHmm)
- **Rationale**: Allows date-based file organization while keeping titles readable. Date is extracted and removed to get title. Can be applied when generating filenames.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

### Decision: In-memory search indexes
- **Rationale**: Fast lookups without scanning all items. Tag index and date index updated on add/update/remove. Trade-off: memory usage vs. speed, acceptable for current scale.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16

## Current Implementation

### Store Pattern
```typescript
OccurrenceStore
  ├── items: Map<string, OccurrenceObject>
  ├── FileOperations (file parsing, validation)
  ├── StoreOperations (CRUD operations)
  ├── EventHandler (file system events)
  └── OccurrenceSearch (search and indexing)
```

### Event Flow
1. File system event detected (create, modify, delete, rename)
2. EventHandler processes event
3. FileOperations parses file and creates OccurrenceObject
4. StoreOperations updates store and search indexes
5. EventHandler triggers view update events
6. View refreshes filtered results

### View Services
- **FilterService**: Manages filter state and applies filters
- **SearchService**: Handles search queries and results
- **EventService**: Listens to store events and updates view

### File Path as Unique Identifier
- `file.path` is the only reliable unique identifier
- When file.path changes (rename), item is removed and re-added with new path
- This ensures no duplicate entries and proper cleanup

### Frontmatter Mapping
- Default mappings: `occurredAt` → `occurred_at`, `toProcess` → `to_process`, etc.
- Configurable via settings
- Tags always use `tags` field (not configurable)

### Date Format
- Format: `YYYY-MM-DD HHmm` (e.g., `2024-01-15 1400`)
- Optional prefix in filenames
- Extracted and removed to get title
- Can be applied when generating filenames

## Future Considerations

### Persistence
- Consider adding persistent storage if memory usage becomes an issue
- Could use Obsidian's local storage API for caching
- May need for very large vaults (1000+ occurrences)

### Performance
- Current in-memory approach is fast for typical use cases
- May need pagination or virtualization for very large lists
- Search indexes are simple but effective for current scale

### File Organization
- Currently hardcoded to `Occurrences/` directory
- Could make this configurable in settings
- Could support multiple directories or patterns

### Date Format
- Currently hardcoded to `YYYY-MM-DD HHmm`
- Could make this configurable
- Could support multiple date formats

### Search Improvements
- Current search is basic text matching
- Could add fuzzy search
- Could add search highlighting
- Could add saved searches

### Mobile Optimization
- Current UI should work on mobile but may need optimization
- Touch interactions may need refinement
- Filter controls may need mobile-specific layouts

