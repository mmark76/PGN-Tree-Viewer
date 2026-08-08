# ChessTree

ChessTree is an interactive chess-opening explorer with a move tree, a live
board, local PGN import, and move/result statistics.

## Features

- empty initial workspace that creates a tree from board moves or PGN import
- responsive chessboard with SVG pieces, coordinates, move highlighting, and rotation
- interactive variation tree with collapse, expand, zoom, and scrolling
- board position synchronized with the selected move
- legal board moves create nodes and alternative branches in the tree
- local import of one or more PGN games
- automatic popularity and result percentages
- responsive desktop and mobile layout

PGN files are parsed locally in the browser and are not uploaded.

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
