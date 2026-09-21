/** Retain stored legacy records alongside subcollection records, without inventing visits. */
export function mergeClinicalRecords(legacy: any[] = [], records: any[] = []): any[] {
  const result = new Map<string, any>();
  const fingerprint = (item: any) => JSON.stringify([item.date || '', item.title || '', item.visitNo || '', item.bp || '', item.weight || '', item.fhb || '', item.notes || '']);
  const recordIds = new Set(records.filter(item => item.id).map(item => item.id));
  const recordFingerprints = new Set(records.map(fingerprint));
  legacy.forEach((item, index) => {
    if (!item || typeof item !== 'object' || recordIds.has(item.id) || recordFingerprints.has(fingerprint(item))) return;
    const id = item.id || `legacy-${index}`;
    result.set(id, { ...item, id });
  });
  records.forEach(item => result.set(item.id, item));
  const time = (item: any) => item.createdAt?.toMillis?.() || Date.parse(item.date || '') || 0;
  return [...result.values()].sort((a, b) => time(b) - time(a) || String(a.id).localeCompare(String(b.id)));
}

export function clinicalNotices(patient: { medicalHistory?: any[]; prenatalVisits?: any[] } | null) {
  return [
    ...(patient?.medicalHistory || []).map(item => ({ id: `history-${item.id}`, kind: 'Medical History Update', title: item.title || 'Medical history updated', detail: item.notes || '', date: item.date || '', time: '', createdAt: item.createdAt })),
    ...(patient?.prenatalVisits || []).map(item => ({ id: `visit-${item.id}`, kind: 'Checkup Recorded', title: item.visitNo || 'Prenatal checkup', detail: item.notes || 'Your clinic has recorded a checkup.', date: item.date || '', time: '', createdAt: item.createdAt })),
  ].sort((a, b) => (b.createdAt?.toMillis?.() || Date.parse(b.date) || 0) - (a.createdAt?.toMillis?.() || Date.parse(a.date) || 0));
}
