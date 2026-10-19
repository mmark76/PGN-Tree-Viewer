import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("cookie-less analytics is limited to the production hostname", async () => {
  const source = await readFile(
    new URL("../features/explorer/components/CookieLessAnalytics.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /chesstree\.markellosecosystem\.com/);
  assert.match(source, /analytics\.markellosecosystem\.com\/v1\/script\.js/);
  assert.doesNotMatch(source, /googletagmanager|G-DK5WN8TH3Z|localStorage|consent/i);
});
