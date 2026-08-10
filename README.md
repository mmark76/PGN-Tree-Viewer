# Chess Tree Builder

Chess Tree Builder is an interactive chess-opening explorer with a move tree, a live
board, local PGN and Chess Tree Builder JSON import, move/result statistics, downloadable
PGN/JSON/SVG exports, and locally saved appearance settings.

## Features

- empty initial workspace that creates a tree from board moves or PGN import
- responsive chessboard with SVG pieces, coordinates, move highlighting, and rotation
- compact circular move nodes with short connectors, automatic fit-to-screen, manual zoom, collapse, expand, and scrolling
- tree direction switch between rightward and downward layouts
- board position synchronized with the selected move
- legal board moves create nodes and alternative branches in the tree
- local import of one or more PGN games or a complete Chess Tree Builder JSON file
- pasted SAN lines or complete PGN text with recursive variations preserved as tree branches
- download of the complete tree as PGN variations, lossless JSON, or an SVG image
- automatic popularity and result percentages
- responsive desktop and mobile layout

PGN and JSON files are processed locally in the browser and are not uploaded.

## Development

```bash
npm ci
npm run dev
```

## Checks

```bash
npm run lint
npm test
npm run build
```

## Cloudflare Pages

Use the following build settings:

- Framework preset: `None`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist/client`

After the first successful deployment, connect the custom domain
`chesstree.markellosecosystem.com` in the Pages project settings.
