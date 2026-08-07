# Product Requirements

## Implemented

- Explore a manually curated opening repertoire as a branching move tree.
- Select a move and display the exact board position.
- Navigate backward and along the most popular continuation.
- Collapse and expand branches; zoom and scroll large trees.
- Import local `.pgn` files containing one or more games.
- Merge common move sequences and calculate move popularity.
- Aggregate white wins, draws and black wins at every node.
- Restore the default repertoire without reloading the application.
- Support desktop, tablet and narrow mobile layouts.

## Current constraints

- Imported files are limited to 8 MB.
- Statistics reflect games contained in the imported file.
- PGN recursive annotation variations are not counted as separate games; the main game line is used.
- Imported data is session-only and is not uploaded or saved remotely.

## Next logical extensions

- Save and edit personal repertoires.
- Export the current tree as PGN or JSON.
- Search positions and opening names.
- Add annotations and training mode.
