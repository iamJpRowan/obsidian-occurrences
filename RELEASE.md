# Release Guide

This guide walks you through the process of creating a new release for the Occurrences plugin.

## Prerequisites

- All code changes committed and pushed to the repository
- Plugin tested and working correctly
- All submission requirements met (see `SUBMISSION_STATUS.md`)

## Release Process

### Step 1: Pre-Release Checklist

Before creating a release, verify:

- [ ] All features are complete and tested
- [ ] No breaking changes (or they're documented)
- [ ] README.md is up to date
- [ ] CHANGELOG.md is updated (if you maintain one)
- [ ] Plugin works on both desktop and mobile
- [ ] All tests pass (if you have automated tests)

### Step 2: Update Version

Choose the appropriate version bump based on [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.0` → `0.1.1`): Bug fixes, minor improvements
- **Minor** (`0.1.0` → `0.2.0`): New features, backward compatible
- **Major** (`0.1.0` → `1.0.0`): Breaking changes

Run the version command:

```bash
npm version patch   # for bug fixes
# OR
npm version minor   # for new features
# OR
npm version major   # for breaking changes
```

This command will:
1. Update `package.json` version
2. Update `src/manifest.json` version
3. Update `versions.json` with the new version mapping
4. Create a git commit with the version changes
5. Create a git tag with the version number

### Step 3: Push Changes and Tags

Push your commits and the new tag to GitHub:

```bash
git push
git push --tags
```

### Step 4: Create GitHub Release

1. Go to your repository on GitHub
2. Click on **Releases** (in the right sidebar or under the Code tab)
3. Click **Draft a new release**
4. Select the tag you just created (e.g., `v0.1.0`)
5. **Release title**: Use the version number (e.g., `v0.1.0`) or a descriptive title
6. **Release notes**: Describe what's new, changed, or fixed in this release

   Example release notes:
   ```markdown
   ## What's New
   - Added feature X
   - Improved performance for Y
   
   ## Bug Fixes
   - Fixed issue with Z
   
   ## Changes
   - Updated dependencies
   ```

7. Click **Publish release**

### Step 5: Automated Build and Upload

Once you publish the release, GitHub Actions will automatically:

1. ✅ Checkout the code
2. ✅ Install dependencies
3. ✅ Build the plugin (runs `npm run build`)
4. ✅ Create `release.zip` with:
   - `main.js` (compiled plugin)
   - `manifest.json` (plugin manifest)
   - `styles.css` (bundled styles)
5. ✅ Upload `release.zip` as a release asset

You can monitor the workflow progress in the **Actions** tab of your repository.

### Step 6: Verify Release

After the workflow completes (usually takes 1-2 minutes):

1. Go back to the **Releases** page
2. Check that `release.zip` appears in the release assets
3. Download and test the zip file:
   ```bash
   # Extract to a test location
   unzip release.zip -d /path/to/test/vault/.obsidian/plugins/occurrences
   ```
4. Verify the plugin loads correctly in Obsidian

### Step 7: Submit to Community Plugins (First Release Only)

If this is your first release and you haven't submitted to the Community Plugins directory yet:

1. Follow the [Obsidian submission process](https://docs.obsidian.md/Plugins/Releasing/Submitting+your+plugin)
2. Provide:
   - Repository URL: `https://github.com/iamJpRowan/obsidian-occurrences`
   - Release URL: Link to the latest release
   - Plugin description: From your manifest.json

## Release Assets

Each release will contain:

- **release.zip**: Complete plugin package ready for installation
  - Extract to `.obsidian/plugins/occurrences/` in any vault
  - Contains: `main.js`, `manifest.json`, `styles.css`

## Troubleshooting

### Workflow Fails

If the GitHub Actions workflow fails:

1. Check the **Actions** tab for error details
2. Common issues:
   - Build errors: Check TypeScript compilation
   - Missing files: Verify all source files are committed
   - Permission issues: Ensure workflow has proper permissions

### Version Bump Issues

If `npm version` fails:

- Ensure all changes are committed first
- Check that `src/manifest.json` exists and is valid JSON
- Verify `versions.json` exists and is valid JSON

### Release Asset Missing

If `release.zip` doesn't appear:

1. Check the Actions workflow completed successfully
2. Verify the workflow has permission to upload assets
3. Check the workflow logs for upload errors

## Quick Reference

```bash
# Full release process
npm version patch          # Bump version
git push && git push --tags  # Push changes and tags
# Then create release on GitHub
```

## See Also

- [GitHub Actions Workflow Documentation](.github/workflows/README.md)
- [Submission Requirements](SUBMISSION_STATUS.md)
- [Development Guide](docs/development.md)

