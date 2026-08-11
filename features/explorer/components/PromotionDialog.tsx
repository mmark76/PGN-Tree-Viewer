"use client";

import { useRef } from "react";
import { messages } from "../i18n";
import type { Locale } from "../i18n";
import type { PromotionPiece } from "../services/boardMove";
import { useModalFocus } from "../services/modalFocus";

type PromotionDialogProps = {
  choices: readonly PromotionPiece[];
  locale: Locale;
  onChoose: (piece: PromotionPiece) => void;
  onClose: () => void;
};

const PROMOTION_ORDER: readonly PromotionPiece[] = ["q", "r", "b", "n"];

export function PromotionDialog({ choices, locale, onChoose, onClose }: PromotionDialogProps) {
  const text = messages[locale];
  const dialogRef = useRef<HTMLElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const availableChoices = PROMOTION_ORDER.filter((piece) => choices.includes(piece));
  useModalFocus({ dialogRef, initialFocusRef: firstChoiceRef, onClose });

  return (
    <div
      className="settings-backdrop"
      data-modal-root
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="settings-dialog promotion-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-title"
        aria-describedby="promotion-description"
        tabIndex={-1}
      >
        <div className="settings-head">
          <div>
            <h2 id="promotion-title">{text.choosePromotion}</h2>
            <p id="promotion-description">{text.choosePromotionDescription}</p>
          </div>
          <button
            className="settings-close"
            type="button"
            onClick={onClose}
            aria-label={text.cancelPromotion}
          >
            ×
          </button>
        </div>
        <div className="promotion-choices">
          {availableChoices.map((piece, index) => (
            <button
              key={piece}
              ref={index === 0 ? firstChoiceRef : undefined}
              className="promotion-choice"
              type="button"
              onClick={() => onChoose(piece)}
              aria-label={promotionLabel(piece, text)}
            >
              <span aria-hidden="true">{promotionSymbol(piece)}</span>
              <small>{promotionLabel(piece, text)}</small>
            </button>
          ))}
        </div>
        <div className="settings-footer promotion-footer">
          <button className="button" type="button" onClick={onClose}>{text.cancelPromotion}</button>
        </div>
      </section>
    </div>
  );
}

function promotionLabel(
  piece: PromotionPiece,
  text: typeof messages[Locale],
) {
  switch (piece) {
    case "q": return text.promoteToQueen;
    case "r": return text.promoteToRook;
    case "b": return text.promoteToBishop;
    case "n": return text.promoteToKnight;
  }
}

function promotionSymbol(piece: PromotionPiece) {
  switch (piece) {
    case "q": return "♛";
    case "r": return "♜";
    case "b": return "♝";
    case "n": return "♞";
  }
}
