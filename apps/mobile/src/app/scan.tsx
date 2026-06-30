import { parseStudentCard } from '@ocr/core';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CardReviewForm } from '@/features/cards/CardReviewForm';
import { parsedToContent, type CardContent } from '@/features/cards/mutations';
import { OCR_SAMPLES, type OcrSample } from '@/features/cards/samples';

export default function ScanScreen() {
  const [parsed, setParsed] = useState<{ content: CardContent; confidence: number } | null>(null);

  function loadSample(sample: OcrSample) {
    const result = parseStudentCard(sample.text);
    setParsed({
      content: parsedToContent(result.fields, result.rawOcrText, result.confidence),
      confidence: result.confidence,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Amostra (simula o OCR, sem câmera):</Text>
      <View style={styles.samples}>
        {OCR_SAMPLES.map((sample) => (
          <Pressable key={sample.label} style={styles.sampleBtn} onPress={() => loadSample(sample)}>
            <Text style={styles.sampleBtnText}>{sample.label}</Text>
          </Pressable>
        ))}
      </View>

      {parsed ? (
        <CardReviewForm initial={parsed.content} confidence={parsed.confidence} />
      ) : (
        <Text style={styles.hint}>Selecione uma amostra para extrair e revisar os dados.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, backgroundColor: '#f8fafc', flexGrow: 1 },
  sectionLabel: { color: '#475569', fontWeight: '500' },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sampleBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sampleBtnText: { color: '#0369a1', fontWeight: '600' },
  hint: { color: '#94a3b8', marginTop: 24, textAlign: 'center' },
});
