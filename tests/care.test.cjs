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
const care = load('src/models/Care.ts');
const records = load('src/utils/clinicalRecords.ts');
const plain = data => JSON.parse(JSON.stringify(data));
test('passport merges saved reviews and custom tasks without counting duplicates', () => {
  const saved = [{ ...care.passportTasks[0], done: true, review: 'Reviewed' }, { id: 'custom', label: 'Transport backup', category: 'My checklist', done: true }];
  const merged = care.mergePassport(saved);
  assert.equal(merged.length, care.passportTasks.length + 1);
  assert.equal(merged[0].review, 'Reviewed');
  assert.equal(care.preparationProgress(merged), Math.round(200 / merged.length));
  assert.equal(care.preparationProgress([]), 0);
});
test('companion snapshots include only explicitly selected fields', () => {
  const result = care.companionSnapshot([
    { id: 'selected', label: 'Pack bag', done: true, notes: 'PRIVATE', reviewedBy: 'staff-id' },
    { id: 'unselected', label: 'Do not share', done: false },
  ], ['selected'], [
    { id: 'r1', title: 'Clinic visit', date: '2026-09-20', time: '09:00', patientUid: 'PRIVATE', createdBy: 'PRIVATE' },
    { id: 'r2', title: 'Unselected', date: '', time: '' },
  ], ['r1']);
  assert.deepEqual(plain(result), { preparation: [{ id: 'selected', label: 'Pack bag', done: true }], reminders: [{ id: 'r1', title: 'Clinic visit', date: '2026-09-20', time: '09:00' }] });
});
test('clinical records retain legacy entries, prefer saved documents, and sort newest first', () => {
  const legacy = [{ title: 'Old history', date: 'Sep 18, 2026', notes: 'Old' }, { id: 'same', title: 'Original', date: 'Sep 19, 2026' }, { title: 'Copied visit', date: 'Sep 20, 2026', notes: 'Same' }];
  const saved = [{ id: 'same', title: 'Edited', date: 'Sep 19, 2026' }, { id: 'new', title: 'Copied visit', date: 'Sep 20, 2026', notes: 'Same' }];
  const result = records.mergeClinicalRecords(legacy, saved);
  assert.deepEqual(plain(result.map(item => item.title)), ['Copied visit', 'Edited', 'Old history']);
  assert.equal(records.mergeClinicalRecords().length, 0);
  assert.equal(legacy[1].title, 'Original');
});
test('clinic notices derive both history and checkups without fabricated data', () => {
  assert.equal(records.clinicalNotices(null).length, 0);
  const result = records.clinicalNotices({ medicalHistory: [{ id: 'h', title: 'Updated history', notes: 'Stored note', date: '2026-09-20' }], prenatalVisits: [{ id: 'v', visitNo: 'Visit 2', date: '2026-09-19' }] });
  assert.equal(result[0].kind, 'Medical History Update');
  assert.equal(result[0].detail, 'Stored note');
  assert.equal(result[1].kind, 'Checkup Recorded');
});
function serviceFixture() {
  const data = new Map([['users/staff', { role: 'staff' }]]);
  const auth = { currentUser: { uid: 'staff' } };
  const writes = [];
  const read = async ref => ({ exists: () => data.has(ref), data: () => data.get(ref) });
  const firestore = {
    doc: (_db, ...parts) => parts.join('/'), getDoc: read, serverTimestamp: () => 'SERVER',
    runTransaction: async (_db, callback) => {
      const pending = [];
      await callback({ get: read, set: (ref, value) => pending.push([ref, value]) });
      pending.forEach(([ref, value]) => { writes.push(ref); data.set(ref, value); });
    },
  };
  const service = load('src/services/careService.ts', { 'firebase/firestore': firestore, '../config/firebase': { db: {}, auth }, '../models/Care': care });
  return { service, data, auth, writes };
}
test('recap approval rejects invalid dates and drafts changed since staff review', async () => {
  const { service, data, writes } = serviceFixture();
  const recap = { id: 'r', visitDate: '2026-09-20', summary: 'Reviewed summary', instructions: 'Reviewed instructions', nextVisit: 'Contact clinic' };
  assert.throws(() => service.validateRecap({ ...recap, visitDate: '2026-02-30' }), /valid visit date/);
  assert.throws(() => service.validateRecap({ ...recap, visitDate: '2026-99-99' }), /valid visit date/);
  data.set('care/p/draftRecaps/r', { ...recap, summary: 'Changed by another staff member' });
  await assert.rejects(service.publishRecap('p', 'r', recap), /draft changed/);
  assert.equal(writes.length, 0);
  data.set('care/p/draftRecaps/r', recap);
  await service.publishRecap('p', 'r', recap);
  assert.equal(data.get('care/p/recaps/r').approvedBy, 'staff');
  assert.equal(data.get('care/p/recaps/r').summary, recap.summary);
});
test('patients cannot approve recaps and repeated sharing preserves clinic responses', async () => {
  const { service, data, auth, writes } = serviceFixture();
  auth.currentUser.uid = 'p'; data.set('users/p', { role: 'patient' });
  await assert.rejects(service.publishRecap('p', 'r', {}), /Staff access/);
  data.set('care/p/privateQuestions/q', { text: 'My question' });
  data.set('care/p/sharedQuestions/q', { text: 'My question', answer: 'Existing answer' });
  await service.shareCareQuestion('p', { id: 'q', text: 'My question' }, true);
  assert.equal(writes.length, 0);
  assert.equal(data.get('care/p/sharedQuestions/q').answer, 'Existing answer');
});

test('clinical record subscriptions wait for all sources, update live, and unsubscribe', () => {
  const listeners = new Map();
  const firestore = {
    doc: (_db, ...parts) => parts.join('/'), collection: (_db, ...parts) => parts.join('/'),
    onSnapshot: (ref, callback) => { listeners.set(ref, callback); return () => listeners.delete(ref); },
  };
  const service = load('src/services/patientRecordService.ts', { 'firebase/firestore': firestore, '../config/firebase': { db: {} }, '../utils/clinicalRecords': records });
  const updates = [];
  const stop = service.subscribePatientClinicalRecord('p', value => updates.push(value), error => { throw error; });
  listeners.get('patients/p')({ exists: () => true, id: 'p', data: () => ({ name: 'Test', prenatalVisits: [{ id: 'legacy', date: '2026-09-18' }] }) });
  listeners.get('patients/p/prenatalVisits')({ docs: [] });
  assert.equal(updates.length, 0);
  listeners.get('patients/p/medicalHistory')({ docs: [] });
  assert.equal(updates[0].prenatalVisits.length, 1);
  listeners.get('patients/p/prenatalVisits')({ docs: [{ id: 'visit', data: () => ({ date: '2026-09-20', bp: 'Recorded value' }) }] });
  assert.equal(updates[1].prenatalVisits.length, 2);
  assert.equal(updates[1].prenatalVisits[0].id, 'visit');
  stop();
  assert.equal(listeners.size, 0);
});
