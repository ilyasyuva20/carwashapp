import { createWorker } from 'tesseract.js';
import { api } from './api';

const INDIAN_STATES = [
  'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HR',
  'HP', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ',
  'NL', 'OD', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UA', 'UP', 'WB'
];

const PLATE_REGEX_STRICT = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
const PLATE_REGEX_SEARCH = /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2}/;
const PARTIAL_FOUR_DIGIT_REGEX = /[0-9]{4}/;

/**
 * Position-based character repair for Indian License Plates:
 * State(2 letters) + District(1-2 digits) + Series(1-3 letters) + Reg(4 digits)
 */
function repairPlateString(str) {
  if (!str) return '';
  const clean = str.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (PLATE_REGEX_STRICT.test(clean)) return clean;

  const letterToDigit = { 'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6', 'T': '7', 'B': '8', 'N': '9' };
  const digitToLetter = { '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'N' };

  if (clean.length >= 8 && clean.length <= 11) {
    let state = clean.slice(0, 2);
    let stateFixed = state.split('').map(ch => digitToLetter[ch] || ch).join('');
    if (stateFixed === 'KE' || stateFixed === 'KI' || stateFixed === 'K1') stateFixed = 'KL';
    else if (!INDIAN_STATES.includes(stateFixed)) {
      if (stateFixed.startsWith('K')) stateFixed = 'KL';
      else if (stateFixed.startsWith('M')) stateFixed = 'MH';
      else if (stateFixed.startsWith('D')) stateFixed = 'DL';
      else if (stateFixed.startsWith('T')) stateFixed = 'TN';
      else if (stateFixed.startsWith('G')) stateFixed = 'GJ';
      else if (stateFixed.startsWith('H')) stateFixed = 'HR';
      else if (stateFixed.startsWith('U')) stateFixed = 'UP';
    }

    const rest = clean.slice(2);
    let last4 = rest.slice(-4).split('').map(ch => letterToDigit[ch] || ch).join('');
    
    let middle = rest.slice(0, -4);
    let dist = '';
    let series = '';

    for (let i = 0; i < middle.length; i++) {
      const ch = middle[i];
      if (i < 2 && /[0-9SZEAOGTB]/.test(ch)) {
        dist += letterToDigit[ch] || ch;
      } else {
        series += digitToLetter[ch] || ch;
      }
    }

    const candidate = `${stateFixed}${dist}${series}${last4}`;
    if (PLATE_REGEX_STRICT.test(candidate)) {
      return candidate;
    }
  }

  return clean;
}

/**
 * Calculates optimal threshold automatically using Otsu's Binarization algorithm.
 */
function applyOtsuBinarization(imgData, invert = false) {
  const d = imgData.data;
  const histogram = new Array(256).fill(0);
  const total = d.length / 4;

  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    histogram[gray]++;
  }

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);

    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let val = gray < threshold ? 0 : 255;
    if (invert) val = 255 - val;

    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }
}

/**
 * Multi-pass candidate generator with Otsu Binarization & Color Channel Filters.
 */
