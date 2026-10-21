export const ANALYTICS_NOTICE_STORAGE_KEY = "chess-tree-builder.analytics-notice-dismissed";

type NoticeStorage = Pick<Storage, "getItem" | "setItem">;

export function shouldShowAnalyticsNotice(storage: NoticeStorage | undefined) {
  if (!storage) return true;

  try {
    return storage.getItem(ANALYTICS_NOTICE_STORAGE_KEY) !== "true";
  } catch {
    return true;
  }
}

export function dismissAnalyticsNotice(storage: NoticeStorage | undefined) {
  if (!storage) return false;

  try {
    storage.setItem(ANALYTICS_NOTICE_STORAGE_KEY, "true");
    return true;
  } catch {
    return false;
  }
}
