const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { Date, exports: {}, require: name => {
    if (!(name in dependencies)) throw Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(code, context);
  return context.exports;
}
const model = load('src/models/Activity.ts');
const definition = { name: 'Clinic timer', description: 'Clinic instructions', instructions: ['Follow the clinic guide.'], verificationType: 'timer', targetRepetitions: 0, targetDurationSeconds: 60, estimatedDurationSeconds: 60, tutorialUrl: '', safetyNotice: '', isActive: true };

function fixture() {
  const data = new Map([
    ['users/staff', { role: 'midwife' }], ['users/auth-patient', { role: 'patient' }],
    ['activities/timer', { ...definition, createdBy: 'staff', createdAt: 'ORIGINAL' }],
  ]);
  const versions = new Map(), listeners = new Set(), writes = [];
  const auth = { currentUser: { uid: 'staff' } };
  let counter = 0, fail = false, retries = 0;
  const deleted = Symbol('delete');
  const snapshot = ref => ({ id: ref.path.split('/').at(-1), exists: () => data.has(ref.path), data: () => data.get(ref.path) });
  const result = source => ({ docs: [...data.entries()].filter(([key, value]) =>
    key.startsWith(source.path + '/') && key.split('/').length === source.path.split('/').length + 1 &&
    (source.filters || []).every(filter => value[filter.field] === filter.value)
  ).map(([key]) => snapshot({ path: key })) });
  const notify = () => listeners.forEach(listener => listener.next(result(listener.source)));
  const firestore = {
    collection: (_db, name) => ({ path: name }),
    doc: (base, ...parts) => ({ path: parts.length ? parts.join('/') : `${base.path}/new-${++counter}`, get id() { return this.path.split('/').at(-1); } }),
    where: (field, operator, value) => ({ field, operator, value }),
    query: (source, ...filters) => ({ ...source, filters }),
    getDoc: async ref => snapshot(ref), getDocsFromServer: async source => result(source),
    onSnapshot: (source, next) => { const listener = { source, next }; listeners.add(listener); next(result(source)); return () => listeners.delete(listener); },
    serverTimestamp: () => 'SERVER', deleteField: () => deleted,
    runTransaction: async (_db, callback) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const reads = new Map(), pending = [];
        await callback({
          get: async ref => { reads.set(ref.path, versions.get(ref.path) || 0); return snapshot(ref); },
          update: (ref, value) => pending.push({ ref, value, update: true }),
          set: (ref, value) => pending.push({ ref, value }),
        });
        if ([...reads].some(([key, version]) => (versions.get(key) || 0) !== version)) { retries++; continue; }
        if (fail) { fail = false; throw Error('Network unavailable'); }
        pending.forEach(({ ref, value, update }) => {
          const next = { ...(update ? data.get(ref.path) : {}), ...value };
          Object.keys(next).forEach(key => { if (next[key] === deleted) delete next[key]; });
          data.set(ref.path, next); versions.set(ref.path, (versions.get(ref.path) || 0) + 1); writes.push(ref.path);
        });
        notify(); return;
      }
      throw Error('Too many retries');
    },
  };
  const service = load('src/services/activityService.ts', { 'firebase/firestore': firestore, '../config/firebase': { auth, db: {} }, '../models/Activity': model });
  return { service, data, auth, writes, listeners, get retries() { return retries; }, failNext: () => { fail = true; } };
}

