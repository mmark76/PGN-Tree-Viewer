# Project Structure

This document describes the intended long-term folder structure for PGN Tree Viewer.

## Current Direction

The project should remain simple while it is still a prototype, but the repository should already allow clean growth into a complete PGN tree viewer.

## Planned Structure

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

    core/
      # Core application logic

    parser/
      # PGN parsing and PGN-to-tree conversion

    rendering/
      # Future rendering engines and layout algorithms

    ui/
      # User interface controls and panels

    utils/
      # Shared helper functions

  data/
    # Sample PGN files, test tree data, and JSON examples

  assets/
    icons/
      # Icons and small UI graphics

    images/
      # Screenshots and visual assets

  examples/
    # Example PGN files and demo inputs

  tests/
    # Parser tests, tree tests, and rendering tests

  docs/
    # Notes, architecture documents, and development planning
```

## Folder Responsibilities

### `css/`

Contains styling files.

### `js/`

Contains the current browser-based JavaScript files.

### `js/core/`

Reserved for future central application logic.

### `js/parser/`

Reserved for the PGN parser and future PGN-to-tree transformation logic.

### `js/rendering/`

Reserved for layout engines, drawing logic, SVG helpers, and possible future zoom/pan functionality.

### `js/ui/`

Reserved for user interface controls, panels, forms, and interaction handlers.

### `js/utils/`

Reserved for small reusable helper functions.

### `data/`

Reserved for structured JSON examples and sample tree data.

### `assets/`

Reserved for icons, screenshots, and image assets.

### `examples/`

Reserved for example PGN files and demo inputs.

### `tests/`

Reserved for future automated or manual tests.

### `docs/`

Reserved for project notes and architecture documentation.

## Development Principle

Do not move code into deeper folders too early. First keep the application working, then move code only when a clear responsibility appears.
