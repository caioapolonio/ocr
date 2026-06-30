import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CardReviewForm } from '@/features/cards/CardReviewForm';
import { parsedToContent, type CardContent } from '@/features/cards/mutations';
import { recognizeCard } from '@/features/ocr/recognize';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<{ content: CardContent; confidence: number } | null>(null);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#208AEF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Precisamos da câmera para ler a carteirinha.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Permitir câmera</Text>
        </Pressable>
      </View>
    );
  }

  if (parsed) {
    return (
      <ScrollView contentContainerStyle={styles.reviewContent} keyboardShouldPersistTaps="handled">
        <CardReviewForm initial={parsed.content} confidence={parsed.confidence} />
        <Pressable style={styles.ghostBtn} onPress={() => setParsed(null)}>
          <Text style={styles.ghostBtnText}>Refazer foto</Text>
        </Pressable>
      </ScrollView>
    );
  }

  async function capture() {
    const camera = cameraRef.current;
    if (!camera || busy) return;
    setBusy(true);
    try {
      const photo = await camera.takePictureAsync({ quality: 0.85 });
      if (!photo) return;
      const result = await recognizeCard(photo.uri);
      setParsed({
        content: parsedToContent(result.fields, result.rawOcrText, result.confidence),
        confidence: result.confidence,
      });
    } catch (error) {
      Alert.alert('Falha no OCR', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <Text style={styles.hint}>Enquadre a carteirinha e toque em Capturar.</Text>
      <View style={styles.controls}>
        <Pressable
          style={[styles.shutter, busy && styles.shutterBusy]}
          onPress={capture}
          disabled={busy}
        >
          <Text style={styles.shutterText}>{busy ? 'Lendo…' : 'Capturar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  hint: { color: '#e2e8f0', textAlign: 'center', paddingVertical: 8 },
  controls: { padding: 24, alignItems: 'center' },
  shutter: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 999,
  },
  shutterBusy: { opacity: 0.6 },
  shutterText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  muted: { color: '#475569', textAlign: 'center' },
  btn: { backgroundColor: '#208AEF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
  reviewContent: { padding: 16, backgroundColor: '#f8fafc', flexGrow: 1 },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  ghostBtnText: { color: '#64748b', fontWeight: '500' },
});
