import { parseStudentCard, type ParseResult } from '@ocr/core';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Pipeline de OCR on-device:
 *   1. normaliza a imagem (resize) p/ acelerar e padronizar o reconhecimento;
 *   2. ML Kit extrai o texto bruto (offline, no aparelho);
 *   3. reusa o `parseStudentCard` de @ocr/core (mesmo parser testado) p/ os campos.
 */
export async function recognizeCard(imageUri: string): Promise<ParseResult> {
  const context = ImageManipulator.manipulate(imageUri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const normalized = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });

  const ocr = await TextRecognition.recognize(normalized.uri);
  return parseStudentCard(ocr.text);
}
