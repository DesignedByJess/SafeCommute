"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLicensePlate = detectLicensePlate;
const config_1 = require("../utils/config");
const audit_service_1 = require("./audit.service");
async function detectLicensePlate(imageBase64) {
    try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${config_1.env.GOOGLE_VISION_API_KEY}`, {
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
        });
        if (!response.ok) {
            const errorText = await response.text();
            audit_service_1.logger.error('Google Vision API error', { status: response.status, body: errorText });
            return { plate: null, confidence: 0 };
        }
        const data = await response.json();
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
    }
    catch (err) {
        audit_service_1.logger.error('OCR detection failed', { error: err });
        return { plate: null, confidence: 0 };
    }
}
