/**
 * Test du décodeur de code-barres.
 * On fabrique des codes EAN valides, on les transforme en lignes de pixels,
 * et on vérifie que le décodeur retrouve le code — y compris flou, de travers,
 * peu contrasté, et qu'il refuse une somme de contrôle fausse.
 *
 *   node tests/barcode.test.mjs
 */
import { decodeRow, decodeLuminanceRow, decodeGrayscale, checksumOk } from '../assets/js/barcode.js';

const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G = L.map(s => [...s].reverse().map(c => c === '1' ? '0' : '1').join(''));
const R = L.map(s => [...s].map(c => c === '1' ? '0' : '1').join(''));
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

function check13(d12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}
function check8(d7) {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(d7[i]) * (i % 2 === 0 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}

function ean13Modules(code) {
  const d = [...code].map(Number);
  const parity = PARITY[d[0]];
  let out = '101';
  for (let i = 0; i < 6; i++) out += (parity[i] === 'L' ? L : G)[d[i + 1]];
  out += '01010';
  for (let i = 7; i < 13; i++) out += R[d[i]];
  return out + '101';
}
function ean8Modules(code) {
  const d = [...code].map(Number);
  let out = '101';
  for (let i = 0; i < 4; i++) out += L[d[i]];
  out += '01010';
  for (let i = 4; i < 8; i++) out += R[d[i]];
  return out + '101';
}

function toBits(modules, scale, quiet = 12, jitter = 0) {
  const bits = [];
  for (let i = 0; i < quiet * scale; i++) bits.push(0);
  for (const m of modules) {
    const w = Math.max(1, Math.round(scale + (jitter ? (Math.random() * 2 - 1) * jitter : 0)));
    for (let i = 0; i < w; i++) bits.push(m === '1' ? 1 : 0);
  }
  for (let i = 0; i < quiet * scale; i++) bits.push(0);
  return Uint8Array.from(bits);
}

let pass = 0, fail = 0;
const report = (name, ok, extra = '') => { ok ? pass++ : fail++; if (!ok) console.log('  FAIL', name, extra); };

// 1. EAN-13 réels, plusieurs échelles
const codes13 = ['3017624010701', '5449000000996', '8410128750121', '4006381333931', '0012345678905'];
for (const base of codes13) {
  const code = base.slice(0, 12) + check13(base.slice(0, 12));
  for (const scale of [2, 3, 4, 7]) {
    const got = decodeRow(toBits(ean13Modules(code), scale));
    report(`EAN13 ${code} @${scale}`, got === code, `got=${got}`);
  }
}

// 2. EAN-8
for (const base of ['96385074', '20123456', '73513537']) {
  const code = base.slice(0, 7) + check8(base.slice(0, 7));
  for (const scale of [3, 5]) {
    const got = decodeRow(toBits(ean8Modules(code), scale));
    report(`EAN8 ${code} @${scale}`, got === code, `got=${got}`);
  }
}

// 3. Bruit de largeur (barres imprimées/floues)
let jitterOk = 0, jitterTotal = 0;
for (let t = 0; t < 60; t++) {
  const code = '301762401070' + check13('301762401070');
  const got = decodeRow(toBits(ean13Modules(code), 6, 12, 1.2));
  jitterTotal++; if (got === code) jitterOk++;
}
report(`EAN13 avec bruit (${jitterOk}/${jitterTotal})`, jitterOk / jitterTotal > 0.9);

// 4. Depuis une ligne de luminance (contraste faible)
{
  const code = '5449000000996';
  const bits = toBits(ean13Modules(code), 4);
  const luma = Uint8ClampedArray.from(bits, b => (b ? 55 : 200));
  report('luminance', decodeLuminanceRow(luma) === code, decodeLuminanceRow(luma));
  const flat = Uint8ClampedArray.from(bits, () => 128);
  report('sans contraste → null', decodeLuminanceRow(flat) === null);
}

// 5. Image entière : code posé sur quelques lignes seulement
{
  const code = '8410128750121';
  const bits = toBits(ean13Modules(code), 3);
  const width = bits.length, height = 80;
  const gray = new Uint8ClampedArray(width * height).fill(210);
  for (let y = 30; y < 60; y++) for (let x = 0; x < width; x++) gray[y * width + x] = bits[x] ? 40 : 235;
  report('image horizontale', decodeGrayscale(gray, width, height) === code);

  // même code, tourné de 90° : doit passer par le balayage en colonnes
  const rot = new Uint8ClampedArray(width * height);
  const w2 = height, h2 = width;
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) rot[y * w2 + x] = gray[x * width + y];
  report('image verticale', decodeGrayscale(rot, w2, h2) === code);
}

// 6. Rien à décoder
{
  const noise = new Uint8ClampedArray(600 * 40);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 37) % 255;
  report('bruit → null', decodeGrayscale(noise, 600, 40) === null);
  report('checksum invalide', !checksumOk([...'3017624010702'].map(Number)));
  const bad = '3017624010702';
  report('code faux non accepté', decodeRow(toBits(ean13Modules(bad), 4)) === null);
}

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
