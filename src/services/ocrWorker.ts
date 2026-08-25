import { createWorker, PSM } from 'tesseract.js';
import { OCRResult } from '../types';

export async function processReceiptOCR(
  imageDataUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<OCRResult> {
  const worker = await createWorker('eng');

  try {
    // Lock Page Segmentation Mode (PSM) to AUTO or SINGLE_BLOCK to ensure 100% deterministic layout parsing
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });

    const ret = await worker.recognize(imageDataUrl);
    const rawText = ret.data.text;
    const confidence = ret.data.confidence;

    await worker.terminate();

    return parseReceiptHeuristics(rawText, confidence);
  } catch (error) {
    await worker.terminate();
    throw error;
  }
}

export function parseReceiptHeuristics(rawText: string, confidence: number): OCRResult {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let merchant: string | undefined;
  let amount: number | undefined;
  let date: string | undefined;

  // 1. Merchant Extraction: Pick top-most clean non-keyword header line
  for (const line of lines) {
    const cleanLine = line.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (
      cleanLine.length >= 3 &&
      !/receipt|invoice|tax|bill|date|total|amount|welcome|thank|phone|tel|gstin|store|copy|customer/i.test(cleanLine) &&
      /[a-zA-Z]{2,}/.test(cleanLine)
    ) {
      merchant = cleanLine;
      break;
    }
  }

  // 2. Amount Extraction:
  // Look for keywords like "Grand Total", "Total Amount", "Total", "Net Amount", "Amount Paid", "Payable", "₹", "Rs"
  const amountPatterns = [
    /(?:grand\s*total|total\s*amount|net\s*amount|amount\s*paid|payable)[\s:\-=₹RsINR]*([0-9,]+\.?[0-9]{0,2})/i,
    /(?:total)[\s:\-=₹RsINR]*([0-9,]+\.?[0-9]{0,2})/i,
    /(?:₹|Rs\.?|INR)\s*([0-9,]+\.?[0-9]{0,2})/i,
  ];

  for (const pattern of amountPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      // Filter out obvious year numbers (e.g. 2024, 2025, 2026)
      if (!isNaN(parsed) && parsed > 0 && !(parsed >= 2020 && parsed <= 2035 && Number.isInteger(parsed))) {
        amount = parsed;
        break;
      }
    }
  }

  // Fallback Amount Extraction: Highest numeric value with decimal places
  if (!amount) {
    const numberMatches = rawText.match(/\b\d+[\.,]\d{2}\b/g);
    if (numberMatches) {
      const numbers = numberMatches
        .map(n => parseFloat(n.replace(/,/g, '')))
        .filter(n => !isNaN(n) && !(n >= 2020 && n <= 2035 && Number.isInteger(n)));
      if (numbers.length > 0) {
        amount = Math.max(...numbers);
      }
    }
  }

  // 3. Date Extraction:
  const dateRegexes = [
    /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/, // YYYY-MM-DD
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/, // DD/MM/YYYY
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i // 15 Mar 2026
  ];

  for (const regex of dateRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const rawDateStr = match[1];
      try {
        const parsedDate = new Date(rawDateStr);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
          break;
        }
      } catch (e) {
        // ignore date parse error
      }
    }
  }

  // Default to today if date not parsed
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  return {
    merchant: merchant || 'Scanned Merchant',
    amount: amount || 0,
    date,
    rawText,
    confidence
  };
}
