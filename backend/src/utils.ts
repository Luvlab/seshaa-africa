/** Safely coerce a query/param value to string or undefined */
export function qs(val: unknown): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (Array.isArray(val)) return val[0] ? String(val[0]) : undefined;
  return String(val);
}

/** Coerce to string, defaulting to '' */
export function qsStr(val: unknown, fallback = ''): string {
  return qs(val) ?? fallback;
}
