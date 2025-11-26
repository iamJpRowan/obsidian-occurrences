# Plugin Submission Guide

This guide walks you through submitting the Occurrences plugin to the Obsidian Community Plugins directory.

## ✅ Already Completed

- [x] All code-level requirements met
- [x] Release v1.0.0 created
- [x] GitHub Actions workflow should have built and uploaded `release.zip`

## Step 1: Verify GitHub Repository Settings

1. Go to your repository: https://github.com/iamJpRowan/obsidian-occurrences
2. Click **Settings** (top right of repository)
3. Scroll down to **Danger Zone** (or check general settings)
4. Ensure repository is **Public** (not private)
5. Go back to the main repository page
6. Click the gear icon next to **About** section
7. Add a **Description**: "A plugin for managing and viewing occurrences (time-stamped events) in your Obsidian vault."
8. Add **Topics** (tags for discoverability):
   - `obsidian`
   - `obsidian-plugin`
   - `occurrences`
   - `events`
   - `notes`
   - `vault`
9. Click **Save changes**

## Step 2: Verify Release Assets

1. Go to your release: https://github.com/iamJpRowan/obsidian-occurrences/releases/tag/v1.0.0
2. Check that `release.zip` appears in the **Assets** section
3. If it's not there, check the **Actions** tab to see if the workflow is still running or if it failed
4. If the workflow failed, you may need to manually upload the files:
   - Download the release.zip (or build locally and create it)
   - Edit the release
   - Upload `release.zip` as an asset

## Step 3: Submit to Obsidian Community Plugins

### 3.1 Fork the obsidian-releases Repository

1. Go to: https://github.com/obsidianmd/obsidian-releases
2. Click the **Fork** button (top right)
3. Wait for the fork to complete

### 3.2 Add Your Plugin Entry

1. In your fork, navigate to the `community-plugins.json` file
2. Click the **pencil icon** (Edit) to edit the file
3. Scroll to the end of the JSON array (before the closing `]`)
4. Add a comma after the last entry, then add your plugin entry:

```json
{
  "id": "occurrences",
  "name": "Occurrences",
  "author": "Jp Rowan",
  "description": "A plugin for managing and viewing occurrences (time-stamped events) in your Obsidian vault.",
  "repo": "iamJpRowan/obsidian-occurrences"
}
```

**Important**: 
- The `id` must match exactly what's in your `manifest.json` ("occurrences")
- The `repo` format is `username/repository-name` (no `https://github.com/`)
- Ensure proper JSON formatting (comma after previous entry, no trailing comma)

5. Scroll down and click **Commit changes**
6. Add a commit message: `Add plugin: Occurrences`
7. Click **Commit changes**

### 3.3 Create Pull Request

1. After committing, you'll see a banner suggesting to create a pull request
2. Click **Contribute** → **Open pull request**
3. **PR Title**: `Add plugin: Occurrences`
4. **PR Description**: Fill out the template that appears. It should include checkboxes like:
   - [ ] The plugin follows the [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
   - [ ] The plugin has been tested and works correctly
   - [ ] The plugin has a release with the required files
   - [ ] The plugin's `manifest.json` has all required fields
   - [ ] The plugin's repository is public
   - [ ] The plugin's repository has a README.md
   - [ ] The plugin's repository has a LICENSE file

5. Check all the boxes that apply (they should all be checked ✅)
6. Click **Create pull request**

## Step 4: Wait for Review

1. An automated bot will validate your plugin
2. If validation passes, the PR will be labeled "Ready for review"
3. The Obsidian team will manually review your plugin
4. This process may take several days to weeks - be patient!
5. If issues are found, address them and update your PR

## Step 5: After Approval

Once your plugin is approved and merged:

1. **Announce your plugin**:
   - Post in the [Share & showcase](https://forum.obsidian.md/c/share-showcase/9) section of the Obsidian forums
   - Share in the `#updates` channel on the [Obsidian Discord](https://discord.gg/obsidianmd) (requires `developer` role)

2. **Your plugin will be available** in:
   - Settings → Community plugins → Browse
   - Users can search for "Occurrences" and install directly

## Quick Checklist

Before submitting, verify:

- [ ] Repository is **public**
- [ ] Repository has a **description**
- [ ] Repository has **topics/tags**
- [ ] Release v1.0.0 exists with `release.zip` asset
- [ ] Plugin ID in `community-plugins.json` matches `manifest.json`
- [ ] All PR template checkboxes can be checked
- [ ] Plugin has been tested on desktop and mobile

## Important Links

- **Your Repository**: https://github.com/iamJpRowan/obsidian-occurrences
- **Your Release**: https://github.com/iamJpRowan/obsidian-occurrences/releases/tag/v1.0.0
- **obsidian-releases Repository**: https://github.com/obsidianmd/obsidian-releases
- **Submission Documentation**: https://docs.obsidian.md/Plugins/Releasing/Submitting+your+plugin
- **Obsidian Forums**: https://forum.obsidian.md/c/share-showcase/9
- **Obsidian Discord**: https://discord.gg/obsidianmd

## Troubleshooting

### Release Asset Missing

If `release.zip` is not in your release:
1. Check the **Actions** tab for workflow status
2. If workflow failed, check the logs
3. You can manually build and upload:
   ```bash
   npm run build
   # Then create zip from dist/ directory
   ```

### PR Validation Fails

If the automated bot finds issues:
1. Check the PR comments for specific errors
2. Common issues:
   - Plugin ID mismatch
   - Missing required files in release
   - Repository not public
   - Manifest.json issues
3. Fix the issues and push updates

### Questions?

- Check the [Obsidian Developer Documentation](https://docs.obsidian.md/Plugins/Releasing/Submitting+your+plugin)
- Ask in the [Obsidian Discord](https://discord.gg/obsidianmd) `#dev` channel
- Check existing PRs in obsidian-releases for examples

