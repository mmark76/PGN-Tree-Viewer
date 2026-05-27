# PGN Tree Viewer

A visual prototype for displaying chess PGN variations as an upward-growing move tree.

## Overview

**PGN Tree Viewer** is an early browser-based prototype for visualizing chess move trees.

The current version demonstrates:

- A root node at the bottom
- A main chess line growing upward
- Dynamically generated side variations
- Clickable move nodes
- A selected-move panel
- A path display from the root to the selected move
- Basic PGN file upload input
- A modular folder structure prepared for future growth

At this stage, the PGN import reads the selected file but is not yet connected to a real PGN parser. The visual tree is still generated from sample data.

## Current Status

This is an early visual and architectural prototype.

Implemented:

- Dynamic sample variation tree
- Main line and variation styling
- SVG connection lines
- Clickable nodes
- Selected move display
- File input for `.pgn` files
- Separate HTML, CSS, and JavaScript files
- Prepared folders for future modules

Not yet implemented:

- Full PGN parsing
- Automatic tree generation from imported PGN
- Board position preview
- Opening database integration
- User move saving
- Export features
- Support for large/deep PGN files
- Move validation
- Engine analysis
- Feedback handling

## Current Project Structure

```text
PGN-Tree-Viewer/
  index.html
  README.md

  css/
    style.css

  js/
    app.js
    treeData.js
    treeRenderer.js
    pgnImport.js

    adapters/
    analysis/
    board/
    config/
    core/
    database/
    feedback/
    importExport/
    models/
    parser/
    rendering/
    services/
    state/
    statistics/
    ui/
    userChanges/
    utils/

  api/

  assets/
    icons/
    images/

  data/

  database/
    migrations/
    seeds/

  docs/
    PROJECT_STRUCTURE.md

  examples/

  public/

  tests/
```

Most future folders currently contain only `.gitkeep` placeholders. They exist to reserve the architecture, not because their functionality has already been implemented.

## Folder Purpose

### `css/`

Application styling.

### `js/`

Current browser JavaScript files and future application modules.

### `js/parser/`

Reserved for PGN parsing and PGN-to-tree conversion.

### `js/models/`

Reserved for core data models such as game, move, tree node, variation, position, and annotation.

### `js/state/`

Reserved for current tree state, selected node state, unsaved changes, and user session state.

### `js/services/`

Reserved for save/load logic, storage services, and future data access operations.

### `js/adapters/`

Reserved for conversions between PGN, JSON, database records, and internal tree models.

### `js/rendering/`

Reserved for layout algorithms, SVG helpers, zoom/pan, and future rendering engines.

### `js/board/`

Reserved for future chessboard position preview.

### `js/database/`

Reserved for database browser logic and opening database integration.

### `js/statistics/`

Reserved for move percentages, wins/draws/losses, game counts, and related statistics.

### `js/analysis/`

Reserved for future chess engine analysis integration.

### `js/userChanges/`

Reserved for user-added moves, saved changes, personal repertoires, and tree editing history.

### `js/importExport/`

Reserved for PGN import, PGN export, JSON export, and future data exchange features.

### `js/feedback/`

Reserved for a future feedback panel or issue/suggestion form.

### `api/`

Reserved for a future backend API, if the project evolves beyond a static browser prototype.

### `database/`

Reserved for future database schema, migrations, and seed data.

### `data/`

Reserved for static JSON examples, sample trees, and demo data.

### `examples/`

Reserved for sample PGN files and demonstration inputs.

### `assets/`

Reserved for icons, images, screenshots, and visual assets.

### `tests/`

Reserved for future parser, tree model, and rendering tests.

### `docs/`

Reserved for architecture notes and development planning.

## How to Use

1. Open `index.html` in a browser.
2. Enter the number of variations when prompted.
3. View the generated sample chess variation tree.
4. Click any move node to inspect the selected move and its path.
5. Use the PGN file input to load a `.pgn` file.

Note: PGN upload currently reads the file but does not yet generate a real tree.

## Planned Data Flow

```text
PGN file / PGN text / database game / saved tree
        ↓
Input adapter
        ↓
Internal tree model
        ↓
Layout engine
        ↓
Tree renderer
        ↓
Board, statistics, analysis, and user changes
```

## Development Roadmap

### Phase 1 — Tree Model

Define the internal data model for:

- Game
- Move
- Tree node
- Variation
- Position
- Annotation
- User change

### Phase 2 — PGN Parser

Create a function such as:

```javascript
parsePgnToTree(pgnText)
```

This function should convert PGN text into the internal tree structure.

### Phase 3 — Dynamic Tree Rendering

Replace the current sample-generated tree with parsed PGN data.

### Phase 4 — Layout Engine

Improve the layout so that it supports:

- Unlimited branches
- Deep variations
- Collision avoidance
- Zoom and pan
- Responsive display

### Phase 5 — Board Position Preview

Add a board viewer that updates when a move node is selected.

Possible future libraries may include chess-specific board or move-validation tools, but no external libraries are currently included.

### Phase 6 — Saving User Changes

Allow users to add moves to the tree and save each change.

Possible save targets:

- Browser storage
- JSON export
- PGN export
- Future backend database

### Phase 7 — Database and Study Features

Possible future features:

- Opening database browser
- Saved trees
- Shared trees
- Move statistics
- Search
- Comments and annotations
- Import/export options
- Engine analysis
- Feedback panel

## Technical Notes

The current prototype uses:

- Plain HTML
- Plain CSS
- Plain JavaScript
- SVG lines for parent-child connections
- Absolute positioning for move nodes
- No build system
- No external dependencies

The current architecture intentionally stays simple so the project can still be opened directly in a browser.

## Purpose

The goal of this project is to create a clear visual representation of chess games and their variations, especially for studying opening lines, classical games, repertoires, and branching analysis.

## License

No license has been added yet.

Consider adding one before public reuse or collaboration.
