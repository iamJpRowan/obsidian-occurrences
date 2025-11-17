# Contributing

Thank you for your interest in contributing to the Occurrences plugin!

## Development Guidelines

This project follows the patterns and conventions documented in [.cursorrules.md](../.cursorrules.md). Please review these guidelines before contributing.

## Core Principles

### Use Native Obsidian API

- Always check `node_modules/obsidian/obsidian.d.ts` for complete type definitions
- Prefer using Obsidian's built-in classes and methods
- Extend existing Obsidian classes when possible
- Avoid importing Node.js modules (breaks mobile compatibility)

### Match Obsidian's Look and Feel

- Use Obsidian's CSS classes and variables
- Limit custom CSS
- Style UI elements to match Obsidian's design
- Test on both light and dark themes

### Maintain Mobile Compatibility

- This plugin is used on mobile as often as desktop
- Do not import Node.js modules
- Consider touch interactions in component design
- Test on mobile when possible

## Development Context

**Single User Environment**: This plugin is currently used by only one developer. This means:

- Breaking changes are acceptable
- Experimental approaches are welcome
- Rapid iteration is preferred
- Direct implementation over cautious phased approaches

## Code Style

### TypeScript

- Use TypeScript strict mode
- All public methods must have JSDoc comments
- Prefer explicit types over `any`
- Use interfaces for object shapes

### File Organization

- Each directory should have a clear single responsibility
- Keep related functionality together
- Use index files for clean imports
- Follow existing directory structure

### Naming Conventions

- **Classes**: PascalCase (`OccurrenceStore`)
- **Functions/Methods**: camelCase (`processFile`)
- **Files**: camelCase for classes, kebab-case for utilities
- **Types/Interfaces**: PascalCase (`OccurrenceObject`)
- **Constants**: UPPER_SNAKE_CASE (`OCCURRENCE_DATE_FORMAT`)

### Method Documentation

All public methods should have JSDoc comments:

```typescript
/**
 * Process a single file and return its parsed occurrence object
 * @param file The file to process
 * @returns The parsed occurrence object or null if file should be ignored
 */
public async processFile(file: TFile): Promise<OccurrenceObject | null> {
  // ...
}
```

### Method Design

- Methods should be explicit in their purpose
- Avoid side effects that aren't obvious from the method name
- Prefer pure functions when possible
- Keep methods focused on a single responsibility

## Architectural Patterns

### Store Pattern

The store pattern separates concerns:
- **OccurrenceStore**: Main store class
- **FileOperations**: File parsing and operations
- **StoreOperations**: CRUD operations
- **EventHandler**: File system events
- **OccurrenceSearch**: Search and indexing

### Service Pattern

View services encapsulate specific functionality:
- **FilterService**: Filter state management
- **SearchService**: Search execution
- **EventService**: Event handling

### Component Composition

UI components are composable:
- Each component has a single responsibility
- Components communicate via callbacks
- State flows down, events flow up

## Key Conventions

### File Path as Unique Identifier

- `file.path` is the only reliable unique identifier
- When `file.path` changes (rename), remove old path and add new path
- This prevents duplicates and ensures proper cleanup

### Event Handling

- Event handling functions should live directly in the `registerEvents` callback
- Use Obsidian's event system when possible
- Handle errors gracefully

### Directory Responsibilities

- `occurrenceStore/` - Data management and file operations
- `occurrencesView/` - UI components and view logic
- `occurrenceList/` - List rendering components
- Each directory should have a clear single responsibility

## Making Changes

### Before You Start

1. Review [.cursorrules.md](../.cursorrules.md)
2. Review [architecture.md](architecture.md) for design patterns
3. Check existing code for similar patterns

### Development Process

1. Make your changes following existing patterns
2. Test in Obsidian (reload after changes)
3. Check console for errors
4. Update documentation if needed (see below)

### Documentation Updates

When making changes, update documentation as needed:

- **User-facing changes** → Update [README.md](../README.md)
- **Architectural decisions** → Create devlog entry in [devlog/](../devlog/)
- **Development setup changes** → Update [docs/development.md](development.md)
- **Code structure changes** → Update [docs/architecture.md](architecture.md)
- **Pattern changes** → Update [.cursorrules.md](../.cursorrules.md)

See [.cursorrules.md](../.cursorrules.md) for the documentation update checklist.

## Testing

Currently, testing is done manually in Obsidian:

1. Make changes to code
2. Run `npm run dev` (or it should already be running)
3. Reload Obsidian (Cmd/Ctrl + R)
4. Test the functionality
5. Check console for errors

### Testing Checklist

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Works on both desktop and mobile (if applicable)
- [ ] Works with light and dark themes
- [ ] Edge cases handled gracefully

## Code Review Process

Since this is a single-user environment:

- Self-review before committing
- Test thoroughly
- Update documentation
- Commit with clear messages

## Commit Messages

Use clear, descriptive commit messages:

```
Add date range filtering to occurrences view

- Added dateFrom and dateTo options to SearchOptions
- Updated FilterControls to include date range picker
- Updated FilterService to handle date range filters
- Updated README.md with date filtering documentation
```

## Questions?

- Check [.cursorrules.md](../.cursorrules.md) for development guidelines
- Check [architecture.md](architecture.md) for design patterns
- Check [development.md](development.md) for setup and workflow
- Review existing code for examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

