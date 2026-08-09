import { createWorker } from 'tesseract.js';

/**
 * Extracts Indian vehicle registration number from an image file using in-browser Tesseract.js.
 * Matches standard Indian registration formats: e.g. KL07CD1234, MH12AB1234, DL1CA9999.
 */
export async function recognizePlateNumber(imageSource) {
  let worker = null;
  try {
    worker = await createWorker('eng');
    
    // Set parameters to focus on uppercase letters, numbers, hyphens and spaces
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
    });

    const result = await worker.recognize(imageSource);
    const rawText = result.data?.text || '';
    
    await worker.terminate();

    // Remove unwanted non-alphanumeric chars
    const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Standard Indian + BH Series registration pattern:
    // Standard: State (2 chars), District (1-2 digits), Series (1-3 chars), Reg (4 digits)
    // BH Series: Year (2 digits), BH, Reg (4 digits), Series (1-2 chars)
    const indianPlateRegex = /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2}/;
    const match = cleaned.match(indianPlateRegex);
    
    if (match) {
      return match[0];
    }

    // Fallback pattern if series is missing or unusual
    const fallbackRegex = /[A-Z]{2}[0-9]{1,2}[0-9A-Z]{1,3}[0-9]{1,4}/;
    const fallbackMatch = cleaned.match(fallbackRegex);
    if (fallbackMatch) {
      return fallbackMatch[0];
    }

    return cleaned.slice(0, 10);
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (e) { /* ignore */ }
    }
    console.error('OCR Error:', err);
    throw new Error('Failed to read plate from photo. Please enter number manually.');
  }
}
