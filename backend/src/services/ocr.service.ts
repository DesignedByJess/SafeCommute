import { env } from '../utils/config';
import { logger } from './audit.service';

export const PLATE_REGEX = /^[A-Z]{3}[\s-]?\d{3}[\s-]?[A-Z]{2}$/;

export const STATE_CODES: readonly string[] = [
  'AB', 'AD', 'AK', 'AN', 'BA', 'BY', 'BE', 'BO', 'CR', 'DE',
  'EB', 'ED', 'EK', 'EN', 'GO', 'IM', 'JI', 'KD', 'KN', 'KT',
  'KE', 'KO', 'KW', 'LA', 'NA', 'NI', 'OG', 'ON', 'OS', 'OY',
  'PL', 'RI', 'SO', 'TA', 'YO', 'ZA', 'FC',
] as const;

const DIGIT_TO_LETTER_MAP: Record<string, string> = {
  '0': 'O', '1': 'I', '5': 'S', '2': 'Z', '8': 'B', '6': 'G',
};

const LETTER_TO_DIGIT_MAP: Record<string, string> = {
  'O': '0', 'I': '1', 'S': '5', 'Z': '2', 'B': '8', 'G': '6',
};

export function correctOcrErrors(text: string): string {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 8) {
    return cleaned;
  }

  const prefix = cleaned
    .slice(0, 3)
    .split('')
    .map((ch) => DIGIT_TO_LETTER_MAP[ch] || ch)
    .join('');

  const middle = cleaned
    .slice(3, 6)
    .split('')
    .map((ch) => LETTER_TO_DIGIT_MAP[ch] || ch)
    .join('');

  const suffix = cleaned
    .slice(6, 8)
    .split('')
    .map((ch) => DIGIT_TO_LETTER_MAP[ch] || ch)
    .join('');

  return `${prefix}${middle}${suffix}`;
}

export function normalizePlate(text: string): string {
  const corrected = correctOcrErrors(text);
  if (corrected.length === 8) {
    const prefix = corrected.slice(0, 3);
    const middle = corrected.slice(3, 6);
    const suffix = corrected.slice(6, 8);
    return `${prefix} ${middle} ${suffix}`;
  }
  return text.toUpperCase().trim();
}

export function validateStateCode(suffix: string): boolean {
  return STATE_CODES.includes(suffix.toUpperCase().trim());
}

interface OcrResult {
  plate: string | null;
  confidence: number;
}

export async function detectLicensePlate(imageBase64: string): Promise<OcrResult> {
  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Google Vision API error', { status: response.status, body: errorText });
      return { plate: null, confidence: 0 };
    }

    const data = await response.json() as {
      responses: Array<{
        textAnnotations?: Array<{
          description: string;
        }>;
      }>;
    };

    const annotations = data.responses?.[0]?.textAnnotations;
    if (!annotations || annotations.length === 0) {
      return { plate: null, confidence: 0 };
    }

    const fullText = annotations[0].description;
    const candidateRegex = /[A-Z0-9]{3}[\s-]?[A-Z0-9]{3}[\s-]?[A-Z0-9]{2}/gi;
    const matches = fullText.match(candidateRegex);

    if (matches && matches.length > 0) {
      for (const matchText of matches) {
        const normalized = normalizePlate(matchText);
        if (PLATE_REGEX.test(normalized)) {
          const parts = normalized.split(/\s+/);
          const suffix = parts.length === 3 ? parts[2] : normalized.slice(-2);
          if (validateStateCode(suffix)) {
            logger.info('Google Vision OCR candidate accepted', {
              raw: matchText,
              normalized,
              suffix,
            });
            return { plate: normalized, confidence: 0.9 };
          }
        }
      }
    }

    return { plate: null, confidence: 0 };
  } catch (err) {
    logger.error('OCR detection failed', { error: err });
    return { plate: null, confidence: 0 };
  }
}

