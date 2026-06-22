import { env } from '../utils/config';
import { logger } from './audit.service';

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
    const plateRegex = /[A-Z]{1,3}[- ]?\d{3,4}[- ]?[A-Z]{1,2}/i;
    const match = fullText.match(plateRegex);

    if (match) {
      return { plate: match[0].replace(/\s+/g, '').toUpperCase(), confidence: 0.9 };
    }

    return { plate: null, confidence: 0 };
  } catch (err) {
    logger.error('OCR detection failed', { error: err });
    return { plate: null, confidence: 0 };
  }
}
