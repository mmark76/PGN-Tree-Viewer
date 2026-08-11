export type ExplorerDataTask = "file" | "tree";

/**
 * Keeps data-changing controls locked throughout both edges of an async task:
 * the task ref changes before React renders the busy state, and it is cleared
 * before React renders the completed data.
 */
export function isExplorerDataMutationLocked(
  importing: boolean,
  activeTask: ExplorerDataTask | null,
) {
  return importing || activeTask !== null;
}
