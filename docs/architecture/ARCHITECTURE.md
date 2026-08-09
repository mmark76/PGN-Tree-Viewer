# Chess Tree Builder Architecture

## Scope

The application is a client-side chess repertoire explorer. It starts with an empty tree and creates the repertoire view from legal moves played on the board or from games imported from a local PGN file. No uploaded file leaves the browser.

## Data flow

```text
Manual lines / local PGN or Chess Tree Builder JSON file
          ↓
LineRecord[]
          ↓
treeBuilder
          ↓
TreeNode hierarchy + FEN positions + result totals
          ↓
MoveTree and PositionInspector
          ↓
PGN / JSON / SVG download
```

## Feature boundaries

- `services/pgnParser.ts`: converts PGN text into normalized line records.
- `services/treeBuilder.ts`: validates moves, merges common paths and aggregates results.
- `services/treeLayout.ts`: assigns visual coordinates without depending on React.
- `services/treeFiles.ts`: validates Chess Tree Builder JSON and serializes PGN, JSON and SVG downloads.
- `components/MoveTree.tsx`: renders and controls the variation tree.
- `components/ChessBoard.tsx`: renders a FEN position and reports drag or click moves.
- `components/PositionInspector.tsx`: presents the selected position and statistics.
- `components/ExplorerShell.tsx`: owns feature state and coordinates the modules.

## Decisions

1. **Local-first PGN import.** Files are parsed in the browser for privacy and to avoid an unnecessary backend.
2. **One internal tree model.** Manual data and imported games use the same `LineRecord → TreeNode` path.
3. **Chess.js at the validation boundary.** SAN parsing and FEN generation are delegated to a focused chess rules library.
4. **Board-driven branches.** A legal move extends the selected node; playing from an earlier node naturally creates an alternative branch.
5. **Portable local persistence.** A versioned JSON file preserves the complete repertoire and appearance settings without accounts, a backend or remote storage.
