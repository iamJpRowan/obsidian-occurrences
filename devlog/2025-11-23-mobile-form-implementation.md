# 2025-11-23: Mobile Form Implementation

**Attribution**: 
- Developer: jprowan
- AI Model: claude-3.5-sonnet (via Cursor)

## Context

The OccurrenceModal had significant usability issues on mobile devices. When the virtual keyboard appeared, it would overlay the form fields and submit button, making the form unusable. The modal's default vertical centering behavior didn't adjust for the keyboard, and attempts to fix this with CSS and JavaScript viewport manipulation were unsuccessful.

Key problems:
- **Keyboard overlay**: Virtual keyboard covered form fields and submit button
- **Vertical centering**: Modal remained centered even when keyboard appeared
- **Viewport manipulation**: Attempts to adjust positioning with Visual Viewport API were ineffective
- **Scrolling issues**: Modal didn't scroll properly on mobile

The goal was to create a mobile-native form experience that works seamlessly with the virtual keyboard while maintaining consistency with the desktop modal.

## Decisions

### Mobile Form Pattern

- **Fix existing Modal**: Continue trying to make Modal work on mobile with viewport manipulation
  - Cons: Obsidian's Modal class has deep styling that resists overrides, transform matrix3d prevents positioning, viewport manipulation unreliable
- **ItemView pattern**: Create a new ItemView-based form specifically for mobile
  - Pros: Native scrolling works, no viewport manipulation needed, matches Obsidian's settings tab pattern, proven to work with keyboard

**Decision**: Create separate `OccurrenceForm` (ItemView) for mobile, keep `OccurrenceModal` for desktop
- **Rationale**: ItemView pattern naturally handles scrolling and keyboard interactions. Obsidian's settings tab uses this pattern successfully. Avoids fighting against Obsidian's Modal styling. Clean separation of concerns - desktop gets Modal, mobile gets ItemView.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-23

### Code Consolidation Strategy

- **Keep code separate**: Maintain duplicate code in Modal and Form
  - Cons: ~400 lines of duplicate code, inconsistent behavior, harder to maintain
- **Shared utility class**: Extract common file operations and formatting into shared class
  - Pros: Single source of truth, consistent behavior, easier maintenance, reduces duplication

**Decision**: Create `OccurrenceFileOperations` utility class for shared logic
- **Rationale**: Both Modal and Form need identical file operations (create, update, formatting). Consolidating reduces duplication from ~400 lines to shared utilities. Ensures consistent behavior between desktop and mobile. Makes future changes easier - update once, affects both.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-23

### Form UI Design

- **Traditional header**: Separate "Create/Edit Occurrence" header with title field below
  - Cons: Takes extra vertical space, less clean
- **Title as header**: Use title input field as the main header with close button
  - Pros: More space-efficient, cleaner look, title is primary focus

**Decision**: Title field as main header with close (X) button
- **Rationale**: Title is the most important field and should be prominent. Combining header and title field reduces vertical space. Close button on right provides clear exit. Matches modern mobile app patterns.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-23

### Error Message Placement

- **Top of form**: Show errors at the top when they occur
  - Cons: User has to scroll up to see error, may miss it
- **Bottom above submit**: Show errors at bottom, above submit button
  - Pros: User sees error right before submitting, more visible, doesn't require scrolling up

**Decision**: Error message at bottom, above submit button
- **Rationale**: Errors are most relevant when user is about to submit. Placing them above the submit button ensures visibility. Reserves space to prevent layout shift when error appears/disappears.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-23

### Tag Selector Anchoring

- **Fixed positioning**: Use fixed positioning with manual viewport calculations
  - Cons: Complex, requires scroll listeners, doesn't match other fields
- **Absolute positioning**: Use CSS absolute positioning like other file selectors
  - Pros: Simpler, consistent with other fields, naturally anchors to parent

**Decision**: Use absolute positioning for tag suggestions
- **Rationale**: Other file selectors (SingleFileSelector, MultiFileSelector) use absolute positioning successfully. Tag selector should match this pattern for consistency. Removes complex viewport calculation code. CSS handles positioning automatically.
- **Attribution**: User (jprowan) with AI (claude-3.5-sonnet)
- **Date**: 2025-11-23

## Implementation

### Created OccurrenceForm (ItemView)

Created new `OccurrenceForm` class extending `ItemView` for mobile form experience:

```typescript
export class OccurrenceForm extends ItemView {
  // Full-screen scrollable form
  // Uses native scrolling that works with mobile keyboard
}
```

Key features:
- Full-screen view that takes entire viewport
- Native scrolling (no viewport manipulation)
- Sticky header with title field and close button
- Scrollable form container
- Error message with reserved space (no layout shift)
- Auto-focus on title field when opened

### Code Consolidation

Created `OccurrenceFileOperations` utility class to share logic between Modal and Form:

**Shared methods**:
- `extractBasename()` - Extract basename from link targets
- `ensureFileExists()` - Create files if they don't exist
- `formatDatePrefix()` - Format date for filename prefix
- `formatDateForFrontmatter()` - Format date with timezone for frontmatter
- `formatFrontmatter()` - Convert object to YAML string
- `formatYamlValue()` - Format individual YAML values
- `createOccurrence()` - Create new occurrence file
- `updateOccurrence()` - Update existing occurrence file

