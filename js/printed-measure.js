// Convert a one-based score position into the label the player sees on the staff.
export function printedMeasure(score, number) {
  const bar = score?.masterBars?.[number - 1];
  if (bar?.barNumberText) return bar.barNumberText;
  if (number === 1 && bar?.isAnacrusis) return '0';
  return String(number ?? '?');
}
