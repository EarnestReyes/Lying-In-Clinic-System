const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => { if (name in mocks) return mocks[name]; throw new Error(name); }, module, module.exports);
  return module.exports;
}
const bp = load('src/utils/patientProgress.ts');
const appointments = load('src/utils/patientAppointments.ts');
test('BP uses separate values or safely parsed pairs and orders by visit date', () => {
  assert.deepEqual(bp.bloodPressure({ bp: ' 120 / 80 ' }), { systolic: 120, diastolic: 80 });
  assert.deepEqual(bp.bloodPressure({ systolic: 130, diastolic: 85, bp: '120/80' }), { systolic: 130, diastolic: 85 });
  for (const value of ['', 'unknown', '120/', '80/120', '120/80abc']) assert.equal(bp.bloodPressure({ bp: value }), null);
  const history = bp.bpHistory([{ id: 'later', date: '2026-09-20', bp: '120/80' }, { id: 'earlier', date: '2026-08-20', bp: '118/78' }, { date: 'invalid', bp: '120/80' }, { date: '2026-09-01' }]);
  assert.deepEqual(history.map(item => item.id), ['earlier', 'later']);
});
test('appointment transitions reject past, completed, queue and cancelled records', () => {
  const now = Date.parse('2026-09-20T00:00:00Z');
  const base = { appointmentDate: '2026-09-21', appointmentTime: '10:00 AM', status: 'Scheduled' };
  assert.equal(appointments.appointmentMillis(base), Date.parse('2026-09-21T02:00:00Z'));
  assert.equal(appointments.canPatientChange(base, 'confirmed', now), true);
  for (const status of ['completed', 'cancelled', 'Cancelled', 'Queue']) {
    assert.equal(appointments.canPatientChange({ ...base, status }, 'cancelled', now), false);
    assert.equal(appointments.canPatientChange({ ...base, status }, 'confirmed', now), false);
  }
  assert.equal(appointments.canPatientChange({ ...base, appointmentDate: '2026-09-19' }, 'cancelled', now), false);
  assert.ok(Number.isNaN(appointments.appointmentMillis({ ...base, appointmentDate: '2026-02-30' })));
  assert.ok(Number.isNaN(appointments.appointmentMillis({ ...base, appointmentTime: '13:00 PM' })));
});
test('appointment transaction verifies owner and rereads current state before writing', async () => {
  let current = { patientId: 'other', appointmentDate: '2099-09-21', appointmentTime: '10:00 AM', status: 'pending' };
  const writes = [];
  const service = load('src/services/appointmentService.ts', {
    '../config/firebase': { db: {}, auth: { currentUser: { uid: 'patient' } } },
    '../utils/patientAppointments': appointments,
    'firebase/firestore': { collection: () => 'appointments', doc: () => 'appointment', serverTimestamp: () => 'SERVER', runTransaction: async (_, callback) => callback({ get: async () => ({ exists: () => true, data: () => current }), update: (_, data) => writes.push(data) }) },
  });
  await assert.rejects(service.changePatientAppointment('a', 'confirmed'), /another patient/);
  current = { ...current, patientId: 'patient', status: 'completed' };
  await assert.rejects(service.changePatientAppointment('a', 'cancelled'), /no longer/);
  assert.equal(writes.length, 0);
  current.status = 'pending';
  await service.changePatientAppointment('a', 'cancelled', ' Unavailable ');
  assert.equal(writes[0].cancelledBy, 'patient');
  assert.equal(writes[0].cancellationReason, 'Unavailable');
  assert.equal(writes[0].cancelledAt, 'SERVER');
});

test('permission onboarding completion is account-scoped and survives through both stores', async () => {
  const local = new Map();
  const profiles = new Map([
    ['first', { permissionsOnboardingCompleted: true, permissionsOnboardingCompletedAt: '2026-09-20T00:00:00.000Z' }],
    ['second', { permissionsOnboardingCompleted: false }],
  ]);
  const firestore = {
    doc: (_db, _collection, uid) => ({ uid }),
    getDoc: async ref => ({ exists: () => profiles.has(ref.uid), data: () => profiles.get(ref.uid), ref }),
    updateDoc: async (ref, changes) => profiles.set(ref.uid, { ...profiles.get(ref.uid), ...changes }),
    deleteField: () => undefined,
  };
  const asyncStorage = {
    getItem: async key => local.get(key) ?? null,
    setItem: async (key, value) => { local.set(key, value); },
    removeItem: async key => { local.delete(key); },
  };
  const service = load('src/services/permissionService.ts', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: asyncStorage },
    'expo-location': { PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' } },
    'react-native': { Linking: { openSettings: async () => {} } },
    'firebase/firestore': firestore,
    '../config/firebase': { db: {} },
  });
  local.set('permissions_onboarding_completed_second', 'true');
  assert.equal(await service.hasCompletedPermissionOnboarding('first'), true);
  let cachedNotification = null;
  const unsubscribe = service.subscribePermissionOnboarding('first', value => { cachedNotification = value; });
  assert.equal(await service.hasCompletedPermissionOnboarding('first'), true);
  assert.equal(cachedNotification, true);
  unsubscribe();
  assert.equal(await service.hasCompletedPermissionOnboarding('second'), false);
  assert.equal(local.get('permissions_onboarding_completed_first'), 'true');
  assert.equal(local.has('permissions_onboarding_completed_second'), false);
  await service.markPermissionOnboardingCompleted('second');
  assert.equal(profiles.get('second').permissionsOnboardingCompleted, true);
  assert.equal(local.get('permissions_onboarding_completed_second'), 'true');
  await service.resetPermissionOnboarding('second');
  assert.equal(profiles.get('second').permissionsOnboardingCompleted, false);
  assert.equal(local.has('permissions_onboarding_completed_second'), false);
});

test('location permission service does not request granted or blocked access again', async () => {
  let response = { status: 'granted', canAskAgain: true };
  let requests = 0;
  const location = {
    PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
    getForegroundPermissionsAsync: async () => response,
    requestForegroundPermissionsAsync: async () => { requests += 1; return { status: 'granted', canAskAgain: true }; },
  };
  const service = load('src/services/permissionService.ts', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: {} },
    'expo-location': location,
    'react-native': { Linking: { openSettings: async () => {} } },
    'firebase/firestore': {},
    '../config/firebase': { db: {} },
  });
  assert.equal((await service.requestForegroundLocationPermission()).state, 'granted');
  response = { status: 'denied', canAskAgain: false };
  assert.equal((await service.requestForegroundLocationPermission()).state, 'blocked');
  assert.equal(requests, 0);
  response = { status: 'undetermined', canAskAgain: true };
  assert.equal((await service.requestForegroundLocationPermission()).state, 'granted');
  assert.equal(requests, 1);
});
