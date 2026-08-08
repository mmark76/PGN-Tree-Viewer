export type Locale = "el" | "en";

export const messages = {
  el: {
    eyebrow: "Ο ΠΡΟΣΩΠΙΚΟΣ ΣΟΥ ΧΩΡΟΣ ΣΚΑΚΙΣΤΙΚΗΣ ΜΕΛΕΤΗΣ",
    localPgn: "Τοπικό PGN",
    language: "Γλώσσα",
    reading: "Ανάγνωση…",
    importPgn: "Εισαγωγή PGN",
    backToEcosystem: "Πίσω στο markellosecosystem",
    mainNavigation: "Κύρια πλοήγηση",
    home: "Αρχική",
    moveTree: "Δέντρο κινήσεων",
    board: "Σκακιέρα",
    noPgnSource: "Εισάγετε PGN για να δημιουργηθεί το δέντρο",
    noFile: "Δεν έχει εισαχθεί αρχείο",
    zoomOut: "Σμίκρυνση",
    zoomIn: "Μεγέθυνση",
    expandAll: "Άνοιγμα όλων",
    fileTooLarge: "Το αρχείο είναι μεγαλύτερο από το όριο των 8 MB.",
    noValidMoves: "Δεν βρέθηκαν έγκυρες κινήσεις PGN.",
    readFailed: "Το αρχείο δεν μπόρεσε να διαβαστεί.",
    emptyTreeArea: "Κενή περιοχή δέντρου κινήσεων",
    waitingForPgn: "Αναμονή για εισαγωγή PGN",
    start: "Αρχή",
    openBranch: "Άνοιγμα κλάδου",
    closeBranch: "Κλείσιμο κλάδου",
    position: "Θέση",
    previousMove: "Προηγούμενη κίνηση",
    nextMove: "Επόμενη κύρια κίνηση",
    white: "ΛΕΥΚΑ",
    draw: "ΙΣΟΠΑΛΙΑ",
    black: "ΜΑΥΡΑ",
    chooseMove: "Επίλεξε μία κίνηση στο δέντρο.",
    initialPosition: "Αρχική θέση",
    boardFollowsMoves: "Η σκακιέρα θα ακολουθεί τις κινήσεις μετά την εισαγωγή PGN.",
    currentBoard: "Σκακιέρα τρέχουσας θέσης",
    flipBoard: "Περιστροφή σκακιέρας",
    privacy: "Τα αρχεία PGN αναλύονται τοπικά σε αυτό το πρόγραμμα περιήγησης και δεν μεταφορτώνονται σε διακομιστή.",
    footerNavigation: "Σύνδεσμοι υποσέλιδου",
    ecosystem: "Markellos Ecosystem",
  },
  en: {
    eyebrow: "YOUR PRIVATE CHESS STUDY SPACE",
    localPgn: "Local PGN",
    language: "Language",
    reading: "Reading…",
    importPgn: "Import PGN",
    backToEcosystem: "Back to markellosecosystem",
    mainNavigation: "Main navigation",
    home: "Home",
    moveTree: "Move tree",
    board: "Chessboard",
    noPgnSource: "Import a PGN file to create the move tree",
    noFile: "No file imported",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    expandAll: "Expand all",
    fileTooLarge: "The file exceeds the 8 MB limit.",
    noValidMoves: "No valid PGN moves were found.",
    readFailed: "The file could not be read.",
    emptyTreeArea: "Empty move-tree area",
    waitingForPgn: "Waiting for PGN import",
    start: "Start",
    openBranch: "Expand branch",
    closeBranch: "Collapse branch",
    position: "Position",
    previousMove: "Previous move",
    nextMove: "Next main-line move",
    white: "WHITE",
    draw: "DRAW",
    black: "BLACK",
    chooseMove: "Select a move in the tree.",
    initialPosition: "Initial position",
    boardFollowsMoves: "The board will follow the moves after a PGN file is imported.",
    currentBoard: "Current chess position",
    flipBoard: "Flip board",
    privacy: "PGN files are processed locally in this browser and are not uploaded to a server.",
    footerNavigation: "Footer links",
    ecosystem: "Markellos Ecosystem",
  },
} as const;

export function gamesLabel(locale: Locale, count: number) {
  if (locale === "el") return `${count} ${count === 1 ? "παρτίδα" : "παρτίδες"}`;
  return `${count} ${count === 1 ? "game" : "games"}`;
}

export function firstMovesLabel(locale: Locale, count: number) {
  if (locale === "el") return `${count} ${count === 1 ? "πρώτη κίνηση" : "πρώτες κινήσεις"}`;
  return `${count} ${count === 1 ? "first move" : "first moves"}`;
}

export function importSuccess(locale: Locale, gameCount: number, skippedCount: number) {
  if (locale === "el") {
    const imported = gameCount === 1 ? "εισήχθη" : "εισήχθησαν";
    const skipped = skippedCount === 1 ? "παραλείφθηκε" : "παραλείφθηκαν";
    return `${gamesLabel(locale, gameCount)} ${imported}${skippedCount ? ` · ${skippedCount} ${skipped}` : ""}.`;
  }
  return `${gamesLabel(locale, gameCount)} imported${skippedCount ? ` · ${skippedCount} skipped` : ""}.`;
}
