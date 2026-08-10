import vinext from "vinext";
import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import { formatBuildVersion } from "./features/explorer/services/buildVersion";

function buildVersion() {
  let commit = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) || "unknown";
  let dirty = false;

  try {
    if (commit === "unknown") {
      commit = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
        encoding: "utf8",
      }).trim();
    }
    dirty = Boolean(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim());
  } catch {
    // A source archive can still be built when Git metadata is unavailable.
  }

  return formatBuildVersion(new Date(), commit, dirty);
}

export default defineConfig({
  plugins: [vinext()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion()),
  },
});
