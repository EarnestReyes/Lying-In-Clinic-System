import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { CareRecap } from '../../src/models/Care';
import { publishRecap, saveRecapDraft, withdrawRecap } from '../../src/services/careService';
import { clinicDay } from '../../src/utils/queue';
import { CareAction } from './PassportPanel';
import { CareButton, CareCard, CareField, s } from './CareUI';

export function RecapsPanel({ patientId, recaps, drafts, staff, busy, run }: { patientId: string; recaps: CareRecap[]; drafts: CareRecap[]; staff: boolean; busy: boolean; run: CareAction }) {
  const fresh = () => ({ visitDate: clinicDay(), summary: '', instructions: '', nextVisit: '' });
  const [form, setForm] = useState(fresh);
  const [editId, setEditId] = useState<string>();
  return <>
    <CareCard title="Your visit, made clearer" subtitle={staff ? 'Write a plain-language recap, save a draft, then approve it for the patient.' : 'Keep your clinic-approved visit summaries and follow-up instructions together.'} />
    {staff && <CareCard title={editId ? 'Edit recap draft' : 'Create a visit recap'}>
      <CareField label="Visit date (YYYY-MM-DD)" value={form.visitDate} onChange={visitDate => setForm({ ...form, visitDate })} maxLength={10} />
      <CareField label="What we discussed" value={form.summary} onChange={summary => setForm({ ...form, summary })} multiline maxLength={4000} />
      <CareField label="Instructions approved by the clinic" value={form.instructions} onChange={instructions => setForm({ ...form, instructions })} multiline maxLength={4000} />
      <CareField label="Next visit / follow-up" value={form.nextVisit} onChange={nextVisit => setForm({ ...form, nextVisit })} maxLength={300} placeholder="Date, time or clinic follow-up plan" />
      <View style={s.row}><CareButton label="Save draft" disabled={busy} onPress={async () => { if (await run(() => saveRecapDraft(patientId, form, editId), 'Draft saved. Review it below before approval.')) { setForm(fresh()); setEditId(undefined); } }} />{editId && <CareButton label="Cancel editing" secondary onPress={() => { setEditId(undefined); setForm(fresh()); }} />}</View>
    </CareCard>}
    {staff && drafts.map(draft => <CareCard key={draft.id} title={`Draft · ${draft.visitDate}`}>
      <Text style={s.text}>{draft.summary}</Text><Text style={s.text}>{draft.instructions}</Text><Text style={s.muted}>Next visit: {draft.nextVisit || 'Not specified'}</Text>
      <View style={s.row}><CareButton label="Edit draft" secondary disabled={busy} onPress={() => { setEditId(draft.id); setForm({ visitDate: draft.visitDate, summary: draft.summary, instructions: draft.instructions, nextVisit: draft.nextVisit }); }} />
        <CareButton label="Approve & share" disabled={busy || editId === draft.id} onPress={() => { void run(() => publishRecap(patientId, draft.id), 'Approved recap is now visible to the patient.'); }} /></View>
    </CareCard>)}
    {!recaps.length && <CareCard title="No approved recaps yet" subtitle="A visit recap will appear here after clinic staff review and approve it." />}
    {[...recaps].sort((a, b) => b.visitDate.localeCompare(a.visitDate)).map(recap => <CareCard key={recap.id} title={recap.visitDate}>
      <Text style={s.badge}>Approved by clinic</Text><Text style={s.heading}>What we discussed</Text><Text style={s.text}>{recap.summary}</Text>
      {!!recap.instructions && <><Text style={s.label}>Your instructions</Text><Text style={s.text}>{recap.instructions}</Text></>}
      <View style={s.separator}><Text style={s.label}>Next visit</Text><Text style={s.text}>{recap.nextVisit || 'Contact the clinic to confirm your follow-up.'}</Text><Text style={s.muted}>This recap does not book or change an appointment.</Text></View>
      {staff && <CareButton label="Withdraw from patient view" danger disabled={busy} onPress={() => { void run(() => withdrawRecap(patientId, recap.id), 'Recap withdrawn. Its draft is retained.'); }} />}
    </CareCard>)}
  </>;
}
