# Development Log

This directory contains historical development decisions, considerations, and architectural choices made during the development of the Occurrences plugin.

## Purpose

The devlog serves as a record of:
- **Context**: Why decisions were made
- **Decisions**: What alternatives were evaluated, what was chosen, and why (with attribution)
- **Implementation**: How decisions were implemented
- **Future considerations**: What might change or be improved

## Format

Each entry follows this structure:

### Header
- **Date**: Date of the entry (YYYY-MM-DD)
- **Title**: Brief description of the entry
- **Attribution**: Developer and AI model involved

### Body
- **Context**: The situation or problem that required a decision
- **Decisions**: Each decision area with options evaluated, the decision made, rationale, attribution, and date
- **Implementation Details**: How it was implemented
- **Future Considerations**: Potential improvements or changes

### Decisions Format

Each decision area should include:
- **Options evaluated**: List each option with pros/cons
- **Decision**: What was chosen
- **Rationale**: Why this decision was made
- **Attribution**: Who made the decision (User/AI Model)
- **Date**: When the decision was made

Example:
```markdown
## Filter Application Order

- **Query first**: Apply search query, then filters
  - Cons: Less efficient, processes larger dataset
- **Filters first**: Apply faster filters (folders) before slower ones (tags), then query
  - Pros: Reduces dataset size before expensive operations

**Decision**: Filters first
- **Rationale**: Folder path matching is faster than tag lookups. Reduces dataset size before expensive operations.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-19
```

## Entries

- [2025-11-16: Current Architecture and State](2025-11-16-current-architecture.md) - Current state of the plugin architecture and design decisions
- [2025-11-18: DateTime Selector Feature](2025-11-18-datetime-selector-feature.md) - Implementation of date, time, and timezone selection for occurrences
- [2025-11-19: File Selector Filtering Feature](2025-11-19-file-selector-filtering.md) - Implementation of folder and tag filtering for file selector suggestions
- [2025-11-26: Plugin Guidelines Compliance](2025-11-26-plugin-guidelines-compliance.md) - Alignment with Obsidian Plugin Guidelines in preparation for release
