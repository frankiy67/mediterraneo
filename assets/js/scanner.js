/**
 * Caméra et lecture de code-barres.
 * `BarcodeDetector` quand le navigateur le propose, notre décodeur sinon.
 */
import { decodeGrayscale } from './barcode.js';

const INTERVAL = 140;   // ms entre deux analyses
const WIDTH = 640;      // largeur d'analyse ; au-delà on paie sans mieux lire

export const hasCamera = () =>
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

async function nativeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => formats.includes(f));
    return wanted.length ? new window.BarcodeDetector({ formats: wanted }) : null;
  } catch { return null; }
}

/**
 * Démarre la caméra arrière et surveille l'image.
 * @param {HTMLVideoElement} video
 * @param {(code:string)=>void} onCode  appelé une seule fois, à la première lecture
 * @returns {Promise<() => void>} fonction d'arrêt
 */
export async function startScanner(video, onCode) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });

  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play().catch(() => { /* l'autoplay peut être refusé : la vue le signale */ });

  const detector = await nativeDetector();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let stopped = false;
  let timer = 0;

  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    stream.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }

  function found(code) {
    if (stopped) return;
    stop();
    navigator.vibrate?.(60);
    onCode(code);
  }

  async function tick() {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth) {
      try {
        if (detector) {
          const hits = await detector.detect(video);
          if (hits.length && hits[0].rawValue) return found(hits[0].rawValue);
        } else {
          const scale = Math.min(1, WIDTH / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const gray = new Uint8ClampedArray(canvas.width * canvas.height);
          for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
            gray[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
          }
          const code = decodeGrayscale(gray, canvas.width, canvas.height);
          if (code) return found(code);
        }
      } catch { /* une image ratée n'arrête pas la boucle */ }
    }
    timer = setTimeout(tick, INTERVAL);
  }

  tick();
  return stop;
}
