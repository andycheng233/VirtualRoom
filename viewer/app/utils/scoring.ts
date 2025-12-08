const MAX_POINTS = 5000;
const PERFECT_THRESHOLD = 10; // meters
const ZERO_THRESHOLD = 500; // meters

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateScore(distanceMeters: number): number {
  if (distanceMeters <= PERFECT_THRESHOLD) {
    return MAX_POINTS;
  }

  if (distanceMeters >= ZERO_THRESHOLD) {
    return 0;
  }

  const score =
    MAX_POINTS * Math.exp(-0.01 * (distanceMeters - PERFECT_THRESHOLD));
  return Math.round(Math.max(0, score));
}
