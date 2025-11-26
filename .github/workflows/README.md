# GitHub Actions Workflows

## Release Workflow

The release workflow automatically builds and packages the plugin when a GitHub release is created.

### How It Works

1. **Trigger**: Automatically runs when you create a new GitHub release
2. **Build**: Builds the plugin using `npm run build` to the `dist/` directory
3. **Package**: Creates a `release.zip` file containing:
   - `main.js` (compiled plugin)
   - `manifest.json` (plugin manifest)
   - `styles.css` (bundled styles)
4. **Upload**: Uploads the zip file as a release asset

### Usage

1. **Update version** (if needed):
   ```bash
   npm version patch  # or minor, major
   ```
   This updates `package.json`, `src/manifest.json`, and `versions.json`

2. **Commit and push**:
   ```bash
   git push && git push --tags
   ```

3. **Create GitHub release**:
   - Go to GitHub → Releases → Draft a new release
   - Select the tag that was just created
   - Add release notes
   - Click "Publish release"

4. **Workflow runs automatically**:
   - The workflow will build the plugin
   - Upload `release.zip` to the release assets
   - You'll see the workflow run in the Actions tab

### Release Assets

After the workflow completes, your release will have:
- `release.zip` - Contains all plugin files ready for distribution

Users can download and extract this zip to their `.obsidian/plugins/occurrences/` directory.

