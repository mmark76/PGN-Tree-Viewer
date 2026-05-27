# PGN Tree Viewer

A visual prototype for displaying chess PGN variations as an upward-growing move tree.

## Overview

**PGN Tree Viewer** is a single-file HTML/CSS/JavaScript prototype that demonstrates a visual structure for chess variation trees.

The current version shows:

- A root node at the bottom
- A main chess line growing upward
- Side variations branching left and right
- Clickable move nodes
- A selected-move panel
- A path display from the root to the selected move
- Basic PGN file upload input

At this stage, the PGN import is present but not yet connected to a real PGN parser. The application currently uses a hardcoded sample tree.

## Current Status

This is an early visual prototype.

Implemented:

- Static chess variation tree
- Main line and variation styling
- SVG connection lines
- Clickable nodes
- Selected move display
- File input for `.pgn` files

Not yet implemented:

- Full PGN parsing
- Automatic tree generation from imported PGN
- Board position preview
- Export features
- Support for large/deep PGN files
- Move validation

## Project Structure

Current version:

```text
PGN-Tree-Viewer/
  index.html
```

The project is currently contained in a single `index.html` file.

Future structure may be:

```text
PGN-Tree-Viewer/
  index.html
  src/
    parser.js
    treeBuilder.js
    renderer.js
    board.js
  README.md
```

## How to Use

1. Open `index.html` in a browser.
2. View the sample chess variation tree.
3. Click any move node to inspect the selected move and its path.
4. Use the PGN file input to load a `.pgn` file.

Note: PGN upload currently reads the file but does not yet generate a real tree.

## Development Roadmap

### Phase 1 — PGN Parser

Create a function:

```javascript
parsePgnToTree(pgnText)
```

This function should convert PGN text into a tree structure compatible with the existing renderer.

### Phase 2 — Dynamic Tree Rendering

Replace the hardcoded `sampleTree` with parsed PGN data.

### Phase 3 — Chess Board Preview

Add a board viewer that updates when a move node is selected.

Possible libraries:

- chess.js
- chessboard.js
- cm-chessboard

### Phase 4 — Better Layout Engine

Improve the layout so that it supports:

- Unlimited branches
- Deep variations
- Collision avoidance
- Zoom and pan
- Responsive display

### Phase 5 — User Features

Possible future features:

- Load PGN from text area
- Export tree as image
- Collapse/expand variations
- Highlight main line
- Search move
- Show move comments and annotations
- Support multiple games in one PGN file

## Technical Notes

The current prototype uses:

- Plain HTML
- Plain CSS
- Plain JavaScript
- SVG lines for parent-child connections
- Absolute positioning for move nodes

No build system or external dependency is currently required.

## Purpose

The goal of this project is to create a clear visual representation of chess games and their variations, especially for studying opening lines, classical games, and branching analysis.

## License

No license has been added yet.

Consider adding one before public reuse or collaboration.
