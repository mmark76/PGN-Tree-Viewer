import type { MoveCoordinates } from "../types";

const pieces: Record<string, string> = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔",
};

type ChessBoardProps = {
  fen: string;
  lastMove: MoveCoordinates | null;
  flipped: boolean;
  onFlip: () => void;
};

export function ChessBoard({ fen, lastMove, flipped, onFlip }: ChessBoardProps) {
  const position = parseFen(fen);
  const files = flipped ? [..."hgfedcba"] : [..."abcdefgh"];
  const ranks = flipped ? [..."12345678"] : [..."87654321"];

  return (
    <div className="board-wrap">
      <div className="board" role="grid" aria-label="Σκακιέρα τρέχουσας θέσης">
        {ranks.flatMap((rank, rankIndex) =>
          files.map((file, fileIndex) => {
            const square = `${file}${rank}`;
            const piece = position[square];
            const isLight = (Number(rank) + file.charCodeAt(0)) % 2 === 1;
            const highlighted = lastMove?.from === square || lastMove?.to === square;
            return (
              <div key={square} className={`square ${isLight ? "light" : "dark"}${highlighted ? " last-move" : ""}`} role="gridcell">
                {fileIndex === 0 && <span className="rank-label">{rank}</span>}
                {rankIndex === 7 && <span className="file-label">{file}</span>}
                {piece && <span className={piece === piece.toUpperCase() ? "piece-white" : "piece-black"}>{pieces[piece]}</span>}
              </div>
            );
          }),
        )}
      </div>
      <button className="button" type="button" onClick={onFlip} style={{ marginTop: 10, width: "100%" }}>
        ↻ Περιστροφή σκακιέρας
      </button>
    </div>
  );
}

function parseFen(fen: string) {
  const board: Record<string, string> = {};
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, rowIndex) => {
    let fileIndex = 0;
    for (const token of row) {
      if (/\d/.test(token)) fileIndex += Number(token);
      else {
        board[`${"abcdefgh"[fileIndex]}${8 - rowIndex}`] = token;
        fileIndex += 1;
      }
    }
  });
  return board;
}
