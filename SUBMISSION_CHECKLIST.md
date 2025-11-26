# Plugin Submission Requirements Checklist

This document validates the current codebase against the [Obsidian Plugin Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins).

## Repository Requirements

### GitHub Repository
- [ ] Repository is public
- [ ] Repository has a clear name (matches plugin name)
- [ ] Repository has a description
- [ ] Repository has topics/tags for discoverability

### README.md
- [ ] README exists and is comprehensive
- [ ] README includes installation instructions
- [ ] README includes usage instructions
- [ ] README includes feature list
- [ ] README includes screenshots (if applicable)
- [ ] README includes troubleshooting section
- [ ] README has proper formatting

### LICENSE
- [ ] LICENSE file exists
- [ ] LICENSE matches package.json license field
- [ ] LICENSE includes copyright holder

## Manifest Requirements

### manifest.json
- [ ] `id` field is set (matches plugin name, lowercase, no spaces)
- [ ] `name` field is set (display name)
- [ ] `version` field is set (semantic versioning)
- [ ] `minAppVersion` field is set (minimum Obsidian version required)
- [ ] `description` field is set (clear, descriptive)
- [ ] `author` field is set (author name)
- [ ] `authorUrl` field is set (GitHub profile or website)
- [ ] `isDesktopOnly` field is set (false if mobile compatible)

## Release Assets

### GitHub Release
- [ ] Release is tagged with version number
- [ ] Release includes `main.js` (compiled plugin)
- [ ] Release includes `manifest.json`
- [ ] Release includes `styles.css` (if plugin has styles)
- [ ] Release notes are included

### File Structure
- [ ] `main.js` is NOT in repository (in .gitignore)
- [ ] `main.js` is included in release assets
- [ ] `manifest.json` is in repository
- [ ] `styles.css` is in repository (if applicable)

## Code Quality

### TypeScript/JavaScript
- [ ] Code follows Obsidian Plugin Guidelines
- [ ] No placeholder class names
- [ ] Code is well-organized
- [ ] No security issues (no innerHTML for user content)

### Dependencies
- [ ] No external dependencies (or minimal, well-justified)
- [ ] Uses only Obsidian APIs
- [ ] No node_modules in release

## Documentation

### User Documentation
- [ ] README.md is user-friendly
- [ ] Installation instructions are clear
- [ ] Usage examples are provided
- [ ] Configuration options are documented

### Developer Documentation (Optional)
- [ ] Contributing guidelines (if accepting contributions)
- [ ] Development setup instructions
- [ ] Architecture documentation

## Testing

### Functionality
- [ ] Plugin works on desktop
- [ ] Plugin works on mobile (if `isDesktopOnly: false`)
- [ ] Plugin doesn't break Obsidian
- [ ] Plugin handles errors gracefully

### Compatibility
- [ ] Works with minimum Obsidian version specified
- [ ] Tested on latest Obsidian version
- [ ] No conflicts with common plugins

## Submission Process

### Before Submitting
- [ ] All requirements above are met
- [ ] Plugin is tested thoroughly
- [ ] Release is created on GitHub
- [ ] Release assets are uploaded

### Submission
- [ ] Fill out submission form
- [ ] Provide repository URL
- [ ] Provide release URL
- [ ] Provide plugin description
- [ ] Wait for review