function createOcrCandidates(img) {
  const candidates = [];

  const processCrop = (cropX, cropY, cropW, cropH, filterType) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcX = Math.round(img.width * cropX);
      const srcY = Math.round(img.height * cropY);
      const srcW = Math.round(img.width * cropW);
      const srcH = Math.round(img.height * cropH);

      const targetW = Math.min(1200, srcW);
      const targetH = Math.round((srcH * targetW) / srcW);

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      if (filterType === 'otsu') {
        applyOtsuBinarization(imgData, false);
      } else if (filterType === 'otsu-invert') {
        applyOtsuBinarization(imgData, true);
      } else if (filterType === 'ev') {
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const isGreen = (g > 60) && (g - r > 15) && (g - b > 10);
          const val = isGreen ? 255 : 0;
          d[i] = val; d[i + 1] = val; d[i + 2] = val;
        }
      } else if (filterType === 'selfdrive') {
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const isYellow = (r > 115) && (g > 95) && (r - b > 25) && (g - b > 15);
          const val = isYellow ? 0 : 255;
          d[i] = val; d[i + 1] = val; d[i + 2] = val;
        }
      } else if (filterType === 'taxi') {
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const isYellowBg = (r > 130) && (g > 110) && (r - b > 30) && (g - b > 20);
          const isDarkText = (r < 100) && (g < 100) && (b < 100);
          const val = isDarkText ? 0 : (isYellowBg ? 255 : 255);
          d[i] = val; d[i + 1] = val; d[i + 2] = val;
        }
      } else if (filterType === 'contrast') {
        for (let i = 0; i < d.length; i += 4) {
          let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          gray = (gray - 128) * 1.6 + 128;
          gray = Math.max(0, Math.min(255, gray));
          d[i] = gray; d[i + 1] = gray; d[i + 2] = gray;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (e) {
      return null;
    }
  };

  // Passes
  candidates.push({ name: 'Otsu-Bumper', data: processCrop(0.15, 0.35, 0.70, 0.60, 'otsu') });
  candidates.push({ name: 'Otsu-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, 'otsu') });
  candidates.push({ name: 'EV-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, 'ev') });
  candidates.push({ name: 'EV-Bumper', data: processCrop(0.15, 0.35, 0.70, 0.60, 'ev') });
  candidates.push({ name: 'SelfDrive-Bumper', data: processCrop(0.15, 0.35, 0.70, 0.60, 'selfdrive') });
  candidates.push({ name: 'SelfDrive-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, 'selfdrive') });
  candidates.push({ name: 'Taxi-Bumper', data: processCrop(0.15, 0.35, 0.70, 0.60, 'taxi') });
  candidates.push({ name: 'Taxi-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, 'taxi') });
  candidates.push({ name: 'Otsu-Invert-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, 'otsu-invert') });
  candidates.push({ name: 'Contrast-Bumper', data: processCrop(0.15, 0.35, 0.70, 0.60, 'contrast') });
  candidates.push({ name: 'Contrast-Full', data: processCrop(0, 0, 1.0, 1.0, 'contrast') });

  return candidates.filter(c => c.data !== null);
}

function parsePlateFromTesseractData(data) {
  const lines = (data?.lines || [])
    .map(l => (l.text || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);

  const fullClean = (data?.text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  let m = fullClean.match(PLATE_REGEX_SEARCH);
  if (m) return { plate: m[0], isFullMatch: true };

  for (const line of lines) {
    let lm = line.match(PLATE_REGEX_SEARCH);
    if (lm) return { plate: lm[0], isFullMatch: true };
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const combined = lines[i] + lines[i + 1];
    let cm = combined.match(PLATE_REGEX_SEARCH);
    if (cm) return { plate: cm[0], isFullMatch: true };

    if (i < lines.length - 2) {
      const combined3 = lines[i] + lines[i + 1] + lines[i + 2];
      let cm3 = combined3.match(PLATE_REGEX_SEARCH);
      if (cm3) return { plate: cm3[0], isFullMatch: true };
    }
  }

  const chunks = fullClean.match(/[A-Z0-9]{8,11}/g) || [];
  for (const chunk of chunks) {
    const repaired = repairPlateString(chunk);
    if (PLATE_REGEX_STRICT.test(repaired)) {
      return { plate: repaired, isFullMatch: true };
    }
  }

  const digit4Match = fullClean.match(PARTIAL_FOUR_DIGIT_REGEX);
  if (digit4Match) {
    const partialWithState = fullClean.match(/[A-Z]{2}[0-9]{0,4}[0-9]{4}/);
    if (partialWithState) {
      return { plate: partialWithState[0], isFullMatch: false };
    }
    return { plate: digit4Match[0], isFullMatch: false };
  }

  return { plate: '', isFullMatch: false };
}

/**
 * Helper to convert Image / File / Blob into base64 URL
 */
function getImageBase64(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.90);
}

/**
 * Extracts Indian vehicle registration number from an image file using AI Vision API with fallback to Tesseract.js.
 */
export async function recognizePlateNumber(imageSource) {
  let img = null;
  let base64Image = '';

  try {
    img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      if (typeof imageSource === 'string') {
        img.src = imageSource;
        base64Image = imageSource;
      } else if (imageSource instanceof File || imageSource instanceof Blob) {
        const url = URL.createObjectURL(imageSource);
        img.src = url;
      } else {
        res();
      }
    });

    if (!base64Image && img.width > 0) {
      base64Image = getImageBase64(img);
    }

    // 1. Primary AI Vision OCR Server API Request (Engine 2 Deep Learning)
    if (base64Image) {
      try {
        console.log('[OCR] Requesting AI Vision OCR Server API...');
        const apiResult = await api.post('/ocr/scan', { image: base64Image });
        if (apiResult && apiResult.success && apiResult.plate) {
          console.log(`[AI VISION OCR SUCCESS] Matched plate '${apiResult.plate}'`);
          return apiResult.plate;
        }
      } catch (apiErr) {
        console.warn('[OCR AI API Warn] Server scan failed/offline, falling back to browser Tesseract:', apiErr.message);
      }
    }
  } catch (e) {
    console.warn('[OCR Base64 Conversion Warn]:', e);
  }

  // 2. Secondary Browser Tesseract Worker Fallback
  let worker = null;
  try {
    const candidates = createOcrCandidates(img);

    worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
    });

    let bestPartial = '';

    for (const candidate of candidates) {
      const result = await worker.recognize(candidate.data);
      const parsed = parsePlateFromTesseractData(result.data);

      if (parsed.isFullMatch && parsed.plate) {
        console.log(`[OCR SUCCESS - TESSERACT] Matched plate '${parsed.plate}' on candidate: ${candidate.name}`);
        await worker.terminate();
        return parsed.plate;
      }

      if (!bestPartial && parsed.plate) {
        bestPartial = parsed.plate;
      }
    }

    await worker.terminate();

    if (bestPartial) {
      console.log(`[OCR SUCCESS - TESSERACT 4-DIGIT] Extracted '${bestPartial}'`);
      return bestPartial;
    }

    throw new Error('Plate number could not be read clearly. Please type registration manually.');
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (e) { /* ignore */ }
    }
    console.error('OCR Processing Error:', err);
    throw err;
  }
}
