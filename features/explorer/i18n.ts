export type Locale = "el" | "en";

export const DEFAULT_LOCALE: Locale = "en";

export const messages = {
  el: {
    eyebrow: "Ο ΠΡΟΣΩΠΙΚΟΣ ΣΟΥ ΧΩΡΟΣ ΣΚΑΚΙΣΤΙΚΗΣ ΜΕΛΕΤΗΣ",
    localPgn: "Τοπικά αρχεία",
    language: "Γλώσσα",
    settings: "Ρυθμίσεις",
    settingsDescription: "Προσαρμόστε την εμφάνιση του Chess Tree Builder.",
    closeSettings: "Κλείσιμο ρυθμίσεων",
    colors: "Χρώματα",
    accentColor: "Βασικό χρώμα",
    lightSquares: "Ανοιχτά τετράγωνα",
    darkSquares: "Σκούρα τετράγωνα",
    accentColorContrastError: "Επιλέξτε βασικό χρώμα με αντίθεση τουλάχιστον 4,5:1 σε λευκό φόντο.",
    squareColorsContrastError: "Επιλέξτε χρώματα τετραγώνων με μεταξύ τους αντίθεση τουλάχιστον 2,5:1.",
    sizes: "Μεγέθη",
    textSize: "Μέγεθος κειμένου",
    boardSize: "Μέγεθος σκακιέρας",
    small: "Μικρό",
    compact: "Συμπαγές",
    standard: "Κανονικό",
    large: "Μεγάλο",
    font: "Γραμματοσειρά",
    treeDirection: "Κατεύθυνση δέντρου",
    directionRight: "Προς τα δεξιά",
    directionDown: "Προς τα κάτω",
    classicFont: "Κλασική",
    modernFont: "Μοντέρνα",
    serifFont: "Έντυπη",
    resetSettings: "Επαναφορά",
    done: "Έτοιμο",
    reading: "Ανάγνωση…",
    cancelImport: "Ακύρωση εισαγωγής",
    importCancelled: "Η εισαγωγή ακυρώθηκε.",
    importPgn: "Εισαγωγή PGN / JSON",
    pasteSan: "Επικόλληση SAN / PGN",
    pasteSanDescription: "Επικολλήστε κινήσεις SAN ή ολόκληρο PGN, ελέγξτε το και επιλέξτε πού θα προστεθεί.",
    closeSan: "Κλείσιμο επικόλλησης SAN / PGN",
    sanMoves: "Κινήσεις SAN ή πλήρες PGN",
    pasteClipboard: "Επικόλληση από πρόχειρο",
    checkSan: "Έλεγχος",
    cancelValidation: "Ακύρωση ελέγχου",
    validationCancelled: "Ο έλεγχος SAN ακυρώθηκε.",
    sanValidationFailed: "Ο έλεγχος SAN δεν μπόρεσε να ολοκληρωθεί. Δοκιμάστε ξανά.",
    clipboardFailed: "Δεν επιτράπηκε η ανάγνωση του πρόχειρου. Επικολλήστε με Ctrl+V στο πεδίο.",
    newTree: "Νέο δέντρο",
    addFromHere: "Προσθήκη από εδώ",
    invalidSanMove: "Μη έγκυρη κίνηση στη θέση",
    emptySan: "Δεν βρέθηκαν έγκυρες κινήσεις.",
    invalidFen: "Το FEN της αρχικής θέσης δεν είναι έγκυρο.",
    startPositionMismatch: "Το FEN του PGN δεν ταιριάζει με την επιλεγμένη θέση.",
    validUntil: "Έγκυρες μέχρι εδώ",
    validSanMoves: "έγκυρες κινήσεις",
    treeLines: "γραμμές δέντρου",
    sanAdded: "Η γραμμή SAN προστέθηκε από την επιλεγμένη θέση.",
    sanAlreadyPresent: "Η γραμμή SAN υπάρχει ήδη στο δέντρο.",
    sanTreeCreated: "Δημιουργήθηκε νέο δέντρο από τη γραμμή SAN.",
    replaceUnsavedTree: "Να αντικατασταθεί το τρέχον δέντρο; Υπάρχουν μη αποθηκευμένες αλλαγές.",
    previousTreeAvailable: "Το προηγούμενο δέντρο μπορεί να επαναφερθεί.",
    undoReplacement: "Αναίρεση αντικατάστασης",
    treeRestored: "Το προηγούμενο δέντρο επαναφέρθηκε.",
    choosePromotion: "Επιλογή προαγωγής",
    choosePromotionDescription: "Επιλέξτε το κομμάτι στο οποίο θα προαχθεί το πιόνι.",
    cancelPromotion: "Ακύρωση προαγωγής",
    promoteToQueen: "Προαγωγή σε βασίλισσα",
    promoteToRook: "Προαγωγή σε πύργο",
    promoteToBishop: "Προαγωγή σε αξιωματικό",
    promoteToKnight: "Προαγωγή σε ίππο",
    downloadTree: "Λήψη δέντρου",
    downloadDescription: "Επιλέξτε τη μορφή στην οποία θέλετε να αποθηκευτεί ολόκληρο το δέντρο.",
    closeDownload: "Κλείσιμο λήψης",
    downloadPgn: "Αρχείο PGN",
    downloadPgnDescription: "Κινήσεις και branches ως συμβατές PGN variations.",
    downloadJson: "Αρχείο Chess Tree Builder JSON",
    downloadJsonDescription: "Πλήρες αντίγραφο με δομή, στατιστικά και ρυθμίσεις.",
    downloadSvg: "Εικόνα SVG",
    downloadSvgDescription: "Διανυσματική εικόνα ολόκληρου του δέντρου σε υψηλή ποιότητα.",
    backToEcosystem: "Πίσω στο markellosecosystem",
    mainNavigation: "Κύρια πλοήγηση",
    home: "Αρχική",
    moveTree: "Δέντρο κινήσεων",
    board: "Σκακιέρα",
    noPgnSource: "Παίξτε στη σκακιέρα ή εισαγάγετε PGN / JSON",
    noFile: "Παίξτε μία κίνηση ή εισαγάγετε αρχείο",
    zoomOut: "Σμίκρυνση",
    zoomIn: "Μεγέθυνση",
    smartTreeView: "Έξυπνη ευανάγνωστη προβολή",
    fitTree: "Προσαρμογή ολόκληρου του δέντρου στην οθόνη",
    treeNavigator: "Πλοηγός ολόκληρου του δέντρου",
    treeNavigatorHint: "Μετακινήστε τον φακό ή χρησιμοποιήστε τα βελάκια",
    treeNavigatorLensHint: "Μετακινήστε τον φακό με δείκτη, αφή, κλικ ή σύρσιμο για άμεσο κεντράρισμα του μεγάλου δέντρου",
    expandAll: "Άνοιγμα όλων",
    variationControls: "Διαχείριση παραλλαγών",
    expandVariations: "Άνοιγμα παραλλαγών",
    expandVariationsHint: "Ανοίγει αναδρομικά όλους τους κλάδους του δέντρου",
    shrinkVariations: "Σύμπτυξη παραλλαγών",
    shrinkVariationsHint: "Διατηρεί μια καθαρή κύρια διαδρομή και την επιλεγμένη κίνηση ορατή",
    resizeTreePanel: "Αλλαγή μεγέθους δέντρου κινήσεων",
    resizeTreeWidth: "Αλλαγή πλάτους δέντρου κινήσεων",
    resizeTreeHeight: "Αλλαγή ύψους δέντρου κινήσεων",
    resizeTreeBoth: "Ταυτόχρονη αλλαγή πλάτους και ύψους δέντρου κινήσεων",
    resizeTreeKeyboardHint: "Χρησιμοποιήστε τα βελάκια, Home ή End. Με Shift η αλλαγή είναι μεγαλύτερη",
    fileTooLarge: "Το αρχείο είναι μεγαλύτερο από το όριο των 8 MB.",
    noValidMoves: "Δεν βρέθηκαν έγκυρες κινήσεις PGN.",
    invalidTreeFile: "Το αρχείο Chess Tree Builder JSON δεν είναι έγκυρο ή δεν υποστηρίζεται.",
    mixedStartPositions: "Δεν μπορούν να συγχωνευτούν παρτίδες με διαφορετικές αρχικές θέσεις.",
    invalidResults: "Τα αθροίσματα αποτελεσμάτων δεν είναι έγκυρα.",
    unsafeTotals: "Ένα πλήθος ή ένας αριθμός κίνησης στο αρχείο υπερβαίνει το ασφαλές αριθμητικό όριο.",
    unsafePosition: "Η επικολλημένη γραμμή υπερβαίνει το ασφαλές εύρος αρίθμησης κινήσεων αυτού του FEN.",
    treeImported: "Το δέντρο Chess Tree Builder εισήχθη επιτυχώς.",
    readFailed: "Το αρχείο δεν μπόρεσε να διαβαστεί.",
    workerUnavailable: "Το πρόγραμμα περιήγησης δεν μπόρεσε να ξεκινήσει επεξεργασία στο παρασκήνιο. Δοκιμάστε ξανά ή χρησιμοποιήστε άλλο σύγχρονο πρόγραμμα περιήγησης.",
    emptyTreeArea: "Κενή περιοχή δέντρου κινήσεων",
    waitingForPgn: "Έτοιμο για χειροκίνητη γραμμή ή εισαγωγή αρχείου",
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
    boardFollowsMoves: "Μετακινήστε ένα πιόνι για να ξεκινήσετε το δέντρο κινήσεων.",
    currentBoard: "Σκακιέρα τρέχουσας θέσης",
    flipBoard: "Περιστροφή σκακιέρας",
    manualLine: "Χειροκίνητη γραμμή",
    noStatistics: "Δεν υπάρχουν στατιστικά για χειροκίνητες κινήσεις.",
    noKnownResults: "Δεν υπάρχουν αναγνωρισμένα αποτελέσματα νίκης, ισοπαλίας ή ήττας για αυτές τις παρτίδες.",
    moveAdded: "Η κίνηση προστέθηκε στο δέντρο.",
    privacy: "Τα αρχεία PGN και JSON επεξεργάζονται τοπικά σε αυτό το πρόγραμμα περιήγησης και δεν μεταφορτώνονται σε διακομιστή.",
    footerNavigation: "Σύνδεσμοι υποσέλιδου",
    ecosystem: "Markellos Ecosystem",
  },
  en: {
    eyebrow: "YOUR PRIVATE CHESS STUDY SPACE",
    localPgn: "Local files",
    language: "Language",
    settings: "Settings",
    settingsDescription: "Customize the appearance of Chess Tree Builder.",
    closeSettings: "Close settings",
    colors: "Colors",
    accentColor: "Accent color",
    lightSquares: "Light squares",
    darkSquares: "Dark squares",
    accentColorContrastError: "Choose an accent color with at least 4.5:1 contrast against white.",
    squareColorsContrastError: "Choose square colors with at least 2.5:1 contrast between them.",
    sizes: "Sizes",
    textSize: "Text size",
    boardSize: "Board size",
    small: "Small",
    compact: "Compact",
    standard: "Standard",
    large: "Large",
    font: "Font",
    treeDirection: "Tree direction",
    directionRight: "To the right",
    directionDown: "Downward",
    classicFont: "Classic",
    modernFont: "Modern",
    serifFont: "Serif",
    resetSettings: "Reset",
    done: "Done",
    reading: "Reading…",
    cancelImport: "Cancel import",
    importCancelled: "Import cancelled.",
    importPgn: "Import PGN / JSON",
    pasteSan: "Paste SAN / PGN",
    pasteSanDescription: "Paste SAN moves or a complete PGN, validate it, and choose where to add it.",
    closeSan: "Close Paste SAN / PGN",
    sanMoves: "SAN moves or complete PGN",
    pasteClipboard: "Paste from clipboard",
    checkSan: "Validate",
    cancelValidation: "Cancel validation",
    validationCancelled: "SAN validation cancelled.",
    sanValidationFailed: "SAN validation could not be completed. Please try again.",
    clipboardFailed: "Clipboard access was not allowed. Paste into the field with Ctrl+V.",
    newTree: "New tree",
    addFromHere: "Add from here",
    invalidSanMove: "Invalid move at position",
    emptySan: "No valid moves were found.",
    invalidFen: "The starting-position FEN is invalid.",
    startPositionMismatch: "The PGN FEN does not match the selected position.",
    validUntil: "Valid up to",
    validSanMoves: "valid moves",
    treeLines: "tree lines",
    sanAdded: "The SAN line was added from the selected position.",
    sanAlreadyPresent: "The SAN line is already in the tree.",
    sanTreeCreated: "A new tree was created from the SAN line.",
    replaceUnsavedTree: "Replace the current tree? It contains unsaved changes.",
    previousTreeAvailable: "The previous tree can be restored.",
    undoReplacement: "Undo replacement",
    treeRestored: "The previous tree was restored.",
    choosePromotion: "Choose promotion",
    choosePromotionDescription: "Choose the piece for the pawn promotion.",
    cancelPromotion: "Cancel promotion",
    promoteToQueen: "Promote to queen",
    promoteToRook: "Promote to rook",
    promoteToBishop: "Promote to bishop",
    promoteToKnight: "Promote to knight",
    downloadTree: "Download tree",
    downloadDescription: "Choose the format in which you want to save the complete move tree.",
    closeDownload: "Close download",
    downloadPgn: "PGN file",
    downloadPgnDescription: "Moves and branches as compatible PGN variations.",
    downloadJson: "Chess Tree Builder JSON file",
    downloadJsonDescription: "A complete copy with structure, statistics, and settings.",
    downloadSvg: "SVG image",
    downloadSvgDescription: "A high-quality vector image of the complete move tree.",
    backToEcosystem: "Back to markellosecosystem",
    mainNavigation: "Main navigation",
    home: "Home",
    moveTree: "Move tree",
    board: "Chessboard",
    noPgnSource: "Play on the board or import a PGN / JSON file",
    noFile: "Play a move or import a file",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    smartTreeView: "Smart readable view",
    fitTree: "Fit the complete tree to the screen",
    treeNavigator: "Complete tree navigator",
    treeNavigatorHint: "Move the lens or use arrow keys",
    treeNavigatorLensHint: "Move the lens with pointer, touch, click, or drag to center the large tree in real time",
    expandAll: "Expand all",
    variationControls: "Variation controls",
    expandVariations: "Expand Variations",
    expandVariationsHint: "Recursively opens every collapsed branch in the move tree",
    shrinkVariations: "Shrink Variations",
    shrinkVariationsHint: "Keeps a clean main path while leaving the selected move visible",
    resizeTreePanel: "Resize move tree",
    resizeTreeWidth: "Resize move-tree width",
    resizeTreeHeight: "Resize move-tree height",
    resizeTreeBoth: "Resize move-tree width and height",
    resizeTreeKeyboardHint: "Use arrow keys, Home, or End. Hold Shift for a larger step",
    fileTooLarge: "The file exceeds the 8 MB limit.",
    noValidMoves: "No valid PGN moves were found.",
    invalidTreeFile: "The Chess Tree Builder JSON file is invalid or unsupported.",
    mixedStartPositions: "Games with different starting positions cannot be merged.",
    invalidResults: "The result totals are invalid.",
    unsafeTotals: "A count or move number in this file exceeds the safe numeric limit.",
    unsafePosition: "The pasted line exceeds the safe move-number range for this FEN.",
    treeImported: "The Chess Tree Builder file was imported successfully.",
    readFailed: "The file could not be read.",
    workerUnavailable: "The browser could not start background processing. Try again or use another modern browser.",
    emptyTreeArea: "Empty move-tree area",
    waitingForPgn: "Ready for a manual line or file import",
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
    boardFollowsMoves: "Move a piece to start building the move tree.",
    currentBoard: "Current chess position",
    flipBoard: "Flip board",
    manualLine: "Manual line",
    noStatistics: "Statistics are not available for manual moves.",
    noKnownResults: "These games have no recognized win, draw, or loss results.",
    moveAdded: "The move was added to the tree.",
    privacy: "PGN and JSON files are processed locally in this browser and are not uploaded to a server.",
    footerNavigation: "Footer links",
    ecosystem: "Markellos Ecosystem",
  },
} as const;

