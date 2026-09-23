import { AngleCondition, MovementRules, PoseFrame, validMovementRules } from '../models/Activity';
import { calculateAngle, isLandmarkVisible } from '../utils/poseMath';
export type MovementPhase = 'WAITING_FOR_START' | 'START_POSITION' | 'TARGET_POSITION' | 'RETURNED_TO_START';
export interface MovementState { phase: MovementPhase; repetitions: number; candidateSince: number | null; lastTimestamp: number | null; feedback: string }
export const initialMovementState = (repetitions = 0): MovementState => ({ phase: 'WAITING_FOR_START', repetitions, candidateSince: null, lastTimestamp: null, feedback: 'Move into the starting position shown in your guide.' });
export function evaluateMovementPhase(frame: PoseFrame, conditions: AngleCondition[]): boolean {
  return conditions.every(({ points: [a, b, c], min, max }) => {
    const x = frame.landmarks[a], y = frame.landmarks[b], z = frame.landmarks[c];
    if (!x || !y || !z) return false;
    const angle = calculateAngle(x, y, z);
    return angle !== null && angle >= min && angle <= max;
  });
}
export function detectRepetition(state: MovementState, frame: PoseFrame, rules: MovementRules, target: number): MovementState {
  if (!validMovementRules(rules) || !Number.isInteger(target) || target <= 0) throw Error('Invalid movement configuration.');
  if (state.repetitions >= target) return state;
  if (!Number.isFinite(frame.timestamp) || (state.lastTimestamp !== null && frame.timestamp <= state.lastTimestamp)) return state;
  const reset = (feedback: string): MovementState => ({ ...initialMovementState(state.repetitions), lastTimestamp: frame.timestamp, feedback });
  if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height) || frame.width <= 0 || frame.height <= 0) return reset('Camera dimensions unavailable.');
  if (!Object.values(frame.landmarks).some(p => p && p.confidence >= rules.minConfidence)) return reset('No person detected.');
  if (rules.requiredLandmarks.some(n => !isLandmarkVisible(frame.landmarks[n], rules.minConfidence, frame.width, frame.height))) return reset('Make sure all required body landmarks are visible.');
  if (rules.requiredLandmarks.some(n => {
    const p = frame.landmarks[n]!;
    return p.x < frame.width * 0.02 || p.x > frame.width * 0.98 || p.y < frame.height * 0.02 || p.y > frame.height * 0.98;
  })) return reset('Move farther from the camera.');
  if (state.lastTimestamp !== null && frame.timestamp - state.lastTimestamp > rules.maxFrameGapMs) return reset('Tracking lost. Return to the starting position.');
  const phase = state.phase === 'RETURNED_TO_START' ? 'START_POSITION' : state.phase;
  const conditions = phase === 'WAITING_FOR_START' ? rules.startConditions : phase === 'START_POSITION' ? rules.targetConditions : rules.returnConditions;
  // Ambiguous start/target ranges never advance a cycle.
  const ambiguous = evaluateMovementPhase(frame, rules.targetConditions) && (evaluateMovementPhase(frame, rules.startConditions) || evaluateMovementPhase(frame, rules.returnConditions));
  if (ambiguous || !evaluateMovementPhase(frame, conditions)) return { ...state, phase, lastTimestamp: frame.timestamp, candidateSince: null, feedback: phase === 'TARGET_POSITION' ? 'Return to starting position.' : phase === 'START_POSITION' ? 'Body detected. Follow your activity guide.' : 'Body detected. Hold the starting position.' };
  const since = state.candidateSince ?? frame.timestamp;
  if (frame.timestamp - since < rules.holdMs) return { ...state, phase, candidateSince: since, lastTimestamp: frame.timestamp, feedback: 'Movement detected. Hold position.' };
  const next: MovementPhase = phase === 'WAITING_FOR_START' ? 'START_POSITION' : phase === 'START_POSITION' ? 'TARGET_POSITION' : 'RETURNED_TO_START';
  return { phase: next, repetitions: state.repetitions + (next === 'RETURNED_TO_START' ? 1 : 0), candidateSince: null, lastTimestamp: frame.timestamp, feedback: next === 'RETURNED_TO_START' ? 'Rep completed.' : next === 'TARGET_POSITION' ? 'Target position detected. Return to starting position.' : 'Starting position detected.' };
}
