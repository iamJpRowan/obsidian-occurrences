# Development Guide

## Prerequisites

- **Node.js** v16+ and npm
- **Obsidian** (for testing)
- A text editor or IDE (VS Code, Cursor, etc.)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd obsidian-occurrences
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure build output**
   - Open `esbuild.config.mjs`
   - Update the `outDir` variable to point to your vault's `.obsidian/plugins/occurrences` directory
   - Example:
     ```javascript
     const outDir = "/path/to/your/vault/.obsidian/plugins/occurrences"
     ```

4. **Start development mode**
   ```bash
   npm run dev
   ```
   This starts watch mode which automatically rebuilds on file changes.

5. **Enable plugin in Obsidian**
   - Open Obsidian
   - Go to Settings → Community plugins
   - Enable "Occurrences" plugin
   - Reload Obsidian (Cmd/Ctrl + R) to see changes

## Project Structure

```
src/
├── main.ts                    # Plugin entry point
├── manifest.json              # Obsidian plugin manifest
├── types.ts                   # Shared TypeScript types
├── settings.ts                # Settings interface and defaults
├── settingsTab.ts             # Settings UI
├── linkUtils.ts               # Link parsing utilities
│
├── occurrenceStore/           # Core store and operations
│   ├── index.ts              # Main OccurrenceStore class
│   ├── fileOperations.ts     # File parsing and operations
│   ├── storeOperations.ts    # Store CRUD operations
│   ├── search.ts             # Search functionality and indexing
│   └── eventHandler.ts       # File system event handling
│
├── occurrencesView/          # Main UI view
│   ├── index.ts             # OccurrencesView implementation
│   ├── header.ts            # View header component
│   ├── components/          # View components
│   │   ├── dateFilter.ts
│   │   ├── fileSelector.ts
│   │   ├── filterControls.ts
│   │   ├── searchBar.ts
│   │   ├── summary.ts
│   │   ├── tagSelector.ts
│   │   └── emptyState.ts
│   ├── services/            # View services
│   │   ├── eventService.ts
│   │   ├── filterService.ts
│   │   └── searchService.ts
│   ├── types.ts             # View-specific types
│   └── styles.css            # View styles
│
└── occurrenceList/           # List rendering components
    ├── index.ts             # Exports
    ├── OccurrenceList.ts    # Main list component
    ├── OccurrenceListItem.ts # Individual list item
    ├── listGroup.ts         # Grouping logic
    ├── listItem.ts          # Base list item
    ├── GroupSelector.ts     # Group selection UI
    ├── types.ts             # List-specific types
    └── styles.css           # List styles
```

## Development Workflow

### Making Changes

1. **Edit source files** in `src/`
2. **Watch mode automatically rebuilds** (if `npm run dev` is running)
3. **Reload Obsidian** (Cmd/Ctrl + R) to see changes
4. **Check console** for errors (Settings → Advanced → Developer tools → Console)

### Build Commands

- `npm run dev` - Development mode with watch (auto-rebuild on changes)
- `npm run build` - Production build (minified, no sourcemaps)
- `npm run version` - Bump version and update manifest

### Testing

Currently, testing is done manually in Obsidian:
1. Make changes to code
2. Reload Obsidian
3. Test the functionality
4. Check console for errors

### Debugging

- **Console**: Settings → Advanced → Developer tools → Console
- **Sourcemaps**: Enabled in dev mode for easier debugging
- **Breakpoints**: Use browser DevTools (Cmd/Ctrl + Shift + I) when Obsidian is running

## Code Style

### TypeScript

- Use TypeScript strict mode
- All public methods should have JSDoc comments
- Prefer explicit types over `any`

### Obsidian API

- Use native Obsidian Plugin API when possible
- Check `node_modules/obsidian/obsidian.d.ts` for type definitions
- Extend existing Obsidian classes when possible

### File Organization

- Each directory should have a clear single responsibility
- Keep related functionality together
- Use index files for clean imports

### Naming Conventions

- Classes: PascalCase (`OccurrenceStore`)
- Functions/Methods: camelCase (`processFile`)
- Files: camelCase for classes, kebab-case for utilities
- Types/Interfaces: PascalCase (`OccurrenceObject`)

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Implement feature following existing patterns
3. Update README.md if user-facing
4. Create devlog entry if architectural decision
5. Test in Obsidian
6. Commit changes

### Modifying Settings

1. Update `DEFAULT_SETTINGS` in `src/settings.ts`
2. Update `OccurrencesPluginSettings` interface if needed
3. Update `OccurrencesSettingsTab` UI if needed
4. Update README.md configuration section

### Adding a New Filter

1. Add filter type to `SearchFilters` in `src/occurrencesView/types.ts`
2. Update `FilterService` to handle new filter
3. Update `FilterControls` component UI
4. Update search logic if needed

## Build Configuration

### esbuild.config.mjs

- **Entry**: `src/main.ts`
- **Output**: Configured `outDir` (your vault's plugin directory)
- **Format**: CommonJS (required by Obsidian)
- **Target**: ES2018
- **External**: Obsidian and CodeMirror modules (not bundled)

### CSS Bundling

CSS files are automatically bundled:
- All CSS files in `src/**/*.css` are collected
- Bundled into single `styles.css` in output directory
- Automatically updated on CSS file changes

## Troubleshooting

### Plugin not loading

- Check that `main.js` and `manifest.json` exist in output directory
- Verify `manifest.json` has correct `id` and `version`
- Check console for errors
- Ensure plugin is enabled in Obsidian settings

### Changes not appearing

- Ensure `npm run dev` is running
- Check that files are being saved
- Reload Obsidian (Cmd/Ctrl + R)
- Check console for build errors

### Build errors

- Check Node.js version (v16+)
- Run `npm install` to ensure dependencies are installed
- Check `esbuild.config.mjs` for correct paths
- Verify TypeScript compilation: `npx tsc --noEmit`

### Type errors

- Run `npm run build` to see TypeScript errors
- Check `tsconfig.json` configuration
- Ensure all imports are correct

## Dependencies

### Production Dependencies

None - plugin uses only Obsidian's built-in APIs

### Development Dependencies

- **TypeScript** - Type checking and compilation
- **esbuild** - Fast bundling
- **@types/node** - Node.js type definitions
- **@typescript-eslint/\*** - TypeScript linting
- **obsidian** - Obsidian type definitions (for development)

## Resources

- [Obsidian Plugin API Documentation](https://docs.obsidian.md/Plugins)
- [Obsidian Plugin Development Guide](https://docs.obsidian.md/Plugins/Getting+started)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [esbuild Documentation](https://esbuild.github.io/)