**Results**:
- Removed ~400 lines of duplicate code
- Single source of truth for file operations
- Consistent behavior between desktop and mobile
- Easier maintenance

### UI Improvements

**Header Design**:
- Title input field as main header (no separate "Create/Edit" text)
- Close (X) button on far right
- Auto-focus on title field when form opens
- Removed border line between header and form

**Field Consistency**:
- All fields use same pattern: icon + label + input
- To Process field matches other fields (icon, label, checkbox)
- Consistent icon usage (lightbulb for topics, tags for tags, square-check-big for to process)

**Error Handling**:
- Error message at bottom, above submit button
- Reserved space prevents layout shift
- Uses visibility/opacity for smooth transitions

**Tag Selector**:
- Fixed anchoring to match other file selectors
- Uses absolute positioning (not fixed)
- Removed complex viewport calculation code

### File Structure

```
src/occurrenceModal/
  ├── OccurrenceForm.ts          # Mobile ItemView form
  ├── OccurrenceModal.ts         # Desktop Modal form
  ├── utils/
  │   ├── occurrenceFileOperations.ts  # Shared file operations
  │   └── timezoneUtils.ts
  └── components/
      ├── TagSelector.ts
      ├── SingleFileSelector.ts
      ├── MultiFileSelector.ts
      └── DateTimeSelector.ts
```

### Conditional Opening Logic

Updated `main.ts` to conditionally open Modal or Form based on platform:

```typescript
async openOccurrenceForm(occurrence: OccurrenceObject | null): Promise<void> {
  if (Platform.isMobile || Platform.isMobileApp) {
    // Open ItemView form on mobile
    await this.openOccurrenceFormView(occurrence)
  } else {
    // Open Modal on desktop
    new OccurrenceModal(this, occurrence).open()
  }
}
```

## Technical Details

### CSS Changes

**Consolidated title input styles**:
- Shared styles between `.occurrence-modal-title-header input` and `.occurrence-form-view-title-header input`
- Reduces CSS duplication

**Form view styles**:
- `.occurrence-form-view` - Main container with native scrolling
- `.occurrence-form-view-header` - Sticky header
- `.occurrence-form-view-title-header` - Title input container
- `.occurrence-form-view-form` - Scrollable form container

**Tag selector**:
- Removed `position: fixed` override
- Now uses `position: absolute` like other selectors

### Code Cleanup

1. **Removed duplicate interface**: `OccurrenceFormData` now only defined in `OccurrenceModal.ts`
2. **Fixed indentation**: Corrected inconsistent indentation in header section
3. **Consolidated CSS**: Merged duplicate title input styles
4. **Renamed class**: `OccurrenceFormView` → `OccurrenceForm` (simpler name)

## Testing

### Mobile Testing
- ✅ Form opens and scrolls properly
- ✅ Keyboard doesn't cover fields
- ✅ All fields accessible when keyboard is open
- ✅ Submit button accessible
- ✅ Tag suggestions anchor correctly
- ✅ Error messages appear without layout shift
- ✅ Title field auto-focuses
- ✅ Close button works

### Desktop Testing
- ✅ Modal still works as before
- ✅ No regressions in desktop experience
- ✅ Code consolidation doesn't affect functionality

## Outcomes

### Successes

1. **Mobile form works perfectly**: Native scrolling handles keyboard interactions seamlessly
2. **Code consolidation**: Reduced duplication by ~400 lines
3. **Consistent behavior**: Desktop and mobile share same business logic
4. **Cleaner UI**: Title-as-header design is more space-efficient
5. **Better UX**: Error placement and auto-focus improve usability

### Lessons Learned

1. **ItemView > Modal for mobile**: Obsidian's ItemView pattern is better suited for mobile forms than Modal
2. **Native scrolling works**: No need for complex viewport manipulation when using proper patterns
3. **Code sharing pays off**: Consolidating duplicate code makes maintenance much easier
4. **CSS absolute positioning**: Simpler and more reliable than fixed positioning with calculations

## Future Considerations

### Potential Improvements

1. **Field creation helper**: Could extract repetitive field creation pattern into helper method
2. **Frontmatter parsing utility**: Could extract timezone/toProcess parsing into shared utility
3. **Form validation**: Could create shared validation logic
4. **Accessibility**: Could add more ARIA labels and keyboard navigation improvements

### Maintenance Notes

- Both `OccurrenceModal` and `OccurrenceForm` should be updated together when adding new fields
- File operations should go through `OccurrenceFileOperations` utility
- CSS changes should consider both modal and form views
- Test on both desktop and mobile when making changes

## Files Changed

- `src/occurrenceModal/OccurrenceForm.ts` (new) - Mobile form implementation
- `src/occurrenceModal/OccurrenceModal.ts` - Updated to use shared utilities
- `src/occurrenceModal/utils/occurrenceFileOperations.ts` (new) - Shared file operations
- `src/occurrenceModal/styles.css` - Added form styles, consolidated title styles
- `src/occurrenceModal/components/TagSelector.ts` - Fixed anchoring
- `src/main.ts` - Added conditional form opening logic
- `src/occurrenceList/OccurrenceListItem.ts` - Updated to use conditional opening

## Related

- See `2025-11-22-modal-ui-improvements.md` for desktop modal improvements
- See `2025-11-19-file-selector-filtering.md` for file selector implementation

