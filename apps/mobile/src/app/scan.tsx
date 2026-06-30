import { parseStudentCard } from '@ocr/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createCard, parsedToContent, type CardContent } from '@/features/cards/mutations';
import { OCR_SAMPLES, type OcrSample } from '@/features/cards/samples';

export default function ScanScreen() {
  const router = useRouter();
  const [form, setForm] = useState<CardContent | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [saving, setSaving] = useState(false);

  function loadSample(sample: OcrSample) {
    const result = parseStudentCard(sample.text);
    setForm(parsedToContent(result.fields, result.rawOcrText, result.confidence));
    setConfidence(result.confidence);
  }

  function update(patch: Partial<CardContent>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  async function save() {
    if (!form) return;
    if (!form.fullName.trim() || !form.institution.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha pelo menos nome e instituição.');
      return;
    }
    setSaving(true);
    try {
      const id = await createCard(form);
      router.replace(`/card/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Escolha uma amostra (simula o OCR on-device):</Text>
      <View style={styles.samples}>
        {OCR_SAMPLES.map((sample) => (
          <Pressable key={sample.label} style={styles.sampleBtn} onPress={() => loadSample(sample)}>
            <Text style={styles.sampleBtnText}>{sample.label}</Text>
          </Pressable>
        ))}
      </View>

      {form ? (
        <View style={styles.form}>
          <Text style={styles.confidence}>Confiança do parser: {Math.round(confidence * 100)}%</Text>

          <Field label="Nome" value={form.fullName} onChangeText={(t) => update({ fullName: t })} />
          <Field
            label="Instituição"
            value={form.institution}
            onChangeText={(t) => update({ institution: t })}
          />
          <Field label="Curso" value={form.course ?? ''} onChangeText={(t) => update({ course: t })} />
          <Field
            label="Matrícula"
            value={form.registrationNumber ?? ''}
            onChangeText={(t) => update({ registrationNumber: t })}
          />
          <Field
            label="Validade (AAAA-MM-DD)"
            value={form.validUntil ?? ''}
            onChangeText={(t) => update({ validUntil: t })}
          />
          <Field label="CPF" value={form.cpf ?? ''} onChangeText={(t) => update({ cpf: t })} />
          {form.educationLevel ? (
            <Text style={styles.meta}>Nível detectado: {form.educationLevel}</Text>
          ) : null}

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Salvando…' : 'Salvar carteirinha'}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.hint}>Selecione uma amostra para extrair e revisar os dados.</Text>
      )}
    </ScrollView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (text: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
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
  form: { gap: 12, marginTop: 8 },
  confidence: { color: '#0f172a', fontWeight: '600' },
  meta: { color: '#475569' },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, color: '#64748b' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  saveBtn: {
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
