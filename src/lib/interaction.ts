export function shouldProcessInteraction(
  lastInteractionAt: number,
  now = Date.now(),
  minIntervalMs = 120
): boolean {
  return now - lastInteractionAt >= minIntervalMs;
}