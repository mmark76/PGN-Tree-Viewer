export type ResultTotals = {
  white: number;
  draw: number;
  black: number;
  unknown: number;
};

export type LineRecord = {
  moves: string[];
  opening: string;
  results: ResultTotals;
  startFen: string;
};

export type MoveCoordinates = {
  from: string;
  to: string;
};

export type TreeNode = {
  id: string;
  san: string;
  ply: number;
  fen: string;
  parentId: string | null;
  move: MoveCoordinates | null;
  results: ResultTotals;
  openingTotals: Record<string, number>;
  children: TreeNode[];
};

export type PositionedNode = TreeNode & {
  x: number;
  y: number;
  parentCount: number;
};

export type TreeEdge = {
  from: PositionedNode;
  to: PositionedNode;
};
