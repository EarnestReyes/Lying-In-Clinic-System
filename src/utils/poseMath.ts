import { Landmark } from '../models/Activity';
export function calculateDistance(a: Landmark, b: Landmark): number { return Math.hypot(a.x - b.x, a.y - b.y); }
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number | null {
  const ab = calculateDistance(a, b), cb = calculateDistance(c, b);
  if (!Number.isFinite(ab + cb) || ab < 0.001 || cb < 0.001) return null;
  const cosine = ((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)) / (ab * cb);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}
export function isLandmarkVisible(p: Landmark | undefined, confidence: number, width: number, height: number): p is Landmark {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.confidence) && p.confidence >= confidence && p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height;
}
