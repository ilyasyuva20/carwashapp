import { createWorker } from 'tesseract.js';

const INDIAN_STATES = [
  'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HR',
  'HP', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ',
  'NL', 'OD', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK', 'UA', 'UP', 'WB'
];

const PLATE_REGEX_STRICT = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
const PLATE_REGEX_SEARCH = /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2}/;

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
      if (stateFixed.startsWith('K')) stateFixed = 'KA'; // Common for KA self-drive / KL plates
      else if (stateFixed.startsWith('M')) stateFixed = 'MH';
      else if (stateFixed.startsWith('D')) stateFixed = 'DL';
      else if (stateFixed.startsWith('T')) stateFixed = 'TN';
      else if (stateFixed.startsWith('G')) stateFixed = 'GJ';
      else if (stateFixed.startsWith('H')) stateFixed = 'HR';
      else if (stateFixed.startsWith('U')) stateFixed = 'UP';
    }

    const rest = clean.slice(2);
    // Last 4 characters must be digits
    let last4 = rest.slice(-4).split('').map(ch => letterToDigit[ch] || ch).join('');
    
    // Middle: district digits (1-2) + series letters (1-2)
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
 * Generates image canvas passes optimized for EV green plates, Self-drive black plates, Yellow taxis, and Sticker plates.
 */
function createOcrCandidates(img) {
  const candidates = [];

  // Helper to draw crop & process pixels
  const processCrop = (cropX, cropY, cropW, cropH, pixelFilter) => {
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

      for (let i = 0; i < d.length; i += 4) {
        const pixelVal = pixelFilter(d[i], d[i + 1], d[i + 2]);
        d[i] = pixelVal;
        d[i + 1] = pixelVal;
        d[i + 2] = pixelVal;
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (e) {
      return null;
    }
  };

  // 1. Filter: EV Green Plate (Green bg -> White canvas, Embossed characters + INDIA watermark -> Solid Black characters)
  const evFilter = (r, g, b) => {
    const isGreenBg = (g > 65) && (g - r > 18) && (g - b > 12);
    return isGreenBg ? 255 : 0;
  };

  // 2. Filter: Self-Drive Commercial Rental (Yellow text on Black plate background)
  const selfDriveFilter = (r, g, b) => {
    const isYellowText = (r > 120) && (g > 100) && (r - b > 30) && (g - b > 20);
    return isYellowText ? 0 : 255;
  };

  // 3. Filter: Commercial Taxi (Yellow background, Black text)
  const taxiFilter = (r, g, b) => {
    const isYellowBg = (r > 130) && (g > 110) && (r - b > 30) && (g - b > 20);
    const isDarkText = (r < 100) && (g < 100) && (b < 100);
    if (isDarkText) return 0;
    if (isYellowBg) return 255;
    return 255;
  };

  // 4. Filter: Weathered / Custom Sticker Plate (Adaptive Luminance)
  const stickerFilter = (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 80 ? 0 : 255;
  };

  // 5. Filter: Standard Contrast Boost
  const contrastFilter = (r, g, b) => {
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = (gray - 128) * 1.6 + 128;
    return Math.max(0, Math.min(255, gray));
  };

  // Spatial Crops:
  // Tight/Mid Crop (Good for Ather EV plates & close-ups): x:0.02, y:0.10, w:0.96, h:0.85
  // Bumper Center Crop (Good for Mercedes full car photo): x:0.15, y:0.45, w:0.70, h:0.50

  // Pass 1: EV Green Plate (Tight Crop)
  candidates.push({ name: 'EV-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, evFilter) });
  // Pass 2: EV Green Plate (Bumper Center Crop)
  candidates.push({ name: 'EV-Bumper', data: processCrop(0.15, 0.40, 0.70, 0.55, evFilter) });

  // Pass 3: Self-Drive Rental (Bumper Center Crop)
  candidates.push({ name: 'SelfDrive-Bumper', data: processCrop(0.15, 0.45, 0.70, 0.50, selfDriveFilter) });
  // Pass 4: Self-Drive Rental (Tight Crop)
  candidates.push({ name: 'SelfDrive-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, selfDriveFilter) });

  // Pass 5: Commercial Taxi (Bumper Center Crop)
  candidates.push({ name: 'Taxi-Bumper', data: processCrop(0.15, 0.40, 0.70, 0.55, taxiFilter) });
  // Pass 6: Commercial Taxi (Tight Crop)
  candidates.push({ name: 'Taxi-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, taxiFilter) });

  // Pass 7: Weathered Sticker Plate (Tight Crop)
  candidates.push({ name: 'Sticker-Tight', data: processCrop(0.02, 0.05, 0.96, 0.90, stickerFilter) });

  // Pass 8: Standard Contrast (Bumper Center Crop)
  candidates.push({ name: 'Standard-Bumper', data: processCrop(0.15, 0.35, 0.70, 0.60, contrastFilter) });
  // Pass 9: Standard Contrast (Full Photo)
  candidates.push({ name: 'Standard-Full', data: processCrop(0, 0, 1.0, 1.0, contrastFilter) });

  return candidates.filter(c => c.data !== null);
}

function parsePlateFromTesseractData(data) {
  const lines = (data?.lines || [])
    .map(l => (l.text || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);

  const fullClean = (data?.text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 1. Direct Regex Match on full clean text
  let m = fullClean.match(PLATE_REGEX_SEARCH);
  if (m) return m[0];

  // 2. Individual Line Match
  for (const line of lines) {
    let lm = line.match(PLATE_REGEX_SEARCH);
    if (lm) return lm[0];
  }

  // 3. Consecutive Line Combination (Two-line scooter plates like Ather Rear KL43 \n S9064)
  for (let i = 0; i < lines.length - 1; i++) {
    const combined = lines[i] + lines[i + 1];
    let cm = combined.match(PLATE_REGEX_SEARCH);
    if (cm) return cm[0];

    if (i < lines.length - 2) {
      const combined3 = lines[i] + lines[i + 1] + lines[i + 2];
      let cm3 = combined3.match(PLATE_REGEX_SEARCH);
      if (cm3) return cm3[0];
    }
  }

  // 4. Try Position Repair on 8-11 character chunks
  const chunks = fullClean.match(/[A-Z0-9]{8,11}/g) || [];
  for (const chunk of chunks) {
    const repaired = repairPlateString(chunk);
    if (PLATE_REGEX_STRICT.test(repaired)) {
      return repaired;
    }
  }

  return '';
}

/**
 * Extracts Indian vehicle registration number from an image file using in-browser Tesseract.js.
 */
export async function recognizePlateNumber(imageSource) {
  let worker = null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      if (typeof imageSource === 'string') img.src = imageSource;
      else if (imageSource instanceof File || imageSource instanceof Blob) img.src = URL.createObjectURL(imageSource);
      else res();
    });

    const candidates = createOcrCandidates(img);

    worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
    });

    for (const candidate of candidates) {
      const result = await worker.recognize(candidate.data);
      const plate = parsePlateFromTesseractData(result.data);
      if (plate) {
        console.log(`[OCR SUCCESS] Matched plate '${plate}' on pass: ${candidate.name}`);
        await worker.terminate();
        return plate;
      }
    }

    await worker.terminate();
    throw new Error('Plate number could not be read clearly. Please type registration manually.');
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (e) { /* ignore */ }
    }
    console.error('OCR Processing Error:', err);
    throw err;
  }
}
