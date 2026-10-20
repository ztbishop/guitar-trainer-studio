// Shared validation for the optional per-device Wait error-duration tolerance.
export const DEFAULT_BRIEF_ERROR_MS=30;
export function validBriefErrorMs(value) {
  return typeof value==='number' && Number.isInteger(value) && value>=5 && value<=100;
}
export function briefErrorMs(value) {return validBriefErrorMs(value)?value:DEFAULT_BRIEF_ERROR_MS;}