export function gamesLabel(locale: Locale, count: number) {
  if (locale === "el") return `${count} ${count === 1 ? "παρτίδα" : "παρτίδες"}`;
  return `${count} ${count === 1 ? "game" : "games"}`;
}

export function knownResultsLabel(locale: Locale, count: number) {
  if (locale === "el") {
    return `W/D/L από ${count} ${count === 1 ? "γνωστό αποτέλεσμα" : "γνωστά αποτελέσματα"}`;
  }
  return `W/D/L from ${count} known ${count === 1 ? "result" : "results"}`;
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

export function importProgressLabel(
  locale: Locale,
  stage: "reading" | "parsing" | "building" | "validating",
  percent: number,
) {
  const labels = locale === "el"
    ? { reading: "Ανάγνωση", parsing: "Ανάλυση", building: "Δημιουργία δέντρου", validating: "Έλεγχος SAN" }
    : { reading: "Reading", parsing: "Parsing", building: "Building tree", validating: "Validating SAN" };
  return `${labels[stage]} ${percent}%`;
}

export function importErrorMessage(
  locale: Locale,
  error: { code: string; limit?: number; actual?: number },
) {
  const text = messages[locale];
  const limit = formatLimit(locale, error.limit);

  switch (error.code) {
    case "no-valid-moves": return text.noValidMoves;
    case "invalid-tree-file": return text.invalidTreeFile;
    case "invalid-start-fen": return text.invalidFen;
    case "mixed-start-fen": return text.mixedStartPositions;
    case "invalid-results": return text.invalidResults;
    case "unsafe-integer": return text.unsafeTotals;
    case "invalid-lines":
      return locale === "el" ? "Το δέντρο δεν μπόρεσε να ενημερωθεί από αυτές τις κινήσεις." : "The tree could not be updated from these moves.";
    case "read-failed": return text.readFailed;
    case "worker-unavailable": return text.workerUnavailable;
    case "file-size":
      return locale === "el"
        ? `Το αρχείο υπερβαίνει το όριο των ${formatBytes(error.limit)}.`
        : `The file exceeds the ${formatBytes(error.limit)} limit.`;
    case "game-count":
      return locale === "el" ? `Το PGN υπερβαίνει το όριο των ${limit} παρτίδων.` : `The PGN exceeds the ${limit}-game limit.`;
    case "line-count":
      return locale === "el" ? `Η εισαγωγή υπερβαίνει το όριο των ${limit} γραμμών.` : `The input exceeds the ${limit}-line limit.`;
    case "total-plies":
      return locale === "el" ? `Η εισαγωγή υπερβαίνει το συνολικό όριο των ${limit} ημικινήσεων.` : `The input exceeds the ${limit}-ply total limit.`;
    case "depth":
      return locale === "el" ? `Μια γραμμή υπερβαίνει το μέγιστο βάθος των ${limit} ημικινήσεων.` : `A line exceeds the maximum depth of ${limit} plies.`;
    case "node-count":
      return locale === "el" ? `Το δέντρο υπερβαίνει το όριο των ${limit} κόμβων.` : `The tree exceeds the ${limit}-node limit.`;
    case "pgn-block-size":
      return locale === "el" ? `Μια παρτίδα PGN υπερβαίνει το όριο των ${formatBytes(error.limit)}.` : `A PGN game exceeds the ${formatBytes(error.limit)} limit.`;
    case "san-length":
      return locale === "el" ? `Το επικολλημένο κείμενο υπερβαίνει το όριο των ${limit} χαρακτήρων.` : `The pasted text exceeds the ${limit}-character limit.`;
    case "san-token-count":
      return locale === "el" ? `Το επικολλημένο κείμενο υπερβαίνει το όριο των ${limit} tokens.` : `The pasted text exceeds the ${limit}-token limit.`;
    case "san-output-lines":
      return locale === "el" ? `Οι παραλλαγές υπερβαίνουν το όριο των ${limit} γραμμών.` : `The variations exceed the ${limit}-line limit.`;
    case "san-output-plies":
      return locale === "el" ? `Οι παραλλαγές υπερβαίνουν το όριο των ${limit} ημικινήσεων.` : `The variations exceed the ${limit}-ply limit.`;
    case "san-nesting":
      return locale === "el" ? `Οι παραλλαγές υπερβαίνουν το μέγιστο βάθος ένθεσης ${limit}.` : `The variations exceed the maximum nesting depth of ${limit}.`;
    default: return text.readFailed;
  }
}

function formatLimit(locale: Locale, value?: number) {
  return typeof value === "number"
    ? new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-US").format(value)
    : locale === "el" ? "επιτρεπόμενο" : "allowed";
}

function formatBytes(value?: number) {
  if (typeof value !== "number") return "8 MB";
  if (value >= 1024 * 1024) return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
  return `${Math.ceil(value / 1024)} KB`;
}
