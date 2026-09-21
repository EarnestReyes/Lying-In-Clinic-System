const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected import: ${name}`);
  }, module, module.exports);
  return module.exports;
}

const categories = ['Medical Certificate', 'Laboratory Result', 'Ultrasound Result', 'PhilHealth Document', 'Valid ID', 'Referral', 'Prescription', 'Other'];

function fixture() {
  const auth = { currentUser: { uid: 'patient-uid', displayName: null, email: 'patient@example.com' } };
  const writes = [];
  const reviews = [];
  let profile = { role: 'patient', fullName: 'Patient One' };
  let stored = { status: 'pending' };
  const firestore = {
    collection: (_db, ...parts) => parts.join('/'),
    collectionGroup: () => 'documents',
    doc: (...args) => {
      if (args.length === 1) return { id: 'document-id', path: `${args[0]}/document-id` };
      return { id: String(args.at(-1)), path: args.slice(1).join('/') };
    },
    serverTimestamp: () => 'SERVER_TIME',
    setDoc: async (ref, data) => { writes.push({ ref, data }); },
    getDoc: async () => ({ data: () => profile }),
    runTransaction: async (_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => stored }),
      update: (ref, data) => reviews.push({ ref, data }),
    }),
  };
  const storage = {
    ref: (_storage, path) => path,
    uploadBytesResumable: () => ({ on: (_event, progress, _error, complete) => { progress({ bytesTransferred: 4, totalBytes: 4 }); complete(); } }),
    getDownloadURL: async target => `https://firebasestorage.googleapis.com/${target}`,
    deleteObject: async () => {},
  };
  const service = load('src/services/patientDocumentService.ts', {
    'firebase/firestore': firestore,
    'firebase/storage': storage,
    '../config/firebase': { auth, db: {}, storage: {} },
    '../models/patientDocument': { PATIENT_DOCUMENT_CATEGORIES: categories },
  });
  return { service, auth, writes, reviews, setProfile: value => { profile = value; }, setStored: value => { stored = value; } };
}

test('patient document upload derives ownership from Firebase Auth and starts pending', async () => {
  const { service, writes } = fixture();
  const previousFetch = global.fetch;
  global.fetch = async () => ({ ok: true, blob: async () => new Blob(['%PDF']) });
  try {
    await service.uploadPatientDocument('Patient One', {
      title: 'Laboratory result', category: 'Laboratory Result', description: 'CBC result',
    }, { uri: 'file:///result.pdf', name: 'result.pdf', mimeType: 'application/pdf', size: 4 }, () => {});
  } finally {
    global.fetch = previousFetch;
  }
  assert.equal(writes.length, 1);
  assert.equal(writes[0].data.patientId, 'patient-uid');
  assert.equal(writes[0].data.status, 'pending');
  assert.equal(writes[0].data.title, 'Laboratory result');
  assert.match(writes[0].data.storagePath, /^patients\/patient-uid\/documents\/document-id\//);
  assert.equal(writes[0].data.submittedAt, 'SERVER_TIME');
});

test('document validation rejects missing metadata and executable files before upload', async () => {
  const { service, writes } = fixture();
  await assert.rejects(service.uploadPatientDocument('Patient', { title: '', category: 'Other' }, { uri: 'file:///a.pdf', name: 'a.pdf' }, () => {}), /title/);
  await assert.rejects(service.uploadPatientDocument('Patient', { title: 'File', category: 'Other' }, { uri: 'file:///virus.exe', name: 'virus.exe' }, () => {}), /PDF, JPG, JPEG or PNG/);
  assert.equal(writes.length, 0);
});

test('only staff can review pending documents and rejection requires a reason', async () => {
  const { service, auth, reviews, setProfile, setStored } = fixture();
  const document = { id: 'document-id', patientId: 'patient-uid', status: 'pending' };
  await assert.rejects(service.approvePatientDocument(document), /Staff access/);
  auth.currentUser = { uid: 'staff-uid', displayName: 'Midwife One', email: 'staff@example.com' };
  setProfile({ role: 'midwife', fullName: 'Midwife One' });
  await assert.rejects(service.rejectPatientDocument(document, '   '), /rejection reason/);
  await service.rejectPatientDocument(document, 'Image is unclear.');
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].data.status, 'rejected');
  assert.equal(reviews[0].data.reviewedBy, 'staff-uid');
  assert.equal(reviews[0].data.reviewerName, 'Midwife One');
  assert.equal(reviews[0].data.rejectionReason, 'Image is unclear.');
  setStored({ status: 'approved' });
  await assert.rejects(service.approvePatientDocument(document), /already been reviewed/);
});
