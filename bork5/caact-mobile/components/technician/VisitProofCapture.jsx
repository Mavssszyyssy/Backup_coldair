import React, { useRef, useState } from 'react';
import { Alert, Image, Modal, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import TechButton from './TechButton';
import Card from '../ui/Card';
import { COLORS, FONT, SPACING, RADIUS } from '../../constants/theme';

export default function VisitProofCapture({ photo, onChange, disabled }) {
  const camera = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const openCamera = async () => {
    try {
      if (!permission?.granted && !(await requestPermission()).granted) {
        Alert.alert('Camera access needed', 'Allow camera access to record visit proof.'); return;
      }
      setOpen(true);
    } catch { Alert.alert('Camera unavailable', 'Check camera permission and try again.'); }
  };
  const capture = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const image = await camera.current.takePictureAsync({ base64: true, quality: 0.12 });
      const uri = image?.base64 ? `data:image/jpeg;base64,${image.base64}` : '';
      if (!uri || uri.length > 3_200_000) throw new Error('Retake a smaller, clear photo of the entrance.');
      onChange({ uri }); setOpen(false);
    } catch (error) { Alert.alert('Photo not saved', error.message || 'Please try again.'); }
    finally { setBusy(false); }
  };
  return <Card>
    <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, color: COLORS.textPrimary }}>Visit proof photo</Text>
    <Text style={{ color: COLORS.textSecondary, marginVertical: SPACING.sm }}>Photograph the entrance or closed premises. Avoid including people or private documents.</Text>
    {photo?.uri ? <Image accessibilityLabel="Visit proof preview" source={{ uri: photo.uri }} style={{ width: '100%', height: 190, borderRadius: RADIUS.md, marginBottom: SPACING.sm }} /> : null}
    <TechButton title={photo?.uri ? 'Retake proof photo' : 'Take proof photo'} onPress={openCamera} disabled={disabled} variant="secondary" />
    <Modal visible={open} animationType="slide" onRequestClose={() => !busy && setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}>
        <Text style={{ fontSize: FONT.lg, fontWeight: FONT.bold, marginBottom: SPACING.sm }}>Capture visit proof</Text>
        <CameraView ref={camera} facing="back" style={{ flex: 1, borderRadius: RADIUS.lg }} />
        <TechButton title="Use this photo" onPress={capture} loading={busy} style={{ marginTop: SPACING.md }} />
        <TechButton title="Cancel" onPress={() => setOpen(false)} disabled={busy} variant="secondary" style={{ marginTop: SPACING.sm }} />
      </SafeAreaView>
    </Modal>
  </Card>;
}
