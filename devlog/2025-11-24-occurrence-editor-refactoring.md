# 2025-11-24: Occurrence Editor Refactoring

**Attribution**: 
- Developer: jprowan
- AI Model: claude-3.5-sonnet (via Cursor)

## Context

The occurrence editor codebase had grown organically with significant code duplication between `OccurrenceModal` (385 lines) and `OccurrenceForm` (413 lines). Both files shared approximately 80% of their code - form field creation, validation logic, submission handling, and error management. Additionally, the directory name `occurrenceModal` no longer accurately reflected that it contained both a modal and a form view.

Key problems:
- **Code duplication**: ~250 lines of identical code between modal and form
- **Maintenance burden**: Changes required in two places
- **Inconsistent naming**: Directory called "occurrenceModal" but contains both modal and form
- **Large files**: Several files exceeded 300-400 lines, making them harder to maintain
- **No shared abstraction**: No base class or shared utilities for common form logic

The goal was to refactor the codebase to eliminate duplication, improve maintainability, and create a cleaner architecture while preserving all existing functionality.

## Decisions

### Directory Rename

- **Option 1**: Keep `occurrenceModal` name
  - Cons: Misleading since it contains both modal and form views
- **Option 2**: Rename to `occurrenceEditor`
  - Pros: Accurately describes the purpose (editing occurrences), works for both views
- **Option 3**: Other names considered: `occurrenceInput`, `occurrenceEntry`, `occurrenceDialog`
  - Cons: Less clear or too generic

**Decision**: Rename `occurrenceModal` → `occurrenceEditor`
- **Rationale**: "Editor" clearly describes the purpose (creating/editing occurrences) and works for both modal and form views. It's a common, intuitive term in UI/UX.

### Code Organization Strategy

- **Option 1**: Extract shared form logic into base class
  - Pros: Single source of truth, eliminates duplication, easier maintenance
  - Cons: Requires careful abstraction design
- **Option 2**: Keep duplication, extract only utilities
  - Cons: Still requires changes in multiple places, doesn't solve core problem

**Decision**: Implement Option 1 with composition pattern
- **Rationale**: Since `Modal` and `ItemView` have different base classes, we used composition rather than inheritance. Created `OccurrenceFormBase` class that contains all shared logic and uses an interface (`OccurrenceFormView`) to interact with the view implementations.

### File Structure

Created new structure:
```
occurrenceEditor/
├── core/
│   ├── OccurrenceFormBase.ts        # Shared form logic (~250 lines)
│   ├── formFieldBuilder.ts          # Field creation logic (~150 lines)
│   └── index.ts                     # Core exports
├── views/
│   ├── OccurrenceModal.ts           # Modal wrapper (~60 lines)
│   ├── OccurrenceForm.ts            # ItemView wrapper (~120 lines)
│   └── index.ts                     # View exports
├── components/                      # (existing - unchanged)
├── utils/                           # (existing - unchanged)
├── styles.css                       # (existing - unchanged)
└── index.ts                         # Main exports
```

**Rationale**: Clear separation of concerns - core logic, view implementations, and shared utilities. Index files provide clean import paths.

### Data Interface Location

- **Option 1**: Keep `OccurrenceFormData` in separate file
  - Pros: Can be imported independently
  - Cons: Only 9 lines, tightly coupled to form base
- **Option 2**: Merge into `OccurrenceFormBase.ts`
  - Pros: Reduces file count, keeps related code together
  - Cons: Slightly less modular

**Decision**: Merge into `OccurrenceFormBase.ts`
- **Rationale**: Small interface (9 lines) that's primarily used within the core directory. Keeping it with the base class reduces unnecessary file fragmentation.

## Implementation

### Phase 1: Directory Rename

1. Renamed directory: `src/occurrenceModal/` → `src/occurrenceEditor/`
2. Updated all imports throughout codebase:
   - `src/main.ts`
   - `src/occurrenceList/OccurrenceListItem.ts`

### Phase 2: Extract Shared Logic

