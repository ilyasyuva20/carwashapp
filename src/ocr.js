import { createWorker } from 'tesseract.js';

const INDIAN_STATES = [
  'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HR',
  'HP', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ',
  'NL', 'OD', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UA', 'UP', 'WB'
];

const PLATE_REGEX = /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2}/;

/**
 * Resizes photo via Canvas if it exceeds max dimension (for fast OCR processing)
 * without performing any destructive cropping.
 */
async function prepareImageForOcr(imageSource) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width <= maxDim && height <= maxDim) {
          resolve(imageSource);
          return;
        }

        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        resolve(imageSource);
      }
    };
    img.onerror = () => resolve(imageSource);

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else if (imageSource instanceof File || imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    } else {
      resolve(imageSource);
    }
  });
}

/**
 * Parses raw Tesseract OCR output lines to extract valid Indian registration numbers.
 * Handles both Single-Line (Cars) and Two-Line (Scooters/Bikes) layouts.
 */
function extractPlateFromOcrResult(data) {
  const lines = (data?.lines || [])
    .map(l => (l.text || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);

  const fullText = (data?.text || '').toUpperCase();
  const fullClean = fullText.replace(/[^A-Z0-9]/g, '');

  // 1. Direct match on full cleaned text
  const fullMatch = fullClean.match(PLATE_REGEX);
  if (fullMatch) {
    return fullMatch[0];
  }

  // 2. Check each line individually
  for (const line of lines) {
    const m = line.match(PLATE_REGEX);
    if (m) return m[0];
  }

  // 3. Check combinations of consecutive lines (crucial for two-line bike/scooter plates like KL 43 \n S 9064)
  for (let i = 0; i < lines.length - 1; i++) {
    const combined = lines[i] + lines[i + 1];
    const m = combined.match(PLATE_REGEX);
    if (m) return m[0];

    if (i < lines.length - 2) {
      const combined3 = lines[i] + lines[i + 1] + lines[i + 2];
      const m3 = combined3.match(PLATE_REGEX);
      if (m3) return m3[0];
    }
  }

  // 4. Look for state code line (e.g. KL 43) + series/digits line (e.g. S 9064)
  const stateRegex = new RegExp(`^(${INDIAN_STATES.join('|')})([0-9]{1,2})`);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stateMatch = line.match(stateRegex);
    if (stateMatch) {
      const stateDist = stateMatch[0]; // e.g. KL43
      // Search remaining lines for series + 4 digits
      for (let j = i + 1; j < lines.length; j++) {
        const restLine = lines[j];
        const restMatch = restLine.match(/([A-Z]{1,3})([0-9]{4})/);
        if (restMatch) {
          const candidate = stateDist + restMatch[1] + restMatch[2]; // e.g. KL43 + S + 9064
          if (PLATE_REGEX.test(candidate)) {
            return candidate;
          }
        }
      }
    }
  }

  // Do not return partial or random noise if no valid plate format is found
  return '';
}

/**
 * Extracts Indian vehicle registration number from an image file using in-browser Tesseract.js.
 */
export async function recognizePlateNumber(imageSource) {
  let worker = null;
  try {
    const preparedSource = await prepareImageForOcr(imageSource);

    worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
    });

    const result = await worker.recognize(preparedSource);
    await worker.terminate();

    const plate = extractPlateFromOcrResult(result.data);
    if (plate) {
      return plate;
    }

    throw new Error('Could not read plate number. Please type registration manually.');
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (e) { /* ignore */ }
    }
    console.error('OCR Processing Error:', err);
    throw err;
  }
}
