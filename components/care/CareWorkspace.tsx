import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CarePlan, CareQuestion, CareRecap, CareTask, CompanionShare, emptyCarePlan, mergePassport } from '../../src/models/Care';
import { Reminder } from '../../src/models/reminder';
import { subscribeCarePlan, subscribeCareTasks, subscribeCompanionShares, subscribeQuestions, subscribeRecaps } from '../../src/services/careService';
import { subscribeRemindersForPatient } from '../../src/(patient)/remindersService';
import { PassportPanel } from './PassportPanel';
import { QuestionsPanel } from './QuestionsPanel';
import { RecapsPanel } from './RecapsPanel';
import { CompanionsPanel } from './CompanionsPanel';
import { CareButton, CareHeader, s } from '../care/CareUI';

export function CareWorkspace({ patientId, patientName, staff = false, onBack }: { patientId: string; patientName: string; staff?: boolean; onBack?: () => void }) {
  const [section, setSection] = useState('Passport');
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [plan, setPlan] = useState<CarePlan>(emptyCarePlan);
  const [questions, setQuestions] = useState<CareQuestion[]>([]);
  const [shared, setShared] = useState<CareQuestion[]>([]);
  const [recaps, setRecaps] = useState<CareRecap[]>([]);
  const [drafts, setDrafts] = useState<CareRecap[]>([]);
  const [shares, setShares] = useState<CompanionShare[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [connectionError, setConnectionError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    setReady(false); setConnectionError('');
    const loaded = new Set<string>();
    const expected = staff ? 5 : 7;
    const receive = <T,>(key: string, setter: (value: T) => void) => (value: T) => { setter(value); loaded.add(key); if (loaded.size === expected) setReady(true); };
    const fail = () => { setConnectionError('Unable to load your care space. Check your connection or contact the clinic if access is unavailable.'); setReady(false); };
    const stops = [
      subscribeCareTasks(patientId, receive('tasks', setTasks), fail),
      subscribeCarePlan(patientId, receive('plan', setPlan), fail),
      subscribeQuestions(patientId, true, receive('shared', setShared), fail),
      subscribeRecaps(patientId, false, receive('recaps', setRecaps), fail),
    ];
    if (staff) stops.push(subscribeRecaps(patientId, true, receive('drafts', setDrafts), fail));
    else stops.push(subscribeQuestions(patientId, false, receive('questions', setQuestions), fail), subscribeCompanionShares(patientId, false, receive('shares', setShares), fail), subscribeRemindersForPatient(patientId, receive('reminders', setReminders), fail));
    return () => stops.forEach(stop => stop());
  }, [patientId, staff, retry]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setActionError(''); setNotice('');
    try { await action(); setNotice(message); return true; }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Unable to save. Please try again.'); return false; }
    finally { lock.current = false; setBusy(false); }
  };

  const merged = mergePassport(tasks);

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'left', 'right']}>
      <CareHeader title={staff ? `Care Workspace: ${patientName}` : 'My Care Space'} onBack={onBack} />
      <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Text style={s.eyebrow}>{staff ? 'PATIENT CARE' : 'MY CARE · MY CHOICES'}</Text>
          <Text style={s.heroTitle}>{staff ? patientName : 'Ready, supported, informed.'}</Text>
          <Text style={s.heroText}>{staff ? 'Review preparation, respond to shared questions and approve visit recaps.' : 'A personal space for your preparation, questions, visit notes and trusted support.'}</Text>
        </View>
        <View style={s.row}>
          {(staff ? ['Passport', 'Questions', 'Visit recaps'] : ['Passport', 'Questions', 'Visit recaps', 'Companions']).map(item => (
            <CareButton key={item} label={item} secondary={section !== item} disabled={busy} onPress={() => { setSection(item); setNotice(''); setActionError(''); }} />
          ))}
        </View>
        {!!connectionError && <><Text accessibilityRole="alert" style={s.error}>{connectionError}</Text><CareButton label="Retry connection" onPress={() => setRetry(value => value + 1)} /></>}
        {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
        {(!ready || busy) && !connectionError && <ActivityIndicator color="#0D9488" />}
        {ready && !connectionError && <>
          {section === 'Passport' && <PassportPanel patientId={patientId} tasks={merged} plan={plan} staff={staff} busy={busy} run={run} />}
          {section === 'Questions' && <QuestionsPanel patientId={patientId} questions={questions} shared={shared} staff={staff} busy={busy} run={run} />}
          {section === 'Visit recaps' && <RecapsPanel patientId={patientId} recaps={recaps} drafts={drafts} staff={staff} busy={busy} run={run} />}
          {section === 'Companions' && !staff && <CompanionsPanel patientId={patientId} patientName={patientName} tasks={merged} reminders={reminders} shares={shares} busy={busy} run={run} />}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}