const DHAKA_TZ = "Asia/Dhaka";

/** Format an ISO timestamp for display in Bangladesh (Asia/Dhaka), 12-hour clock. */
export function formatDateTimeDhaka(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    timeZone: DHAKA_TZ,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}
