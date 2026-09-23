const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, require: name => { if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`); return dependencies[name]; } };
  vm.runInNewContext(code, context); return context.exports;
}
const model = load('src/models/Activity.ts');
const math = load('src/utils/poseMath.ts');
const engine = load('src/services/movementEvaluator.ts', { '../models/Activity': model, '../utils/poseMath': math });
const demo = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/activity-demo.json'), 'utf8'));
const approved = { ...demo, isActive: true, instructions: ['Test fixture instruction supplied by staff.'] };
function frame(angle, timestamp) {
  const radians = angle * Math.PI / 180;
  return { width: 640, height: 640, timestamp, landmarks: {
    leftShoulder: { x: 300, y: 150, confidence: .95 }, leftElbow: { x: 300, y: 300, confidence: .95 },
    leftWrist: { x: 300 + 150 * Math.sin(radians), y: 300 - 150 * Math.cos(radians), confidence: .95 },
  } };
}
function runner(target = 3) {
  let state = engine.initialMovementState(), now = 0;
  return {
    get state() { return state; },
    push(angle, edit = f => f, step = 150) { now += step; state = engine.detectRepetition(state, edit(frame(angle, now)), demo.rules, target); return state; },
    hold(angle) { for (let i = 0; i < 3; i++) this.push(angle); return state; },
  };
}
test('joint angles use pixel geometry and reject degenerate or nonfinite joints', () => {
  const p = (x, y) => ({ x, y, confidence: 1 });
  assert.equal(math.calculateAngle(p(0, 1), p(0, 0), p(1, 0)), 90);
  assert.equal(math.calculateAngle(p(-1, 0), p(0, 0), p(1, 0)), 180);
  assert.equal(math.calculateAngle(p(0, 0), p(0, 0), p(1, 0)), null);
  assert.equal(math.calculateAngle(p(NaN, 1), p(0, 0), p(1, 0)), null);
  assert.equal(math.calculateDistance(p(0, 0), p(3, 4)), 5);
});
test('a repetition requires stable start, target, then return; stationary frames never repeat', () => {
  const r = runner();
  r.hold(60); assert.equal(r.state.repetitions, 0);
  r.hold(170); assert.equal(r.state.phase, 'START_POSITION');
  r.hold(60); assert.equal(r.state.phase, 'TARGET_POSITION');
  for (let i = 0; i < 20; i++) r.push(60);
  assert.equal(r.state.repetitions, 0);
  r.hold(170); assert.equal(r.state.repetitions, 1);
  for (let i = 0; i < 20; i++) r.push(170);
  assert.equal(r.state.repetitions, 1);
  r.hold(60); r.hold(170); assert.equal(r.state.repetitions, 2);
});
test('jitter, low confidence, missing landmarks and tracking gaps cannot complete a cycle', () => {
  const r = runner();
  r.hold(170); r.push(60); r.push(120); r.push(60);
  assert.equal(r.state.phase, 'START_POSITION');
  r.hold(60);
  r.push(170, f => { delete f.landmarks.leftWrist; return f; });
  assert.equal(r.state.phase, 'WAITING_FOR_START');
  r.hold(170); assert.equal(r.state.repetitions, 0);
  r.hold(60); r.push(170, f => { f.landmarks.leftWrist.confidence = .1; return f; });
  r.hold(170); assert.equal(r.state.repetitions, 0);
  r.hold(60); r.push(170, f => f, 2000); r.hold(170);
  assert.equal(r.state.repetitions, 0);
});
test('no person, edge clipping and invalid image dimensions produce non-counting feedback', () => {
  const r = runner();
  r.push(170, f => ({ ...f, landmarks: {} })); assert.match(r.state.feedback, /No person/);
  r.push(170, f => { f.landmarks.leftWrist.x = 1; return f; }); assert.match(r.state.feedback, /farther/);
  r.push(170, f => ({ ...f, width: 0 })); assert.match(r.state.feedback, /dimensions/);
  assert.equal(r.state.repetitions, 0);
});
test('duplicate/out-of-order frames and frames after the target do not count', () => {
  const r = runner(1); r.hold(170); r.hold(60); r.hold(170);
  assert.equal(r.state.repetitions, 1);
  const state = r.state;
  r.hold(60); r.hold(170); assert.equal(r.state, state);
  const started = engine.detectRepetition(engine.initialMovementState(), frame(170, 1000), demo.rules, 3);
  assert.equal(engine.detectRepetition(started, frame(170, 1000), demo.rules, 3), started);
  assert.equal(engine.detectRepetition(started, frame(170, 900), demo.rules, 3), started);
});
test('configuration fails closed; technical demo is not automatically assignable', () => {
  assert.equal(model.validActivity(demo), false);
  assert.equal(model.validActivity(approved), true);
  assert.equal(model.validMovementRules({ ...demo.rules, startConditions: [] }), false);
  assert.equal(model.validMovementRules({ ...demo.rules, minConfidence: NaN }), false);
  assert.equal(model.validMovementRules({ ...demo.rules, requiredLandmarks: ['leftElbow'] }), false);
  assert.equal(model.validActivity({ ...approved, tutorialUrl: 'javascript:alert(1)' }), false);
  assert.throws(() => model.parseAssignment('bad', {}), /invalid configuration/);
});
test('overlapping start and target conditions cannot advance the state machine', () => {
  const rules = { ...demo.rules, targetConditions: demo.rules.startConditions };
  let state = engine.initialMovementState();
  for (let t = 100; t < 3000; t += 100) state = engine.detectRepetition(state, frame(170, t), rules, 3);
  assert.equal(state.phase, 'WAITING_FOR_START'); assert.equal(state.repetitions, 0);
});

function fixture(verificationType = 'pose') {
  const activity = { ...approved, verificationType, targetDurationSeconds: verificationType === 'timer' ? 60 : 0 };
  const initial = { patientUid: 'p', activityId: 'demo', assignedBy: 'staff', activity, status: 'not_started', completedRepetitions: 0, durationSeconds: 0, startedAt: null, completedAt: null };
  const data = new Map([['patientActivityAssignments/a', initial]]), writes = [];
  const auth = { currentUser: { uid: 'p' } };
  let fail = false;
  const firestore = {
    doc: (_db, ...parts) => parts.join('/'), serverTimestamp: () => 'SERVER',
    runTransaction: async (_db, callback) => {
      const pending = [];
      await callback({
        get: async ref => ({ exists: () => data.has(ref), data: () => data.get(ref) }),
        update: (ref, value) => pending.push([ref, { ...data.get(ref), ...value }]),
        set: (ref, value) => pending.push([ref, value]),
      });
      if (fail) { fail = false; throw Error('network failure'); }
      pending.forEach(([ref, value]) => { data.set(ref, value); writes.push(ref); });
    },
  };
  const service = load('src/services/activityService.ts', { 'firebase/firestore': firestore, '../config/firebase': { auth, db: {} }, '../models/Activity': model });
  return { service, data, writes, auth, failNext: () => { fail = true; } };
}
test('completion atomically writes a deterministic log and is idempotent on retry', async () => {
  const f = fixture();
  await f.service.saveActivityProgress('a', 0, 0);
  await f.service.saveActivityProgress('a', 3, 12, true);
  assert.equal(f.data.get('patientActivityAssignments/a').status, 'completed');
  assert.equal(f.data.get('activityLogs/a').verificationType, 'pose');
  assert.equal(f.data.get('activityLogs/a').completedRepetitions, 3);
  assert.equal(f.data.get('activityLogs/a').startedAt, 'SERVER');
  const count = f.writes.length;
  await f.service.saveActivityProgress('a', 3, 15, true);
  assert.equal(f.writes.length, count);
});
test('failed completion leaves both records untouched and can be retried', async () => {
  const f = fixture(); f.failNext();
  await assert.rejects(f.service.saveActivityProgress('a', 3, 12, true), /network/);
  assert.equal(f.data.get('patientActivityAssignments/a').status, 'not_started');
  assert.equal(f.data.has('activityLogs/a'), false);
  await f.service.saveActivityProgress('a', 3, 12, true);
  assert.equal(f.data.has('activityLogs/a'), true);
});
test('ownership, missing auth, inactive assignment and invalid progress reject writes', async () => {
  const f = fixture(); f.auth.currentUser.uid = 'other';
  await assert.rejects(f.service.saveActivityProgress('a', 3, 12, true), /another patient/);
  f.auth.currentUser = null;
  await assert.rejects(f.service.saveActivityProgress('a', 3, 12, true), /sign in/);
  f.auth.currentUser = { uid: 'p' };
  await assert.rejects(f.service.saveActivityProgress('a', NaN, 12), /Invalid/);
  await assert.rejects(f.service.saveActivityProgress('a', 4, 12), /exceeded/);
  f.data.get('patientActivityAssignments/a').activity.isActive = false;
  await assert.rejects(f.service.saveActivityProgress('a', 3, 12, true), /paused/);
  assert.equal(f.writes.length, 0);
});
test('pose and timer targets cannot finish early; manual results are labeled manual', async () => {
  const pose = fixture();
  await assert.rejects(pose.service.saveActivityProgress('a', 2, 60, true), /target/);
  const timer = fixture('timer');
  await assert.rejects(timer.service.saveActivityProgress('a', 0, 59, true), /target/);
  await timer.service.saveActivityProgress('a', 0, 60, true);
  assert.equal(timer.data.get('activityLogs/a').verificationType, 'timer');
  const manual = fixture('manual');
  await assert.rejects(manual.service.saveActivityProgress('a', 1, 0, true), /only valid/);
  await manual.service.saveActivityProgress('a', 0, 0, true);
  assert.equal(manual.data.get('activityLogs/a').verificationType, 'manual');
});
test('stale progress writes never reduce persisted counters', async () => {
  const f = fixture();
  await f.service.saveActivityProgress('a', 2, 30);
  await f.service.saveActivityProgress('a', 1, 10);
  assert.equal(f.data.get('patientActivityAssignments/a').completedRepetitions, 2);
  assert.equal(f.data.get('patientActivityAssignments/a').durationSeconds, 30);
});
