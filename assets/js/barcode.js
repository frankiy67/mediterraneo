/**
 * Décodeur EAN-13, UPC-A et EAN-8, écrit à la main.
 *
 * Les navigateurs qui exposent `BarcodeDetector` (Chrome, Android) font le
 * travail nativement ; Safari ne l'expose pas. Plutôt que d'embarquer une
 * bibliothèque de plusieurs centaines de kilo-octets pour ces navigateurs-là,
 * on lit les barres soi-même : une ligne de pixels, des largeurs de barres,
 * une comparaison aux dix motifs de chiffres, une somme de contrôle.
 */

/* Largeurs des quatre barres/espaces de chaque chiffre, code de gauche. */
const L_PATTERNS = [
  [3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2],
  [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2]
];
/* Code G : le code L lu à l'envers. Les deux ensemble servent la moitié gauche. */
const LG_PATTERNS = [...L_PATTERNS, ...L_PATTERNS.map(p => [...p].reverse())];

/* Parités de la moitié gauche qui encodent le premier chiffre d'un EAN-13. */
const FIRST_DIGIT = [0x00, 0x0B, 0x0D, 0x0E, 0x13, 0x19, 0x1C, 0x15, 0x16, 0x1A];

const START_END = [1, 1, 1];
const MIDDLE = [1, 1, 1, 1, 1];

const MAX_INDIVIDUAL_VARIANCE = 0.7;
const MAX_AVG_VARIANCE = 0.48;

/** Écart entre des largeurs mesurées et un motif théorique. Infini si hors tolérance. */
function variance(counters, pattern) {
  let total = 0, patternTotal = 0;
  for (let i = 0; i < counters.length; i++) {
    total += counters[i];
    patternTotal += pattern[i];
  }
  if (total < patternTotal) return Infinity;
  const unit = total / patternTotal;
  const maxIndividual = MAX_INDIVIDUAL_VARIANCE * unit;
  let sum = 0;
  for (let i = 0; i < counters.length; i++) {
    const gap = Math.abs(counters[i] - pattern[i] * unit);
    if (gap > maxIndividual) return Infinity;
    sum += gap;
  }
  return sum / total;
}

/** Mesure `counters.length` alternances consécutives à partir de `start`. */
function recordPattern(bits, start, counters) {
  counters.fill(0);
  let index = 0;
  let colour = bits[start];
  for (let i = start; i < bits.length; i++) {
    if (bits[i] === colour) {
      counters[index]++;
    } else {
      if (++index === counters.length) return true;
      counters[index] = 1;
      colour = bits[i];
    }
  }
  return index === counters.length - 1 && counters[index] > 0;
}

/** Cherche un motif de garde à partir de `from`. Renvoie [début, fin] ou null. */
function findGuard(bits, from, whiteFirst, pattern) {
  const counters = new Array(pattern.length).fill(0);
  let index = 0;
  let colour = whiteFirst ? 0 : 1;
  let i = from;

  while (i < bits.length && bits[i] !== colour) i++;
  let start = i;

  for (; i < bits.length; i++) {
    if (bits[i] === colour) {
      counters[index]++;
      continue;
    }
    if (index === pattern.length - 1) {
      if (variance(counters, pattern) < MAX_AVG_VARIANCE) return [start, i];
      start += counters[0] + counters[1];
      counters.copyWithin(0, 2);
      counters[pattern.length - 2] = 0;
      counters[pattern.length - 1] = 0;
      index--;
    } else {
      index++;
    }
    counters[index] = 1;
    colour = colour === 0 ? 1 : 0;
  }
  return null;
}

/** Décode un chiffre. Renvoie l'index du meilleur motif, ou -1. */
function decodeDigit(bits, offset, patterns, counters) {
  if (!recordPattern(bits, offset, counters)) return -1;
  let best = -1;
  let bestVariance = MAX_AVG_VARIANCE;
  for (let i = 0; i < patterns.length; i++) {
    const v = variance(counters, patterns[i]);
    if (v < bestVariance) { bestVariance = v; best = i; }
  }
  return best;
}

const sum = counters => counters.reduce((t, c) => t + c, 0);

