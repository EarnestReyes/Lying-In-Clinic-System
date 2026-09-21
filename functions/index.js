const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');
admin.initializeApp();
const db = admin.firestore();

// Idempotent cleanup also runs after Auth deletion if the callable loses its connection.
async function finishDeletion(uid) {
  const patient = db.doc(`patients/${uid}`);
  const snapshot = await patient.get();
  if (snapshot.exists) await patient.update({ accountStatus: 'deleted', isActive: false, profileImage: admin.firestore.FieldValue.delete(), accountDeletedAt: admin.firestore.FieldValue.serverTimestamp() });
  const shares = await db.collection('careCompanions').where('patientId', '==', uid).get();
  for (const share of shares.docs) await share.ref.delete();
  const questions = await db.collection('care').doc(uid).collection('privateQuestions').get();
  for (const question of questions.docs) await question.ref.delete();
  await admin.storage().bucket().deleteFiles({ prefix: `patients/${uid}/profile/` });
  await db.doc(`users/${uid}`).delete();
}

exports.deletePatientAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in again.');
  const uid = context.auth.uid;
  if (data?.confirmation !== 'DELETE') throw new functions.https.HttpsError('invalid-argument', 'Confirmation is required.');
  const authenticatedAt = Number(context.auth.token.auth_time);
  if (!Number.isFinite(authenticatedAt) || Date.now() / 1000 - authenticatedAt > 300) throw new functions.https.HttpsError('failed-precondition', 'Sign in again before deleting your account.');
  const user = await db.doc(`users/${uid}`).get();
  if (user.data()?.role !== 'patient') throw new functions.https.HttpsError('permission-denied', 'Patient account required.');
  const patient = await db.doc(`patients/${uid}`).get();
  // Preserve clinical records and their stable identifier for staff retention.
  if (patient.exists) await patient.ref.update({ accountStatus: 'deleting', accountDeletionRequestedAt: admin.firestore.FieldValue.serverTimestamp() });
  await admin.auth().deleteUser(uid);
  await finishDeletion(uid);
  return { deleted: true };
});

exports.finishDeletedPatientAccount = functions.runWith({ failurePolicy: true }).auth.user().onDelete(async user => {
  const [profile, patient] = await Promise.all([db.doc(`users/${user.uid}`).get(), db.doc(`patients/${user.uid}`).get()]);
  if (profile.data()?.role === 'patient' || ['deleting', 'deleted'].includes(patient.data()?.accountStatus)) await finishDeletion(user.uid);
});
