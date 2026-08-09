# Product Requirements

## Implemented

- Start with an empty move-tree workspace and the board in its initial position.
- Create a branching move tree from legal moves played directly on the board.
- Create or replace the tree from a valid PGN import.
- Select a move and display the exact board position.
- Navigate backward and along the most popular continuation.
- Collapse and expand branches; zoom and scroll large trees.
- Import local `.pgn` files containing one or more games and `.json` ChessTree files.
- Download the complete tree as PGN variations, lossless ChessTree JSON or an SVG image.
- Merge common move sequences and calculate move popularity.
- Aggregate white wins, draws and black wins at every node.
- Support desktop, tablet and narrow mobile layouts.
- Support Greek and English interface text, with English as the default language.

## Current constraints

- Imported files are limited to 8 MB.
- Statistics reflect games contained in the imported file.
- PGN recursive annotation variations are not counted as separate games; the main game line is used.
- Imported data is session-only unless downloaded by the user and is never uploaded or saved remotely.

## Next logical extensions

- Save and edit personal repertoires.
- Search positions and opening names.
- Add annotations and training mode.
