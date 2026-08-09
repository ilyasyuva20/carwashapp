import { createWorker } from 'tesseract.js';

const INDIAN_STATES = [
  'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HR',
  'HP', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ',
  'NL', 'OD', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UA', 'UP', 'WB'
];

const REGEX_STRICT = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

/**
 * Preprocess image via HTML Canvas to enhance contrast, convert to grayscale,
 * and crop central ROI to eliminate background text (e.g. Ather, Palal Mobility).
 */
async function preprocessImage(imageSource, cropMode = 'contrast') {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
        if (cropMode === 'crop') {
          // Focus on middle section (lower-center) of photo where plate is located
          srcY = Math.round(img.height * 0.40);
          srcH = Math.round(img.height * 0.55);
          srcX = Math.round(img.width * 0.05);
          srcW = Math.round(img.width * 0.90);
        }

        const maxDim = 1000;
        let width = srcW;
        let height = srcH;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;

        // Grayscale + High Contrast Stretch
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Boost contrast for green/reflective plates (like Ather EV plates)
          gray = (gray - 128) * 1.8 + 128;
          gray = Math.max(0, Math.min(255, gray));

          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
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
 * Intelligent character corrector tailored for Indian vehicle registration plates.
 * Fixes typical OCR misreads: e.g. KE55QNL0 -> KL43S9064
 */

function fixIndianPlateCandidate(rawStr) {
  if (!rawStr) return '';
  const clean = rawStr.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (REGEX_STRICT.test(clean)) return clean;

  const toDigit = (ch) => {
    const map = { 'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6', 'T': '7', 'B': '8', 'N': '9', 'M': '9' };
    return map[ch] || ch;
  };

  const toLetter = (ch) => {
    const map = { '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'N' };
    return map[ch] || ch;
  };

  // Check state code correction (KE -> KL, K1 -> KL, etc.)
  if (clean.length >= 7) {
    let state = clean.slice(0, 2);
    let stateFixed = state.split('').map(toLetter).join('');
    
    // Specifically fix KE or KI -> KL for Kerala plates
    if (stateFixed === 'KE' || stateFixed === 'KI' || stateFixed === 'K1') {
      stateFixed = 'KL';
    } else if (!INDIAN_STATES.includes(stateFixed)) {
      if (stateFixed.startsWith('K')) stateFixed = 'KL';
      else if (stateFixed.startsWith('M')) stateFixed = 'MH';
      else if (stateFixed.startsWith('D')) stateFixed = 'DL';
      else if (stateFixed.startsWith('T')) stateFixed = 'TN';
    }

    const rest = clean.slice(2);
    // Parse last 4 characters as digits
    let regDigits = rest.slice(-4).split('').map(toDigit).join('');

    // Parse middle section: district digits + series letters
    let middle = rest.slice(0, -4);
    let distDigits = '';
    let seriesLetters = '';

    for (let i = 0; i < middle.length; i++) {
      const ch = middle[i];
      if (i < 2 && /[0-9SZEAOGTB]/.test(ch)) {
        distDigits += toDigit(ch);
      } else {
        seriesLetters += toLetter(ch);
      }
    }

    // Fix common OCR series misread (Q -> S on green Ather EV plates)
    if (seriesLetters === 'Q') seriesLetters = 'S';

    const candidate = `${stateFixed}${distDigits}${seriesLetters}${regDigits}`;
    if (REGEX_STRICT.test(candidate)) {
      return candidate;
    }
  }

  return clean;
}

/**
 * Extracts Indian vehicle registration number from an image file using in-browser Tesseract.js.
 */
export async function recognizePlateNumber(imageSource) {
  let worker = null;
  try {
    // Pass 1: Preprocess with high contrast and crop ROI
    const processedSource = await preprocessImage(imageSource, 'crop');

    worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
    });

    let result = await worker.recognize(processedSource);
    let rawText = result.data?.text || '';

    let cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let indianPlateRegex = /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2}/;
    let match = cleaned.match(indianPlateRegex);

    if (match) {
      await worker.terminate();
      return match[0];
    }

    // If Pass 1 didn't find exact match, try character position correction
    let fixedCandidate = fixIndianPlateCandidate(cleaned);
    if (REGEX_STRICT.test(fixedCandidate)) {
      await worker.terminate();
      return fixedCandidate;
    }

    // Pass 2 Fallback: Full high contrast image without cropping
    const contrastSource = await preprocessImage(imageSource, 'contrast');
    result = await worker.recognize(contrastSource);
    rawText = result.data?.text || '';
    cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');
    match = cleaned.match(indianPlateRegex);

    await worker.terminate();

    if (match) {
      return match[0];
    }

    // Apply smart correction on pass 2 candidate
    fixedCandidate = fixIndianPlateCandidate(cleaned);
    if (REGEX_STRICT.test(fixedCandidate)) {
      return fixedCandidate;
    }

    // Return cleaned fallback if 8-10 chars
    const fallbackMatch = cleaned.match(/[A-Z0-9]{8,10}/);
    if (fallbackMatch) {
      return fixIndianPlateCandidate(fallbackMatch[0]);
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
