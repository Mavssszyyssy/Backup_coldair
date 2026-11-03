import React, { useRef, useState } from 'react';
import { Alert, Modal, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import TechButton from './TechButton';
import ProofPhotoList from './ProofPhotoList';
import Card from '../ui/Card';
import { COLORS, FONT, SPACING, RADIUS } from '../../constants/theme';
import { useInterfaceLanguage } from '../../hooks/useInterfaceLanguage';

export default function VisitProofCapture({ photo, onChange, disabled }) {
  const { t } = useInterfaceLanguage();
  const camera = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const openCamera = async () => {
    try {
      if (!permission?.granted && !(await requestPermission()).granted) {
        Alert.alert(t('Camera access needed'), t('Allow camera access to record visit proof.')); return;
      }
      setOpen(true);
    } catch { Alert.alert(t('Camera unavailable'), t('Check camera permission and try again.')); }
  };
  const capture = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const image = await camera.current.takePictureAsync({ base64: true, quality: 0.12 });
      const uri = image?.base64 ? `data:image/jpeg;base64,${image.base64}` : '';
      if (!uri || uri.length > 3_200_000) throw new Error('Retake a smaller, clear photo of the entrance.');
      onChange({ uri }); setOpen(false);
    } catch (error) { Alert.alert(t('Photo not saved'), t(error.message || 'Please try again.')); }
    finally { setBusy(false); }
  };
  return <Card>
    <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary }}>{t('Visit proof photo')}</Text>
    <Text style={{ color: COLORS.textSecondary, marginVertical: SPACING.sm }}>{t('Photograph the entrance or closed premises. Avoid including people or private documents.')}</Text>
    {photo?.uri ? <View style={{ marginBottom: SPACING.sm }}><ProofPhotoList photos={[{ ...photo, label: t('Visit proof preview') }]} height={190} /></View> : null}
    <TechButton title={t(photo?.uri ? 'Retake proof photo' : 'Take proof photo')} onPress={openCamera} disabled={disabled} variant="secondary" />
    <Modal visible={open} animationType="slide" onRequestClose={() => !busy && setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}>
        <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, marginBottom: SPACING.sm }}>{t('Capture visit proof')}</Text>
        <CameraView ref={camera} facing="back" style={{ flex: 1, borderRadius: RADIUS.lg }} />
        <TechButton title={t('Use this photo')} onPress={capture} loading={busy} style={{ marginTop: SPACING.md }} />
        <TechButton title={t('Cancel')} onPress={() => setOpen(false)} disabled={busy} variant="secondary" style={{ marginTop: SPACING.sm }} />
      </SafeAreaView>
    </Modal>
  </Card>;
}
