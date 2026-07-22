import {
  correctOcrErrors,
  normalizePlate,
  validateStateCode,
  PLATE_REGEX,
} from './ocr.service';

describe('backend ocr.service', () => {
  it('corrects OCR errors in license plate', () => {
    expect(correctOcrErrors('PH08O4RV')).toBe('PHO804RV');
    expect(correctOcrErrors('1ND58ZFK')).toBe('IND582FK');
  });

  it('normalizes license plate to standard space-separated format', () => {
    expect(normalizePlate('PHC804RV')).toBe('PHC 804 RV');
    expect(normalizePlate('phc-804-rv')).toBe('PHC 804 RV');
    expect(normalizePlate('LND582FK')).toBe('LND 582 FK');
  });

  it('validates state codes', () => {
    expect(validateStateCode('LA')).toBe(true);
    expect(validateStateCode('RI')).toBe(true);
    expect(validateStateCode('FC')).toBe(true);
    expect(validateStateCode('ZZ')).toBe(false);
  });

  it('validates plate regex pattern', () => {
    expect(PLATE_REGEX.test('PHC 804 RV')).toBe(true);
    expect(PLATE_REGEX.test('LND-582-FK')).toBe(true);
    expect(PLATE_REGEX.test('INVALID')).toBe(false);
  });
});
