const divisions: Array<{ amount: number; name: Intl.RelativeTimeFormatUnit }> =
  [
    { amount: 60, name: "seconds" },
    { amount: 60, name: "minutes" },
    { amount: 24, name: "hours" },
    { amount: 7, name: "days" },
    { amount: 4.34524, name: "weeks" },
    { amount: 12, name: "months" },
    { amount: Number.POSITIVE_INFINITY, name: "years" },
  ];

export function formatTimeToNow(date: number) {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let duration = (date - Date.now()) / 1000;

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount)
      return formatter.format(Math.round(duration), division.name);

    duration /= division.amount;
  }

  return formatter.format(Math.round(duration), "years");
}
