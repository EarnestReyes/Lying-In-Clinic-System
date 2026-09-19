import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { CareQuestion } from '../../src/models/Care';
import { addCareQuestion, answerCareQuestion, deleteCareQuestion, shareCareQuestion } from '../../src/services/careService';
import { CareAction } from './PassportPanel';
import { CareButton, CareCard, CareField, s } from './CareUI';

export function QuestionsPanel({ patientId, questions, shared, staff, busy, run }: { patientId: string; questions: CareQuestion[]; shared: CareQuestion[]; staff: boolean; busy: boolean; run: CareAction }) {
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const visible = staff ? shared : questions;
  return <>
    <CareCard title="Ask at my next visit" subtitle={staff ? 'Only questions the patient chose to share appear here.' : 'Capture questions as they come to mind. Only you can see them until you choose Share with clinic.'}>
      <Text style={s.muted}>This notebook is for the next visit and is not monitored for urgent concerns.</Text>
      {!staff && <><CareField label="My question" value={text} onChange={setText} multiline maxLength={1500} placeholder="What would I like to discuss?" /><CareButton label="Save privately" disabled={busy || !text.trim()} onPress={async () => { if (await run(() => addCareQuestion(patientId, text), 'Question saved privately.')) setText(''); }} /></>}
    </CareCard>
    {!visible.length && <CareCard title={staff ? 'No shared questions yet' : 'A little space for your questions'} subtitle={staff ? 'The patient can share questions from My Care.' : 'Add your first question above. You decide when to share it.'} />}
    {visible.map(question => {
      const sharedQuestion = shared.find(item => item.id === question.id);
      return <CareCard key={question.id}>
        <Text style={s.badge}>{sharedQuestion?.answer ? 'Answered by clinic' : sharedQuestion ? 'Shared with clinic' : 'Private · Only you'}</Text>
        <Text style={s.heading}>{question.text}</Text>
        {!!sharedQuestion?.answer && <View style={s.separator}><Text style={s.label}>Clinic response</Text><Text style={s.text}>{sharedQuestion.answer}</Text></View>}
        {staff ? <><CareField label="Response for the patient" value={answers[question.id] ?? question.answer ?? ''} onChange={value => setAnswers(previous => ({ ...previous, [question.id]: value }))} multiline maxLength={3000} />
          <CareButton label="Save response" disabled={busy} onPress={() => { void run(() => answerCareQuestion(patientId, question.id, answers[question.id] ?? question.answer ?? ''), 'Response shared with patient.'); }} /></>
          : <View style={s.row}>
            <CareButton label={sharedQuestion ? 'Make private again' : 'Share with clinic'} secondary disabled={busy} onPress={() => { void run(() => shareCareQuestion(patientId, question, !sharedQuestion), sharedQuestion ? 'Question is private again. The shared response was removed.' : 'Question shared with clinic.'); }} />
            <CareButton label="Delete" danger disabled={busy} onPress={() => { void run(() => deleteCareQuestion(patientId, question.id), 'Question deleted.'); }} />
          </View>}
      </CareCard>;
    })}
  </>;
}
