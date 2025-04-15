const DIVISIONS: { amount: number; name: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, name: "seconds" },
  { amount: 60, name: "minutes" },
  { amount: 24, name: "hours" },
  { amount: 7, name: "days" },
  { amount: 4.34524, name: "weeks" },
  { amount: 12, name: "months" },
  { amount: Number.POSITIVE_INFINITY, name: "years" },
];

export function formatTimeToNow(date: Date | number | string | null): string {
  if (!date) return "Never";

  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  let duration = (new Date(date).getTime() - new Date().getTime()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name);
    }
    duration /= division.amount;
  }

  return formatter.format(Math.round(duration), "years");
}
