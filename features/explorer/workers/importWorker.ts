import {
  monotonicProgress,
  normalizeImportError,
  normalizeLineBuildError,
  processLineBuild,
  processImportText,
  processSanValidation,
} from "../services/importPipeline";
import type {
  ImportProgress,
  ImportWorkerRequest,
  ImportWorkerResponse,
} from "../services/importPipeline";
import { assertFileSizeWithinLimit } from "../services/inputLimits";

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ImportWorkerRequest>) => void) | null;
  postMessage: (message: ImportWorkerResponse) => void;
};

workerScope.onmessage = async ({ data }) => {
  const { requestId } = data;
  const report = monotonicProgress((progress) => {
    workerScope.postMessage({ type: "progress", requestId, progress });
  });

  if (data.type === "validate-san") {
    try {
      const payload = processSanValidation(data.text, data.selectedFen, report);
      workerScope.postMessage({ type: "san-success", requestId, payload });
    } catch {
      workerScope.postMessage({ type: "san-error", requestId });
    }
    return;
  }

  if (data.type === "build-tree") {
    try {
      const payload = processLineBuild(data.lines, report);
      workerScope.postMessage({ type: "build-success", requestId, payload });
    } catch (error) {
      const normalized = normalizeLineBuildError(error);
      workerScope.postMessage({
        type: "error",
        requestId,
        error: {
          code: normalized.code,
          limit: normalized.limit,
          actual: normalized.actual,
        },
      });
    }
    return;
  }

  const { file, kind } = data;

  try {
    assertFileSizeWithinLimit(file.size);
    const content = await readFileText(file, report);
    const payload = processImportText(content, kind, report);
    workerScope.postMessage({ type: "success", requestId, payload });
  } catch (error) {
    const normalized = normalizeImportError(error, kind);
    workerScope.postMessage({
      type: "error",
      requestId,
      error: {
        code: normalized.code,
        limit: normalized.limit,
        actual: normalized.actual,
      },
    });
  }
};

async function readFileText(file: File, report: (progress: ImportProgress) => void) {
  report({ percent: 0, stage: "reading" });
  if (!file.size) {
    report({ percent: 20, stage: "reading" });
    return "";
  }

  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let content = "";
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.byteLength;
    content += decoder.decode(value, { stream: true });
    report({
      percent: Math.min(20, Math.floor((loaded / file.size) * 20)),
      stage: "reading",
    });
  }

  content += decoder.decode();
  report({ percent: 20, stage: "reading" });
  return content;
}
