import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { ActivityDefinition, CatalogActivity } from '../../src/models/Activity';
import { saveActivityDefinition } from '../../src/services/activityService';
import { CareButton, CareCheck, CareField, s } from '../care/CareUI';
import { ActivityDialog, errorMessage, verificationLabel } from './StaffActivityUI';

export default function ActivityEditor({ activity, catalog, onClose, onSaved }: { activity?: CatalogActivity; catalog: CatalogActivity[]; onClose(): void; onSaved(name: string): void }) {
  const [name, setName] = useState(activity?.name || '');
  const [description, setDescription] = useState(activity?.description || '');
  const [instructions, setInstructions] = useState(activity?.instructions.join('\n') || '');
  const [type, setType] = useState<ActivityDefinition['verificationType']>(activity?.verificationType || 'timer');
  const [target, setTarget] = useState(String(activity?.verificationType === 'pose' ? activity.targetRepetitions : activity?.targetDurationSeconds || 60));
  const [estimated, setEstimated] = useState(String(activity?.estimatedDurationSeconds || 0));
  const [url, setUrl] = useState(activity?.tutorialUrl || '');
  const [notice, setNotice] = useState(activity?.safetyNotice || '');
  const [active, setActive] = useState(activity?.configurationError ? false : activity?.isActive ?? false);
  const [rules, setRules] = useState(activity?.rules);
  const [templateId, setTemplateId] = useState(activity?.verificationType === 'pose' ? activity.id : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const templates = catalog.filter(item => item.verificationType === 'pose' && item.rules && ((!item.configurationError && item.isActive) || item.id === activity?.id));

  const save = async () => {
    if (submitting.current) return;
    if (!/^\d+$/.test(estimated) || (type !== 'manual' && !/^\d+$/.test(target))) { setError('Targets and estimated duration must be whole numbers.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      await saveActivityDefinition({ name: name.trim(), description: description.trim(), instructions: instructions.split('\n').map(line => line.trim()).filter(Boolean),
        verificationType: type, targetRepetitions: type === 'pose' ? Number(target) : 0, targetDurationSeconds: type === 'timer' ? Number(target) : 0,
        estimatedDurationSeconds: Number(estimated), tutorialUrl: url.trim(), safetyNotice: notice.trim(), isActive: active, ...(type === 'pose' && rules ? { rules } : {}) }, activity?.id);
      onSaved(name.trim());
    } catch (reason) { setError(errorMessage(reason)); }
    finally { submitting.current = false; setBusy(false); }
  };

  return <ActivityDialog title={activity ? 'Edit Activity' : 'Create Activity'} busy={busy} onClose={onClose}>
    {!!activity?.configurationError && <Text style={s.notice}>{activity.configurationError} Review the fields below; repaired drafts are inactive unless you explicitly activate them.</Text>}
    <CareField label="Activity name" value={name} onChange={setName} maxLength={150} />
    <CareField label="Description" value={description} onChange={setDescription} multiline />
    <CareField label="Instructions (one step per line)" value={instructions} onChange={setInstructions} multiline />
    <Text style={s.label}>Verification</Text>
    <View style={s.row}>{(['pose', 'timer', 'manual'] as const).map(value => <CareButton key={value} label={verificationLabel(value)} secondary={type !== value} disabled={busy} onPress={() => { setType(value); setTarget(value === 'pose' ? '5' : '60'); }} />)}</View>
    {type === 'pose' && <>
      <Text style={s.label}>Configured movement template</Text>
      <Text style={s.muted}>Uses existing clinic-configured movement rules. Technical thresholds are managed outside this form.</Text>
      {templates.map(item => <CareButton key={item.id} label={`${item.name}${templateId === item.id ? ' (selected)' : ''}`} secondary={templateId !== item.id} disabled={busy} onPress={() => { setTemplateId(item.id); setRules(item.rules); setTarget(String(item.targetRepetitions)); }} />)}
      {!templates.length && !rules && <Text style={s.notice}>No approved movement templates are available. Ask the clinic administrator to configure a pose activity before creating camera activities.</Text>}
    </>}
    {type !== 'manual' && <CareField label={type === 'pose' ? 'Default target (repetitions)' : 'Default duration (seconds, up to 86400)'} value={target} onChange={setTarget} />}
    <CareField label="Estimated duration (seconds; 0 if unspecified)" value={estimated} onChange={setEstimated} />
    <CareField label="Tutorial URL (optional, HTTPS)" value={url} onChange={setUrl} />
    <CareField label="Clinic safety notice (optional)" value={notice} onChange={setNotice} multiline />
    <CareCheck label="Active — available for assignment" checked={active} disabled={busy} onPress={() => setActive(!active)} />
    <Text style={s.muted}>Changes apply to future assignments. Existing assignments retain their approved instructions and targets.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <View style={s.row}><CareButton label="Cancel" secondary disabled={busy} onPress={onClose} /><CareButton label={busy ? 'Saving...' : activity ? 'Save Changes' : 'Create Activity'} disabled={busy || (type === 'pose' && !rules)} onPress={() => { void save(); }} /></View>
  </ActivityDialog>;
}
