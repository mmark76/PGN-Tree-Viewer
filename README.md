# ChessTree

ChessTree is an interactive chess-opening explorer with a move tree, a live
board, local PGN import, and move/result statistics.

## Features

- curated English Opening repertoire
- interactive variation tree with collapse, expand, zoom, and scrolling
- board position synchronized with the selected move
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
- Build output directory: `out`

After the first successful deployment, connect the custom domain
`chesstree.markellosecosystem.com` in the Pages project settings.
