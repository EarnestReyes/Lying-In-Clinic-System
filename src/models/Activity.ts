export const landmarkNames = ['nose', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'] as const;
export type LandmarkName = typeof landmarkNames[number];
// Pixel coordinates in the oriented camera image, never preview-scaled coordinates.
export interface Landmark { x: number; y: number; confidence: number }
export interface PoseFrame { landmarks: Partial<Record<LandmarkName, Landmark>>; width: number; height: number; timestamp: number }
export interface AngleCondition { points: [LandmarkName, LandmarkName, LandmarkName]; min: number; max: number }
export interface MovementRules {
  movementType: string;
  requiredLandmarks: LandmarkName[];
  minConfidence: number;
  holdMs: number;
  maxFrameGapMs: number;
  startConditions: AngleCondition[];
  targetConditions: AngleCondition[];
  returnConditions: AngleCondition[];
}
export interface ActivityDefinition {
  name: string; description: string; instructions: string[];
  verificationType: 'pose' | 'timer' | 'manual';
  targetRepetitions: number; targetDurationSeconds: number;
  estimatedDurationSeconds: number;
  tutorialUrl: string; safetyNotice: string; isActive: boolean;
  rules?: MovementRules;
}
export interface ActivityAssignment {
  id: string; patientUid: string; activityId: string; assignedBy: string;
  // Immutable clinic-approved snapshot prevents rule edits during a session.
  activity: ActivityDefinition;
  status: 'not_started' | 'in_progress' | 'completed';
  completedRepetitions: number; durationSeconds: number;
  assignedAt?: Date | null; startedAt?: Date | null; completedAt?: Date | null;
}
export interface CatalogActivity extends ActivityDefinition { id: string; configurationError?: string }

function timestampDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date: unknown = value.toDate();
    if (date instanceof Date && Number.isFinite(date.getTime())) return date;
  }
  return null;
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const integer = (v: unknown): v is number => finite(v) && Number.isInteger(v) && v >= 0;
const name = (v: unknown): v is LandmarkName => typeof v === 'string' && landmarkNames.some(n => n === v);
export function validMovementRules(v: unknown): v is MovementRules {
  if (!object(v) || typeof v.movementType !== 'string' || !v.movementType || !Array.isArray(v.requiredLandmarks) || !v.requiredLandmarks.length || !v.requiredLandmarks.every(name)) return false;
  const required = v.requiredLandmarks;
  const conditions = (c: unknown) => Array.isArray(c) && c.length > 0 && c.every(a => object(a) && Array.isArray(a.points) && a.points.length === 3 && new Set(a.points).size === 3 && a.points.every(p => name(p) && required.includes(p)) && finite(a.min) && finite(a.max) && a.min >= 0 && a.max <= 180 && a.min < a.max);
  return finite(v.minConfidence) && v.minConfidence > 0 && v.minConfidence <= 1 && finite(v.holdMs) && v.holdMs >= 100 && v.holdMs <= 10000 && finite(v.maxFrameGapMs) && v.maxFrameGapMs >= 200 && v.maxFrameGapMs <= 2000 && conditions(v.startConditions) && conditions(v.targetConditions) && conditions(v.returnConditions);
}
export function validActivity(v: unknown): v is ActivityDefinition {
  if (!object(v)) return false;
  return typeof v.name === 'string' && !!v.name.trim() && typeof v.description === 'string' && Array.isArray(v.instructions) && v.instructions.length > 0 && v.instructions.every(i => typeof i === 'string' && !!i.trim()) && typeof v.safetyNotice === 'string' && typeof v.tutorialUrl === 'string' && (!v.tutorialUrl || /^https:\/\//.test(v.tutorialUrl)) && typeof v.isActive === 'boolean' && integer(v.targetRepetitions) && integer(v.targetDurationSeconds) && v.targetDurationSeconds <= 86400 && integer(v.estimatedDurationSeconds) &&
    ((v.verificationType === 'pose' && v.targetRepetitions > 0 && validMovementRules(v.rules)) || (v.verificationType === 'timer' && v.targetDurationSeconds > 0) || v.verificationType === 'manual');
}
export function parseAssignment(id: string, v: unknown): ActivityAssignment {
  if (!object(v) || !validActivity(v.activity) || typeof v.patientUid !== 'string' || typeof v.activityId !== 'string' || typeof v.assignedBy !== 'string' || !['not_started', 'in_progress', 'completed'].includes(String(v.status)) || !integer(v.completedRepetitions) || !integer(v.durationSeconds)) throw Error('An activity has invalid configuration. Please contact the clinic.');
  return { id, patientUid: v.patientUid, activityId: v.activityId, assignedBy: v.assignedBy, activity: v.activity, status: v.status as ActivityAssignment['status'], completedRepetitions: v.completedRepetitions, durationSeconds: v.durationSeconds, assignedAt: timestampDate(v.assignedAt), startedAt: timestampDate(v.startedAt), completedAt: timestampDate(v.completedAt) };
}
