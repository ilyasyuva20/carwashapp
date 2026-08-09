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
      if (stateFixed.startsWith('K')) stateFixed = 'KL';
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
 * Creates candidate image passes optimized for all Indian license plate formats:
 * Pass 1: Weathered / Sticker Plate Filter (removes rust, screws, bullet dots & underlines)
 * Pass 2: Commercial Taxi (Yellow Background, Black Text)
 * Pass 3: Electric Vehicle (Green Background, White Embossed Text)
 * Pass 4: Standard Private Vehicle Bumper Pass (White Background, Black Text)
 * Pass 5: Middle Region Pass
 * Pass 6: Full Photo Pass
 */
function createOcrCandidates(img) {
  const candidates = [];

  // Pass 1: Weathered & Sticker Font Adaptive Binarization (Removes rust, screws, green bullet dots, underlines)
  const createStickerPlateCandidate = (cropX, cropY, cropW, cropH) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcX = Math.round(img.width * cropX);
      const srcY = Math.round(img.height * cropY);
      const srcW = Math.round(img.width * cropW);
      const srcH = Math.round(img.height * cropH);

      const targetW = Math.min(1000, srcW);
      const targetH = Math.round((srcH * targetW) / srcW);

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      // Dark bold sticker letters have luminance < 75; rust/dust/screws/plate background have luminance >= 75
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        const pixelVal = luminance < 75 ? 0 : 255; // Solid black text, pure white canvas

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

  // Pass 2: Commercial Taxi Yellow Plate Channel Extractor
  const createYellowTaxiCandidate = (cropX, cropY, cropW, cropH) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcX = Math.round(img.width * cropX);
      const srcY = Math.round(img.height * cropY);
      const srcW = Math.round(img.width * cropW);
      const srcH = Math.round(img.height * cropH);

      const targetW = Math.min(1000, srcW);
      const targetH = Math.round((srcH * targetW) / srcW);

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const isYellowBg = r > 130 && g > 110 && (r - b > 35) && (g - b > 25);
        const isDarkText = r < 100 && g < 100 && b < 100;

        let pixelVal = 255;
        if (isDarkText) {
          pixelVal = 0;
        } else if (isYellowBg) {
          pixelVal = 255;
        }

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

  // Pass 3: EV Green Plate Channel Extractor
  const createEvCandidate = (cropX, cropY, cropW, cropH) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcX = Math.round(img.width * cropX);
      const srcY = Math.round(img.height * cropY);
      const srcW = Math.round(img.width * cropW);
      const srcH = Math.round(img.height * cropH);

      const targetW = Math.min(1000, srcW);
      const targetH = Math.round((srcH * targetW) / srcW);

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const isGreen = g > (r + 20) && g > 85;
        let pixelVal;

        if (isGreen) {
          pixelVal = 255;
        } else {
          const avg = (r + g + b) / 3;
          pixelVal = avg > 120 ? 0 : 255;
        }

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

  // Pass 4: Standard Contrast Pass
  const createStandardCandidate = (cropX, cropY, cropW, cropH, contrastBoost = 1.5) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcX = Math.round(img.width * cropX);
      const srcY = Math.round(img.height * cropY);
      const srcW = Math.round(img.width * cropW);
      const srcH = Math.round(img.height * cropH);

      const targetW = Math.min(1000, srcW);
      const targetH = Math.round((srcH * targetW) / srcW);

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        gray = (gray - 128) * contrastBoost + 128;
        gray = Math.max(0, Math.min(255, gray));

        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (e) {
      return null;
    }
  };

  // 1. Weathered & Sticker Plate Pass
  const stickerCand = createStickerPlateCandidate(0.02, 0.20, 0.96, 0.75);
  if (stickerCand) candidates.push(stickerCand);

  // 2. Commercial Taxi Yellow Pass
  const yellowCand = createYellowTaxiCandidate(0.02, 0.25, 0.96, 0.70);
  if (yellowCand) candidates.push(yellowCand);

  // 3. EV Green Plate Pass
  const evCand = createEvCandidate(0.02, 0.20, 0.96, 0.75);
  if (evCand) candidates.push(evCand);

  // 4. Lower Bumper Standard Pass (30% to 100% height)
  const cand1 = createStandardCandidate(0.02, 0.30, 0.96, 0.68, 1.8);
  if (cand1) candidates.push(cand1);

  // 5. Middle Region Pass (20% to 80% height)
  const cand2 = createStandardCandidate(0.05, 0.20, 0.90, 0.60, 1.5);
  if (cand2) candidates.push(cand2);

  // 6. Full Photo Pass
  const cand3 = createStandardCandidate(0, 0, 1.0, 1.0, 1.2);
  if (cand3) candidates.push(cand3);

  return candidates;
}

function parsePlateFromTesseractData(data) {
  const lines = (data?.lines || [])
    .map(l => (l.text || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);

  const fullClean = (data?.text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 1. Direct Regex Match on full clean
  let m = fullClean.match(PLATE_REGEX_SEARCH);
  if (m) return m[0];

  // 2. Individual Line Match
  for (const line of lines) {
    let lm = line.match(PLATE_REGEX_SEARCH);
    if (lm) return lm[0];
  }

  // 3. Consecutive Line Combination (Two-line scooter/bike plates like KL 32 \n H 2920)
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

    for (const candUrl of candidates) {
      const result = await worker.recognize(candUrl);
      const plate = parsePlateFromTesseractData(result.data);
      if (plate) {
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
