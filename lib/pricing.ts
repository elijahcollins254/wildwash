export const DELIVERY_PRICE_POINTS = [
  { hours: 6, multiplier: 2 },
  { hours: 12, multiplier: 1.6 },
  { hours: 24, multiplier: 1.3 },
  { hours: 36, multiplier: 1.1 },
  { hours: 48, multiplier: 1 },
  { hours: 72, multiplier: 1 },
] as const;

export function calculateDeliveryMultiplier(hours: number): number {
  for (let index = 0; index < DELIVERY_PRICE_POINTS.length - 1; index += 1) {
    const current = DELIVERY_PRICE_POINTS[index];
    const next = DELIVERY_PRICE_POINTS[index + 1];
    if (hours >= current.hours && hours <= next.hours) {
      const ratio = (hours - current.hours) / (next.hours - current.hours);
      return current.multiplier + (next.multiplier - current.multiplier) * ratio;
    }
  }

  return Math.max(DELIVERY_PRICE_POINTS[DELIVERY_PRICE_POINTS.length - 1].multiplier, 1);
}

export function getDeliverySpeedLabel(hours: number): string {
  const multiplier = calculateDeliveryMultiplier(hours);
  if (multiplier >= 2) return 'Express';
  if (multiplier >= 1.5) return 'Fast';
  if (multiplier > 1) return 'Normal';
  return hours >= 48 ? 'Economy' : 'Standard';
}
