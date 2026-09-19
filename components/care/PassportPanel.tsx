import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CarePlan, CareTask, preparationProgress } from '../../src/models/Care';
import { addCareTask, reviewCareTask, saveCarePlan, setTaskDone } from '../../src/services/careService';
import { Colors as C } from '../../src/theme/colors';
import { CareButton, CareCard, CareCheck, CareField, s } from './CareUI';
export type CareAction = (action: () => Promise<unknown>, message: string) => Promise<boolean>;

export function PassportPanel({ patientId, tasks, plan, staff, run, busy }: { patientId: string; tasks: CareTask[]; plan: CarePlan; staff: boolean; run: CareAction; busy: boolean }) {
  const [label, setLabel] = useState('');
  const [draft, setDraft] = useState(plan);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDraft(plan); }, [plan, dirty]);
  const progress = preparationProgress(tasks);
  return <>
    <CareCard title="Birth Readiness Passport" subtitle="Your preparation, one step at a time. Progress tracks tasks completed, not medical readiness.">
      <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.heading}>{progress}% prepared</Text><Text style={s.muted}>{tasks.filter(task => task.done).length} of {tasks.length} tasks</Text></View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={{ height: 9, borderRadius: 8, backgroundColor: C.surfaceMuted, overflow: 'hidden' }}><View style={{ height: 9, width: `${progress}%`, backgroundColor: C.primary, borderRadius: 8 }} /></View>
    </CareCard>
    {[...new Set(tasks.map(task => task.category))].map(category => <CareCard key={category} title={category}>
      {tasks.filter(task => task.category === category).map(task => <View key={task.id} style={s.separator}>
        <CareCheck checked={task.done} label={task.label} disabled={staff || busy} onPress={() => { void run(() => setTaskDone(patientId, task), 'Checklist updated.'); }} />
        <Text style={[s.badge, task.review === 'Needs attention' && { color: C.warningDark, backgroundColor: C.warningPale }]}>{task.review === 'Pending' ? 'Awaiting staff review' : task.review}</Text>
        {staff && <View style={s.row}><CareButton label="Mark reviewed" secondary disabled={busy} onPress={() => { void run(() => reviewCareTask(patientId, task, 'Reviewed'), 'Review saved.'); }} /><CareButton label="Needs attention" secondary disabled={busy} onPress={() => { void run(() => reviewCareTask(patientId, task, 'Needs attention'), 'Follow-up flagged.'); }} /></View>}
      </View>)}
      <Text style={s.muted}>Staff review reflects preparation items only.</Text>
    </CareCard>)}
    <CareCard title={staff ? 'Add a clinic requirement' : 'Make it your own'}>
      <CareField label="Preparation task" value={label} onChange={setLabel} maxLength={200} placeholder="Something you want to prepare" />
      <CareButton label="Add task" disabled={busy || !label.trim()} onPress={async () => { if (await run(() => addCareTask(patientId, label, staff), 'Task added.')) setLabel(''); }} />
    </CareCard>
    <CareCard title="My support & preferences" subtitle="Shared with your clinic. These details are never included in companion access.">
      {(['companion', 'emergencyContact', 'transport', 'preferences'] as const).map(key => {
        const name = { companion: 'Birth companion', emergencyContact: 'Emergency contact & phone', transport: 'Transport plan', preferences: 'Preferences to discuss with my midwife' }[key];
        return staff ? <View key={key}><Text style={s.label}>{name}</Text><Text style={s.text}>{plan[key] || 'Not added yet'}</Text></View>
          : <CareField key={key} label={name} value={draft[key]} multiline={key === 'preferences'} onChange={value => { setDirty(true); setDraft(previous => ({ ...previous, [key]: value })); }} />;
      })}
      {!staff && <CareButton label={dirty ? 'Save support plan' : 'Plan saved'} disabled={busy || !dirty} onPress={async () => { if (await run(() => saveCarePlan(patientId, draft), 'Support plan saved.')) setDirty(false); }} />}
    </CareCard>
  </>;
}
