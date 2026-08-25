// Deterministic Canvas Pre-processing Pipeline for OCR
// Uses lossless PNG output and high-contrast Otsu binarization to eliminate OCR variance across passes.

export function preprocessImageForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Failed to get 2d canvas context'));
          return;
        }

        // Downscale to deterministic max 1600px width/height
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Extract pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const totalPixels = width * height;

        // Step 1: Grayscale conversion + Histogram calculation
        const histogram = new Array(256).fill(0);
        const grayValues = new Uint8Array(totalPixels);

        for (let i = 0; i < totalPixels; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          // Standard luminance formula
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          grayValues[i] = gray;
          histogram[gray]++;
        }

        // Step 2: Otsu's Binarization Threshold Calculation
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += i * histogram[i];

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let varMax = 0;
        let threshold = 128; // fallback threshold

        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;
          wF = totalPixels - wB;
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

        // Step 3: Apply deterministic binarization (Black text on white background)
        for (let i = 0; i < totalPixels; i++) {
          const bw = grayValues[i] < threshold ? 0 : 255;
          const idx = i * 4;
          data[idx] = bw;
          data[idx + 1] = bw;
          data[idx + 2] = bw;
        }

        ctx.putImageData(imageData, 0, 0);

        // Lossless PNG data URL ensures 100% bit-for-bit deterministic OCR input
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
