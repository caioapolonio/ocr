import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createCard, type CardContent } from './mutations';

/** Formulário de revisão dos campos extraídos (reusado pela câmera e pelo mock). */
export function CardReviewForm(props: { initial: CardContent; confidence: number }) {
  const router = useRouter();
  const [form, setForm] = useState<CardContent>(props.initial);
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<CardContent>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function save() {
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
    <View style={styles.form}>
      <Text style={styles.confidence}>Confiança do OCR: {Math.round(props.confidence * 100)}%</Text>

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
