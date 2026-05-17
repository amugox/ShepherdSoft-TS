/** Today's date as `YYYY-MM-DD` in the user's local timezone. */
export const todayLocal = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Date-only format: `YYYY-MM-DD`. */
export const formatDateOnly = (value: string | null | undefined): string => {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? value;
};

/** Date-time format: `YYYY-MM-DD hh:mmAM/PM`. */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(normalized);
  if (!match) return formatDateOnly(normalized);
  const [, date, hh24Raw, mm] = match;
  const hh24 = Number(hh24Raw);
  const suffix = hh24 >= 12 ? 'PM' : 'AM';
  const hh12 = String(hh24 % 12 || 12).padStart(2, '0');
  return `${date} ${hh12}:${mm}${suffix}`;
};
