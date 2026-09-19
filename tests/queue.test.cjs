const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/utils/queue.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, Intl, Date };
vm.runInNewContext(code, context);
const { clinicDay, appointmentDay, canCheckIn, waitingQueue, canTransition } = context.exports;
test('clinic date rolls over at Philippine midnight, regardless of device timezone', () => {
  assert.equal(clinicDay(new Date('2026-09-19T15:59:59Z')), '2026-09-19');
  assert.equal(clinicDay(new Date('2026-09-19T16:00:00Z')), '2026-09-20');
});
test('confirmed same-day appointments only; legacy fields supported', () => {
  for (const status of ['confirmed', 'Scheduled', 'Queue']) assert.equal(canCheckIn({ status, appointmentDate: '2026-09-19' }, '2026-09-19'), true);
  for (const status of ['pending', 'cancelled', 'completed', 'No-show']) assert.equal(canCheckIn({ status, appointmentDate: '2026-09-19' }, '2026-09-19'), false);
  assert.equal(canCheckIn({ status: 'confirmed', appointmentDate: '2026-09-20' }, '2026-09-19'), false);
  assert.equal(canCheckIn({ status: 'Scheduled', date: 'Sep 19, 2026' }, '2026-09-19'), true);
  assert.equal(appointmentDay('invalid'), '');
});
test('waiting order excludes terminal states and pending timestamps; ties are stable', () => {
  const ticket = (id, time, status = 'Waiting') => ({ id, status, checkedInAt: time == null ? null : { toMillis: () => time } });
  const original = [ticket('b', 10), ticket('done', 1, 'Completed'), ticket('a', 10), ticket('early', 5), ticket('pending', null), ticket('active', 1, 'In Consultation'), ticket('absent', 1, 'No-show')];
  assert.equal(waitingQueue(original).map(item => item.id).join(','), 'early,a,b');
  assert.equal(original[0].id, 'b');
});
test('only intended transitions are allowed, including stale action rejection', () => {
  const allowed = new Set(['Waiting:In Consultation', 'Waiting:No-show', 'In Consultation:Completed']);
  for (const from of ['Waiting', 'In Consultation', 'Completed', 'No-show']) {
    for (const to of ['Waiting', 'In Consultation', 'Completed', 'No-show']) assert.equal(canTransition(from, to), allowed.has(`${from}:${to}`));
  }
});

function queueServiceFixture() {
  const records = new Map();
  const auth = { currentUser: { uid: 'patient-1' } };
  const writes = [];
  const firestore = {
    doc: (_db, collection, id) => `${collection}/${id}`,
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    runTransaction: async (_db, callback) => {
      const pending = [];
      await callback({
        get: async key => ({ exists: () => records.has(key), data: () => records.get(key) }),
        set: (key, data) => pending.push([key, data]),
        update: (key, data) => pending.push([key, { ...records.get(key), ...data }]),
      });
      for (const [key, data] of pending) { records.set(key, data); writes.push(key); }
    },
  };
  const serviceSource = fs.readFileSync(require('node:path').join(__dirname, '../src/services/queueService.ts'), 'utf8');
  const serviceCode = ts.transpileModule(serviceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const serviceContext = { exports: {}, require: name => {
    if (name === 'firebase/firestore') return firestore;
    if (name === '../config/firebase') return { auth, db: {} };
    if (name === '../utils/queue') return context.exports;
    throw new Error(`Unexpected import: ${name}`);
  } };
  vm.runInNewContext(serviceCode, serviceContext);
  records.set('users/patient-1', { role: 'patient', fullName: 'Test Patient' });
  records.set('appointments/appt-1', { patientId: 'patient-1', appointmentDate: clinicDay(), appointmentTime: '09:00', purpose: 'Consultation', status: 'confirmed' });
  return { records, auth, writes, service: serviceContext.exports };
}
test('check-in writes private entry and anonymous ticket; repeat preserves arrival', async () => {
  const { records, service, writes } = queueServiceFixture();
  await service.checkIn('appt-1');
  const entry = records.get('queueEntries/appt-1');
  assert.equal(entry.patientName, 'Test Patient');
  assert.equal(entry.checkedInAt, 'SERVER_TIMESTAMP');
  assert.equal(Object.keys(records.get('queueTickets/appt-1')).sort().join(','), 'checkedInAt,day,status');
  await service.checkIn('appt-1');
  assert.equal(writes.length, 2);
  assert.equal(records.get('queueEntries/appt-1'), entry);
});
test('check-in rejects another patient and unconfirmed appointments without writes', async () => {
  const { records, service, auth, writes } = queueServiceFixture();
  auth.currentUser.uid = 'different-patient';
  await assert.rejects(service.checkIn('appt-1'), /another patient/);
  auth.currentUser.uid = 'patient-1';
  records.get('appointments/appt-1').status = 'pending';
  await assert.rejects(service.checkIn('appt-1'), /confirmed appointments today/);
  assert.equal(writes.length, 0);
});
test('staff transitions synchronize ticket, entry and completed appointment; reject stale action', async () => {
  const { records, service, auth, writes } = queueServiceFixture();
  await service.checkIn('appt-1');
  await assert.rejects(service.changeQueueStatus('appt-1', 'In Consultation'), /Staff access/);
  auth.currentUser.uid = 'staff-1';
  records.set('users/staff-1', { role: 'staff' });
  await service.changeQueueStatus('appt-1', 'In Consultation');
  const count = writes.length;
  await assert.rejects(service.changeQueueStatus('appt-1', 'No-show'), /status has changed/);
  assert.equal(writes.length, count);
  await service.changeQueueStatus('appt-1', 'Completed');
  assert.equal(records.get('queueEntries/appt-1').status, 'Completed');
  assert.equal(records.get('queueTickets/appt-1').status, 'Completed');
  assert.equal(records.get('appointments/appt-1').status, 'completed');
});
