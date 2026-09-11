import React, { useCallback, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getTaskById, submitVisitAttempt, TASK_STATUS } from '../../../../services/taskStorage';
import PageHeader from '../../../../components/ui/PageHeader';
import KeyboardAwareScrollView from '../../../../components/ui/KeyboardAwareScrollView';
import TextField from '../../../../components/ui/TextField';
import Card from '../../../../components/ui/Card';
import TechButton from '../../../../components/technician/TechButton';
import VisitProofCapture from '../../../../components/technician/VisitProofCapture';
import { COLORS, FONT, RADIUS, SPACING } from '../../../../constants/theme';

const choices = [
  { id: 'close', title: 'Close this visit', detail: 'End this attempt. Admin will contact the customer to follow up.' },
  { id: 'reschedule', title: 'Request reschedule', detail: 'Ask Admin to confirm a new visit date and time with the customer.' },
];

export default function VisitAttemptScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const installationTask = Boolean((task?.orderId || task?.orderCode) && !task?.requestId);
  useFocusEffect(useCallback(() => {
    let active = true;
    getTaskById(id, { requireOnline: true }).then(value => { if (active) setTask(value); })
      .catch(err => { if (active) setError(err.message || 'Unable to load this visit.'); });
    return () => { active = false; };
  }, [id]));
  const eligible = task?.status === TASK_STATUS.IN_PROGRESS && task?.checkIn?.checkedInAt && !task?.visitAttempt?.awaitingAdmin;
  const save = async () => {
    if (submitting.current) return;
    if (!eligible || !outcome || !note.trim() || !photo?.uri) { setError('Choose an outcome, add a short note and take a proof photo after GPS check-in.'); return; }
    submitting.current = true; setSaving(true); setError('');
    try {
      await submitVisitAttempt(id, { outcome, note: note.trim(), photo, checkedInAt: task.checkIn.checkedInAt });
      const paidOnline = String(task?.orderPayment?.status || '').toLowerCase() === 'paid';
      const savedMessage = installationTask
        ? `This installation attempt is closed and Admin will follow up.${paidOnline ? ' The completed online payment remains recorded on the ticket.' : ' The order remains open and unpaid.'}`
        : 'This visit attempt is closed and Admin will follow up. The customer request stays open, and no service completion was recorded.';
      Alert.alert(installationTask ? 'Failed to Install saved' : 'Visit attempt saved', savedMessage, [{ text: 'Back to work order', onPress: () => router.replace(`/technician/task/${id}/information`) }]);
      setTask(previous => ({ ...previous, visitAttempt: { awaitingAdmin: true } }));
    } catch (err) { setError(err.message || 'Unable to save. Please retry.'); }
    finally { submitting.current = false; setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <KeyboardAwareScrollView style={{ flex: 1 }} minBottomPadding={24} contentContainerStyle={{ padding: SPACING.md }}>
      <PageHeader title={installationTask ? "Failed to Install" : "No one available"} subtitle={task?.taskCode || (installationTask ? 'Record an unattended installation' : 'Record an unattended visit')} color={COLORS.tech} onBack={() => !saving && router.back()} />
      <Card><Text style={{ fontSize: FONT.md, lineHeight: 22, color: COLORS.textPrimary }}>Use this only when you have arrived but no one is available to receive you. This will not cancel the {installationTask ? 'order' : 'service request'} or mark any work as completed.</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>{task?.checkIn?.checkedInAt ? `GPS arrival: ${new Date(task.checkIn.checkedInAt).toLocaleString()}` : 'GPS check-in is required first.'}</Text>
      </Card>
      {String(task?.orderPayment?.status || '').toLowerCase() === 'paid' ? <Card>
        <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.success }}>{String(task?.orderPayment?.method || '').toLowerCase() === 'gcash' ? 'GCash' : 'Online'} payment confirmed</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>PHP {Number(task.orderPayment.amount || 0).toFixed(2)} remains paid even though this installation attempt failed.</Text>
      </Card> : null}
      {task?.visitAttempt?.awaitingAdmin ? <Card><Text>Visit closed. Awaiting Admin follow-up.</Text><TechButton title="Back to work order" onPress={() => router.replace(`/technician/task/${id}/information`)} style={{ marginTop: SPACING.md }} /></Card> : <>
        <Card><Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, marginBottom: SPACING.sm }}>What should happen next?</Text>
          {choices.map(choice => <TouchableOpacity key={choice.id} accessibilityRole="radio" accessibilityState={{ checked: outcome === choice.id }} disabled={saving} onPress={() => setOutcome(choice.id)} style={{ padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: outcome === choice.id ? COLORS.tech : COLORS.border, backgroundColor: outcome === choice.id ? COLORS.techLight : COLORS.surface, marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: FONT.md, fontWeight: FONT.bold, color: COLORS.textPrimary }}>{choice.title}</Text><Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: 4 }}>{choice.detail}</Text>
          </TouchableOpacity>)}
          <TextField label="Visit note" value={note} onChangeText={setNote} editable={!saving} maxLength={500} multiline placeholder="Describe what happened when you arrived" />
        </Card>
        <VisitProofCapture photo={photo} onChange={setPhoto} disabled={saving || !eligible} />
        <TechButton title="Submit visit attempt" onPress={save} loading={saving} disabled={!eligible || !outcome || !note.trim() || !photo?.uri} />
        {saving ? <Text style={{ textAlign: 'center', marginTop: SPACING.sm }}>Saving visit and notifying Admin…</Text> : null}
      </>}
      {error ? <Text accessibilityRole="alert" style={{ color: COLORS.danger, marginTop: SPACING.md }}>{error}</Text> : null}
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}
