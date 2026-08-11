import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const panelSource = await readFile(
  new URL("../features/explorer/components/SanPastePanel.tsx", import.meta.url),
  "utf8",
);

test("SAN textarea leaves browser paste handling native for mouse and context-menu paste", () => {
  assert.match(panelSource, /onChange=\{editInput\}/);
  assert.doesNotMatch(panelSource, /onPaste=\{/);
  assert.doesNotMatch(panelSource, /preventDefault\(\)/);
});