/** Somme de contrôle EAN/UPC : poids 3 et 1 en alternance depuis la droite. */
export function checksumOk(digits) {
  let total = 0;
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) {
    total += digits[i] * weight;
  }
  return (10 - (total % 10)) % 10 === digits.at(-1);
}

/** Décode un EAN-13 ou un UPC-A à partir de la fin de la garde de départ. */
function decodeEAN13(bits, guardEnd) {
  const counters = [0, 0, 0, 0];
  const digits = [0];
  let offset = guardEnd;
  let parities = 0;

  for (let x = 0; x < 6; x++) {
    const match = decodeDigit(bits, offset, LG_PATTERNS, counters);
    if (match < 0) return null;
    digits.push(match % 10);
    if (match >= 10) parities |= 1 << (5 - x);
    offset += sum(counters);
  }

  const first = FIRST_DIGIT.indexOf(parities);
  if (first < 0) return null;
  digits[0] = first;

  const middle = findGuard(bits, offset, true, MIDDLE);
  if (!middle || middle[0] !== offset) return null;
  offset = middle[1];

  for (let x = 0; x < 6; x++) {
    const match = decodeDigit(bits, offset, L_PATTERNS, counters);
    if (match < 0) return null;
    digits.push(match);
    offset += sum(counters);
  }

  return checksumOk(digits) ? digits.join('') : null;
}

/** Décode un EAN-8 : quatre chiffres, garde centrale, quatre chiffres. */
function decodeEAN8(bits, guardEnd) {
  const counters = [0, 0, 0, 0];
  const digits = [];
  let offset = guardEnd;

  for (let x = 0; x < 4; x++) {
    const match = decodeDigit(bits, offset, L_PATTERNS, counters);
    if (match < 0) return null;
    digits.push(match);
    offset += sum(counters);
  }

  const middle = findGuard(bits, offset, true, MIDDLE);
  if (!middle || middle[0] !== offset) return null;
  offset = middle[1];

  for (let x = 0; x < 4; x++) {
    const match = decodeDigit(bits, offset, L_PATTERNS, counters);
    if (match < 0) return null;
    digits.push(match);
    offset += sum(counters);
  }

  return checksumOk(digits) ? digits.join('') : null;
}

/**
 * Décode une ligne de pixels binarisée (1 = barre sombre, 0 = clair).
 * @returns {string|null} le code lu, ou null.
 */
export function decodeRow(bits) {
  let from = 0;
  while (from < bits.length - 20) {
    const guard = findGuard(bits, from, false, START_END);
    if (!guard) return null;
    const [start, end] = guard;

    // Zone de silence : autant de blanc avant la garde que la garde est large.
    const width = end - start;
    let quiet = 0;
    for (let i = start - 1; i >= 0 && quiet < width && bits[i] === 0; i--) quiet++;

    if (quiet >= width) {
      const code = decodeEAN13(bits, end) || decodeEAN8(bits, end);
      if (code) return code;
    }
    from = end;
  }
  return null;
}

/**
 * Binarise une ligne de luminance puis tente le décodage.
 * Seuil au milieu de la dynamique locale ; une ligne sans contraste est ignorée.
 */
export function decodeLuminanceRow(luma) {
  let min = 255, max = 0;
  for (const v of luma) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max - min < 40) return null;
  const threshold = (min + max) / 2;
  const bits = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i++) bits[i] = luma[i] < threshold ? 1 : 0;
  return decodeRow(bits);
}

/**
 * Parcourt une image en niveaux de gris : plusieurs lignes horizontales puis,
 * si rien n'est trouvé, plusieurs colonnes — un code-barres tenu de travers
 * reste lisible dans l'autre sens.
 */
export function decodeGrayscale(gray, width, height, lines = 14) {
  for (let i = 1; i <= lines; i++) {
    const y = Math.round((height * i) / (lines + 1));
    const row = gray.subarray(y * width, y * width + width);
    const code = decodeLuminanceRow(row);
    if (code) return code;
  }
  const column = new Uint8ClampedArray(height);
  for (let i = 1; i <= lines; i++) {
    const x = Math.round((width * i) / (lines + 1));
    for (let y = 0; y < height; y++) column[y] = gray[y * width + x];
    const code = decodeLuminanceRow(column);
    if (code) return code;
  }
  return null;
}