test('account link uses stored Auth UID, never clinical document ID; absent and invalid links fail', async () => {
  const f = fixture();
  assert.equal(await f.service.getPatientAuthUid({ id: 'clinical-record-123', uid: 'auth-patient' }), 'auth-patient');
  await assert.rejects(f.service.getPatientAuthUid({ id: 'auth-patient' }), /not linked/);
  await assert.rejects(f.service.getPatientAuthUid({ uid: 'missing' }), /unavailable/);
  await assert.rejects(f.service.getPatientAuthUid({ uid: 'staff' }), /unavailable/);
});
test('create and edit retain ID, creation metadata and assignment snapshots; inactive catalog filters out', async () => {
  const f = fixture();
  const id = await f.service.saveActivityDefinition(definition);
  assert.equal(f.data.get(`activities/${id}`).createdBy, 'staff');
  const assignmentId = await f.service.assignActivity(id, 'auth-patient');
  await f.service.saveActivityDefinition({ ...definition, name: 'Edited', targetDurationSeconds: 120 }, id);
  assert.equal(f.data.get(`activities/${id}`).name, 'Edited');
  assert.equal(f.data.get(`activities/${id}`).createdAt, 'SERVER');
  assert.equal(f.data.get(`activities/${id}`).assignmentRevision, 1);
  assert.equal(f.data.get(`patientActivityAssignments/${assignmentId}`).activity.targetDurationSeconds, 60);
  await f.service.setActivityActive(id, false);
  let active;
  const stop = f.service.subscribeActivityLibrary(value => { active = value; }, error => { throw error; }, true);
  assert.equal(active.some(item => item.id === id), false);
  assert.equal(f.data.get(`patientActivityAssignments/${assignmentId}`).activity.isActive, true);
  await assert.rejects(f.service.assignActivity(id, 'auth-patient'), /approved configuration/);
  stop(); assert.equal(f.listeners.size, 0);
});
test('assignment uses real UID and patient/staff listeners receive the same existing assignment', async () => {
  const f = fixture(); let staffItems, patientItems;
  const stopStaff = f.service.subscribePatientActivities('auth-patient', value => { staffItems = value; }, error => { throw error; });
  f.auth.currentUser.uid = 'auth-patient';
  const stopPatient = f.service.subscribeActivities(value => { patientItems = value; }, error => { throw error; });
  f.auth.currentUser.uid = 'staff';
  const id = await f.service.assignActivity('timer', 'auth-patient');
  assert.equal(patientItems[0].id, id); assert.equal(staffItems[0].id, id);
  assert.equal(patientItems[0].patientUid, 'auth-patient');
  assert.equal(patientItems[0].status, 'not_started');
  stopStaff(); stopPatient(); assert.equal(f.listeners.size, 0);
});
test('simultaneous staff submissions create one assignment and retry against the committed duplicate', async () => {
  const f = fixture();
  const results = await Promise.allSettled([f.service.assignActivity('timer', 'auth-patient'), f.service.assignActivity('timer', 'auth-patient')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.match(results.find(result => result.status === 'rejected').reason.message, /already has an active assignment/);
  assert.equal(f.retries, 1);
  assert.equal([...f.data.keys()].filter(key => key.startsWith('patientActivityAssignments/')).length, 1);
});
test('legacy in-progress assignments block duplicates; completed assignments and logs survive reassignment', async () => {
  const f = fixture();
  const history = { patientUid: 'auth-patient', activityId: 'timer', status: 'in_progress', activity: definition };
  f.data.set('patientActivityAssignments/legacy', history);
  await assert.rejects(f.service.assignActivity('timer', 'auth-patient'), /already has/);
  history.status = 'completed'; f.data.set('activityLogs/legacy', { status: 'completed' });
  await f.service.assignActivity('timer', 'auth-patient');
  assert.equal(f.data.get('patientActivityAssignments/legacy'), history);
  assert.equal(f.data.get('activityLogs/legacy').status, 'completed');
});
test('invalid configuration, invalid recipient, patient callers and failed writes are rejected', async () => {
  const f = fixture();
  await assert.rejects(f.service.saveActivityDefinition({ ...definition, instructions: [] }), /Enter a name/);
  await assert.rejects(f.service.assignActivity('timer', 'clinical-record'), /patient account/);
  f.auth.currentUser.uid = 'auth-patient';
  await assert.rejects(f.service.assignActivity('timer', 'auth-patient'), /Staff access/);
  await assert.rejects(f.service.saveActivityDefinition(definition), /Staff access/);
  await assert.rejects(f.service.setActivityActive('timer', false), /Staff access/);
  f.auth.currentUser.uid = 'staff'; f.failNext();
  await assert.rejects(f.service.assignActivity('timer', 'auth-patient'), /Network/);
  assert.equal(f.writes.length, 0);
  await f.service.assignActivity('timer', 'auth-patient');
  assert.equal(f.data.get('activities/timer').assignmentRevision, 1);
});
test('assignment parser exposes stored timestamps and tolerates missing legacy dates', () => {
  const value = { activity: definition, patientUid: 'p', activityId: 'a', assignedBy: 's', status: 'completed', completedRepetitions: 0, durationSeconds: 60 };
  const date = new Date('2026-09-23T00:00:00Z');
  const parsed = model.parseAssignment('a', { ...value, assignedAt: { toDate: () => date }, completedAt: { toDate: () => date } });
  assert.equal(parsed.assignedAt, date); assert.equal(parsed.completedAt, date);
  assert.equal(model.parseAssignment('a', value).assignedAt, null);
});

test('incomplete catalog drafts remain editable but cannot be activated or assigned', async () => {
  const f = fixture(); let catalog;
  f.data.set('activities/draft', { ...definition, instructions: [], isActive: false });
  const stop = f.service.subscribeActivityLibrary(value => { catalog = value; }, error => { throw error; });
  assert.match(catalog.find(item => item.id === 'draft').configurationError, /review/);
  await assert.rejects(f.service.setActivityActive('draft', true), /approved configuration/);
  await assert.rejects(f.service.assignActivity('draft', 'auth-patient'), /approved configuration/);
  await f.service.saveActivityDefinition({ ...definition, isActive: false }, 'draft');
  assert.equal(catalog.find(item => item.id === 'draft').configurationError, undefined);
  stop();
});
