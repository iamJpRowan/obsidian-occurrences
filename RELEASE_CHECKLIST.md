# Obsidian Plugin Release Checklist

This document provides a checklist for ensuring compliance with the [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) before releasing to the Community Plugins directory.

> **Note**: This checklist was completed on 2025-11-26. See [devlog entry](../devlog/2025-11-26-release-preparation.md) for detailed decisions and implementation.

## ✅ Code Organization

- [x] Code is well-organized into folders
- [x] No placeholder class names (MyPlugin, SampleSettingTab, etc.)
- [x] All classes have meaningful names

## ✅ Security

- [x] No `innerHTML`/`outerHTML` usage for user-generated content
- [x] Uses Obsidian's safe DOM helpers (`createEl()`, `createSpan()`, etc.)
- [x] All DOM manipulation is safe from XSS vulnerabilities

## ✅ UI Text and Styling

- [x] All UI text follows sentence case (first word + proper nouns only)
- [x] Settings tab doesn't use unnecessary HTML heading tags
- [x] Headings omitted for single-section settings
- [x] No "Settings" in headings (redundant context)
- [x] Proper nouns (Occurrence, Occurrences, View) are capitalized

## ✅ Console Logging

- [x] Minimized console logging
- [x] Only essential error logs remain (in catch blocks)
- [x] No debug/info/warn statements in production code

## ✅ Resource Management

- [x] Uses `registerEvent()` and `addCommand()` for automatic cleanup
- [x] Uses `onLayoutReady()` to defer non-essential operations
- [x] Proper cleanup in `onunload()` method
- [x] Uses `this.app` instead of global `app` object

## ✅ Repository Structure

- [x] `main.js` is properly excluded in `.gitignore`
- [x] `versions.json` exists and is configured
- [x] LICENSE file exists and matches package.json

## ✅ Metadata

- [x] LICENSE file matches package.json license field (MIT)
- [x] Author information complete in LICENSE, package.json, and manifest.json
- [x] manifest.json has descriptive description
- [x] Copyright holder properly identified

## 📋 Pre-Release Steps

Before creating a release:

1. **Build for production**:
   ```bash
   npm run build
   ```

2. **Version bump**:
   ```bash
   npm run version
   ```

3. **Create GitHub release**:
   - Tag with version number
   - Upload `main.js`, `manifest.json`, and `styles.css` as release assets
   - Include release notes

4. **Submit to Community Plugins**:
   - Follow [Obsidian's submission process](https://docs.obsidian.md/Plugins/Releasing/Submitting+your+plugin)

## References

- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Obsidian Plugin Self-Critique Checklist](https://docs.obsidian.md/oo/plugin)
- [Development Guide](docs/development.md) - See "Preparing for Release" section