1. **Created `OccurrenceFormBase` class**:
   - Contains all shared form logic (initialization, validation, submission, error handling)
   - Uses composition pattern with `OccurrenceFormView` interface
   - Handles form data management, field updates, and submission flow

2. **Created `formFieldBuilder.ts`**:
   - Extracted all field creation logic into reusable functions
   - Functions: `buildFormFields()`, `buildTitleField()`, `buildToProcessField()`, `buildErrorMessage()`, `buildSubmitButton()`
   - Reduces `onOpen()` methods from ~100 lines to ~20 lines

3. **Refactored view classes**:
   - `OccurrenceModal`: Reduced from 385 → ~60 lines (84% reduction)
   - `OccurrenceForm`: Reduced from 413 → ~120 lines (71% reduction)
   - Both now implement `OccurrenceFormView` interface and delegate to `OccurrenceFormBase`

### Phase 3: Create Index Files

1. Created `src/occurrenceEditor/index.ts` - Main exports
2. Created `src/occurrenceEditor/core/index.ts` - Core exports
3. Created `src/occurrenceEditor/views/index.ts` - View exports

Enables clean imports: `import { OccurrenceModal } from "@/occurrenceEditor"`

### Phase 4: Bug Fixes

1. **Modal rendering issue**: Fixed `initializeForm()` calling `this.getContainer()` instead of `this.view.getContainer()`
2. **Form view positioning**: 
   - Fixed `initializeForm()` emptying container and removing header
   - Added check to preserve existing title container
   - Updated CSS with `flex-shrink: 0` and `align-items: stretch` to prevent form from being pushed to bottom

### Phase 5: Code Cleanup

1. **Merged `OccurrenceFormData` interface** into `OccurrenceFormBase.ts`
2. **Fixed broken import** in `occurrenceFileOperations.ts` (was importing from non-existent `../OccurrenceModal`)
3. **Removed unused imports**: `setIcon`, `buildTitleField`, `FormFieldBuilders`, `App`
4. **Changed method visibility**: `initializeForm()` and `cleanupForm()` from `protected` to `public` to allow view classes to call them
5. **Fixed TypeScript errors** in `fileFilterUtils.ts`:
   - Extracted `folders` and `tags` into local variables after null checks
   - Allows TypeScript to properly narrow types

## Results

### Code Reduction

- **Net reduction**: ~470 lines of duplicated code eliminated
- **OccurrenceModal.ts**: 385 → 60 lines (84% reduction)
- **OccurrenceForm.ts**: 413 → 120 lines (71% reduction)
- **New shared base**: ~250 lines (net savings of ~250 lines)

### Benefits

1. **Single source of truth**: Form logic exists in one place (`OccurrenceFormBase`)
2. **Easier maintenance**: Changes to form behavior only need to be made once
3. **Better organization**: Clear separation between core logic, views, and utilities
4. **Cleaner imports**: Index files provide shorter, cleaner import paths
5. **Type safety**: All TypeScript types preserved, build passes successfully
6. **No functionality loss**: All existing features preserved

### File Structure Improvements

- Clear separation: `core/` for shared logic, `views/` for implementations
- Reduced file count: Merged small interface file into base class
- Better discoverability: Index files make exports clear

## Testing

- ✅ Build passes: `npm run build` completes successfully
- ✅ No linting errors: All TypeScript and ESLint errors resolved
- ✅ Modal renders correctly: All fields and buttons display properly
- ✅ Form view renders correctly: Title and form positioned at top
- ✅ All imports updated: No broken references

## Lessons Learned

1. **Composition over inheritance**: When dealing with different base classes (`Modal` vs `ItemView`), composition with interfaces is more flexible than inheritance
2. **Small interfaces can be merged**: Very small type definitions (9 lines) don't always need separate files
3. **Index files are valuable**: They provide clean public APIs and shorter import paths
4. **TypeScript type narrowing**: Extracting variables after null checks helps TypeScript understand types better

## Future Considerations

- Consider extracting selector components further (Option 4 from original review) if they continue to grow
- Monitor file sizes - if `OccurrenceFormBase` grows significantly, consider splitting into smaller modules
- Consider extracting validation logic into separate service if it becomes more complex

