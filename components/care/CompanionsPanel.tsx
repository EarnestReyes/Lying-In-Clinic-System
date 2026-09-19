import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { CareTask, CompanionShare, companionSnapshot } from '../../src/models/Care';
import { Reminder } from '../../src/models/reminder';
import { revokeCompanionShare, saveCompanionShare } from '../../src/services/careService';
import { CareAction } from './PassportPanel';
import { CareButton, CareCard, CareCheck, CareField, s } from './CareUI';

export function CompanionsPanel({ patientId, patientName, tasks, reminders, shares, busy, run }: { patientId: string; patientName: string; tasks: CareTask[]; reminders: Reminder[]; shares: CompanionShare[]; busy: boolean; run: CareAction }) {
  const [companionId, setCompanionId] = useState('');
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<string>();
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
  const clear = () => { setEditing(undefined); setCompanionId(''); setTaskIds([]); setReminderIds([]); };
  return <>
    <CareCard title="Your circle of support" subtitle="Share only what helps. Your companion gets read-only access to the preparation items and reminders you select.">
      <Text style={s.text}>Ask your companion to create a companion account from the mobile sign-in screen and give you their account ID.</Text>
      <Text style={s.muted}>Support contacts, preferences, private questions and visit recaps are never included. Sharing sends a copy of selected details; refresh it when those details change.</Text>
    </CareCard>
    <CareCard title={editing ? 'Update selected access' : 'Invite a trusted companion'}>
      {editing ? <Text selectable style={s.text}>Account: {companionId}</Text> : <CareField label="Companion account ID" value={companionId} onChange={value => setCompanionId(value.trim())} maxLength={128} placeholder="Paste the account ID from their app" />}
      <Text style={s.label}>Preparation items to share</Text>
      {tasks.map(task => <CareCheck key={task.id} label={task.label} checked={taskIds.includes(task.id)} onPress={() => setTaskIds(toggle(taskIds, task.id))} />)}
      <Text style={s.label}>Reminders to share</Text>
      {!reminders.length && <Text style={s.muted}>No reminders available to share yet.</Text>}
      {reminders.filter(item => item.id).map(item => <CareCheck key={item.id} label={`${item.title} · ${item.date} ${item.time}`} checked={reminderIds.includes(item.id!)} onPress={() => setReminderIds(toggle(reminderIds, item.id!))} />)}
      <Text style={s.muted}>{taskIds.length} preparation items and {reminderIds.length} reminders selected. Your display name will also be visible.</Text>
      <View style={s.row}><CareButton label={editing ? 'Save selected access' : 'Grant selected access'} disabled={busy || !companionId || (!taskIds.length && !reminderIds.length)} onPress={async () => {
        if (await run(() => saveCompanionShare({ patientId, patientName, companionId, ...companionSnapshot(tasks, taskIds, reminders, reminderIds) }, editing), 'Selected details shared.')) clear();
      }} />{editing && <CareButton label="Cancel" secondary onPress={clear} />}</View>
    </CareCard>
    {shares.map(share => <CareCard key={share.id} title="Active companion access">
      <Text selectable style={s.text}>{share.companionId}</Text><Text style={s.muted}>{share.preparation.length} preparation items · {share.reminders.length} reminders</Text>
      <Text style={s.muted}>Shared copy updated: {share.updatedAt?.toDate().toLocaleString() || 'Saving…'}</Text>
      <View style={s.row}><CareButton label="Edit selection" secondary disabled={busy} onPress={() => { setEditing(share.id); setCompanionId(share.companionId); setTaskIds(share.preparation.map(item => item.id)); setReminderIds(share.reminders.map(item => item.id)); }} />
        <CareButton label="Refresh shared details" secondary disabled={busy} onPress={() => { void run(() => saveCompanionShare({ patientId, patientName, companionId: share.companionId, ...companionSnapshot(tasks, share.preparation.map(item => item.id), reminders, share.reminders.map(item => item.id)) }, share.id), 'Shared copies refreshed.'); }} />
        <CareButton label="Revoke access" danger disabled={busy} onPress={async () => { if (await run(() => revokeCompanionShare(patientId, share.id), 'Companion access revoked.')) { if (editing === share.id) clear(); } }} />
      </View>
    </CareCard>)}
  </>;
}
