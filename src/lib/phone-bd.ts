/** Digits only. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Bangladesh mobile as international digits without leading + (e.g. 8801792110636).
 * Accepts stored values like 8801792110636, 01792110636, or 1792110636.
 */
export function toBdInternationalDigits(input: string): string {
  const d = digitsOnly(input);
  if (d.startsWith("880") && d.length >= 12) return d;
  if (d.startsWith("0") && d.length === 11) return `880${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("1")) return `880${d}`;
  return d;
}

/** Local-style display: 01792-110636 (no +88 shown). */
export function formatBdLocalDisplay(input: string): string {
  const intl = toBdInternationalDigits(input);
  if (!intl.startsWith("880") || intl.length < 12) {
    const raw = digitsOnly(input);
    return raw || input;
  }
  const local = `0${intl.slice(3)}`;
  if (local.length === 11 && local.startsWith("0")) {
    return `${local.slice(0, 5)}-${local.slice(5)}`;
  }
  return local;
}
