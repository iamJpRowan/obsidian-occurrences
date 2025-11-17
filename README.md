# Occurrences for Obsidian

A plugin for managing and viewing occurrences (time-stamped events) in your Obsidian vault.

## Features

- **Track occurrences** with participants, topics, locations, and tags
- **Filter occurrences** by date range, file, tags, and search terms
- **View occurrences** in a dedicated sidebar view
- **Customizable frontmatter** field mappings to match your vault structure
- **Automatic file watching** - occurrences update automatically when files change
- **Mobile app compatible** - works on both desktop and mobile

## Installation

### From Obsidian Community Plugins

**Coming Soon** - The plugin will be available in the Obsidian Community Plugins directory soon.

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/your-repo/obsidian-occurrences/releases)
2. Extract to your vault's `.obsidian/plugins/occurrences` directory
3. Reload Obsidian
4. Enable the plugin in **Settings → Community plugins**

## Quick Start

1. **Enable the plugin** in Obsidian settings (Settings → Community plugins → Occurrences)

2. **Create occurrence files** in your vault with frontmatter:
   ```yaml
   ---
   occurred_at: 2024-01-15 1400
   participants:
     - [[Person Name]]
     - [[Another Person]]
   topics:
     - [[Meeting Topic]]
     - [[Discussion]]
   location: [[Location Name]]
   tags:
     - meeting
     - important
   ---
   
   # Meeting Notes
   
   Content of your occurrence...
   ```

3. **Open the Occurrences View** using:
   - The ribbon icon (calendar-range icon)
   - Command palette: "Open Occurrences View"
   - Keyboard shortcut (if configured)

4. **Filter and search** your occurrences using the view controls:
   - Date filters (today, this week, this month, custom range)
   - File selector (show occurrences from specific files)
   - Tag filters
   - Full-text search

## Configuration

Access settings via **Settings → Occurrences** to customize:

### Frontmatter Field Mappings

Customize which frontmatter fields map to occurrence properties:
- `occurredAt` → Default: `occurred_at`
- `toProcess` → Default: `to_process`
- `participants` → Default: `participants`
- `topics` → Default: `topics`
- `location` → Default: `location`
- `tags` → Always uses `tags` (not configurable)

### File Filtering

Occurrences are automatically detected from files in the `Occurrences/` directory with `.md` extension.

## Usage

### Creating Occurrences

Occurrences are markdown files in your vault. The plugin automatically detects files with the configured frontmatter fields. Files should be located in the `Occurrences/` directory.

**File naming**: Files can optionally include a date prefix in the format `YYYY-MM-DD HHmm` (e.g., `2024-01-15 1400 Meeting Notes.md`). The plugin will extract the title from the filename by removing the date prefix.

### Viewing Occurrences

The Occurrences View provides several ways to filter and view your occurrences:

- **Date Filtering**: 
  - Quick filters: Today, This Week, This Month, All Time
  - Custom date range picker
  
- **File Filtering**: 
  - Show occurrences from specific files
  - Filter by active file
  
- **Tag Filtering**: 
  - Filter by one or more tags
  - Tag selector with search
  
- **Search**: 
  - Full-text search across occurrence titles and content
  - Real-time filtering as you type

- **Grouping**: 
  - Group occurrences by date, file, or tags
  - Collapsible groups for easy navigation

### Commands

- **Open Occurrences View**: Opens the main occurrences view
- **Add Occurrence**: Create a new occurrence file (coming soon)

### Ribbon Icon

Click the calendar-range icon in the ribbon to quickly open the Occurrences View.

## Troubleshooting

### Occurrences not appearing

- Ensure files are in the `Occurrences/` directory with `.md` extension
- Check that files have the required frontmatter fields (at minimum `occurred_at`)
- Verify the plugin is enabled (Settings → Community plugins)
- Try reloading Obsidian (Cmd/Ctrl + R)

### View not updating

- Try closing and reopening the view
- Check the console for errors (Settings → Advanced → Developer tools → Console)
- Ensure files are being saved properly

### Date parsing issues

- Ensure `occurred_at` field is in a format that JavaScript `Date` can parse
- Recommended format: `YYYY-MM-DD HHmm` or ISO 8601 format
- Invalid dates will be marked as `toProcess: true`

### Frontmatter field not recognized

- Check Settings → Occurrences to verify field mappings
- Ensure field names match your configured mappings (case-sensitive)
- Default field names use snake_case (e.g., `occurred_at`, `to_process`)

## Contributing

See [docs/contributing.md](docs/contributing.md) for development guidelines and contribution information.

## Development

For development setup and architecture details, see the [docs/](docs/) directory.

## License

MIT License - see [LICENSE](LICENSE) file for details.
