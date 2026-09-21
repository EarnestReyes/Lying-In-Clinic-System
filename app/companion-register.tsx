import React, { useState } from 'react';
import { Platform, ScrollView, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../src/services/authService';
import { CareButton, CareCard, CareField, s } from '../components/care/CareUI';
export default function CompanionRegistration() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <CareButton label="Back to sign in" secondary onPress={() => router.replace('/(auth)/login')} />
    <CareCard title="Create a companion account" subtitle="Support someone you care about. The patient controls what you can see.">
      {Platform.OS === 'web' ? <Text style={s.text}>Create your companion account in the mobile app.</Text> : <>
        <CareField label="Full name" value={name} onChange={setName} maxLength={120} />
        <Text style={s.label}>Email</Text><TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={s.input} />
        <Text style={s.label}>Password (at least 6 characters)</Text><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry style={s.input} />
        {!!error && <Text style={s.error}>{error}</Text>}
        <CareButton label={busy ? 'Creating account…' : 'Create companion account'} disabled={busy || !name.trim() || !email.trim() || password.length < 6} onPress={async () => {
          setBusy(true); setError('');
          try { await authService.registerCompanionAccount(email, password, name); router.replace('/companion' as any); }
          catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create account.'); }
          finally { setBusy(false); }
        }} />
      </>}
    </CareCard>
  </ScrollView>;
}
