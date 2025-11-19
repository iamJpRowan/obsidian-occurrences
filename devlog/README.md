# Development Log

This directory contains historical development decisions, considerations, and architectural choices made during the development of the Occurrences plugin.

## Purpose

The devlog serves as a record of:
- **Context**: Why decisions were made
- **Considerations**: What alternatives were evaluated
- **Decisions**: What was chosen and why (with attribution)
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
- **Considerations**: Options evaluated and trade-offs
- **Decision Log**: Tracked decisions with user and AI attribution
- **Implementation Details**: How it was implemented
- **Future Considerations**: Potential improvements or changes

### Decision Log Format

Each decision in the decision log should include:
- **Decision**: What was decided
- **Rationale**: Why this decision was made
- **Attribution**: Who made the decision (User/AI Model)
- **Date**: When the decision was made

Example:
```markdown
### Decision: Use in-memory Map for storage
- **Rationale**: Fast access, simple implementation, acceptable for single-user environment
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-16
```

## Entries

- [2025-11-16: Current Architecture and State](2025-11-16-current-architecture.md) - Current state of the plugin architecture and design decisions
- [2025-11-18: DateTime Selector Feature](2025-11-18-datetime-selector-feature.md) - Implementation of date, time, and timezone selection for occurrences
