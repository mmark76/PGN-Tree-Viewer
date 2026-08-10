export function formatBuildVersion(now: Date, commit: string, dirty: boolean) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Nicosia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "00";
  const timestamp = `${part("year")}${part("month")}${part("day")}_${part("hour")}${part("minute")}`;
  return `version_${timestamp}_commit_${commit}${dirty ? "_dirty" : ""}`;
}
