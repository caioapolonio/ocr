import { parseStudentCard, type ParseResult } from '@ocr/core';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Apaga uma foto da carteirinha do cache do app. As fotos só servem para o
 * OCR: guardá-las deixaria imagens de documentos no aparelho sem motivo.
 */
export function discardPhoto(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // O sistema já pode ter limpado o cache: nada a fazer
  }
}

/** Normaliza a imagem (resize) e extrai o texto bruto via ML Kit (offline, no aparelho). */
async function ocrImageToText(imageUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(imageUri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const normalized = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });

  try {
    const ocr = await TextRecognition.recognize(normalized.uri);
    return ocr.text;
  } finally {
    discardPhoto(normalized.uri);
  }
}

/**
 * Pipeline de OCR on-device para a frente (+ verso opcional) da carteirinha:
 *   1. normaliza e extrai o texto de cada imagem (ML Kit, offline);
 *   2. concatena os textos (frente primeiro) — campos como a CIA vêm do verso;
 *   3. reusa o `parseStudentCard` de @ocr/core (mesmo parser testado) p/ os campos.
 */
export async function recognizeCards(frontUri: string, backUri?: string): Promise<ParseResult> {
  try {
    const frontText = await ocrImageToText(frontUri);
    const backText = backUri ? await ocrImageToText(backUri) : '';
    const combined = [frontText, backText].filter(Boolean).join('\n');
    return parseStudentCard(combined);
  } finally {
    discardPhoto(frontUri);
    if (backUri) discardPhoto(backUri);
  }
}
