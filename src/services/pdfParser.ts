import * as pdfjsLib from 'pdfjs-dist';
import { Payslip } from '../types';
import { processReceiptOCR } from './ocrWorker';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parsePdfPayslip(file: File): Promise<Partial<Payslip>> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += ' ' + pageText;
    }

    if (fullText.trim().length > 50) {
      return parsePayslipTextHeuristics(fullText);
    }
  } catch (err) {
    console.warn('PDF.js text extraction failed or PDF is image-only. Falling back to OCR.', err);
  }

  // Fallback to image-based rendering or error
  throw new Error('Digital PDF text extraction could not parse structured data. Please try scanned image fallback.');
}

export function parsePayslipTextHeuristics(rawText: string): Partial<Payslip> {
  const extractAmount = (keywords: string[]): number => {
    for (const kw of keywords) {
      // Regex for keyword followed by separator and amount
      const regex = new RegExp(`${kw}[\\s:\\-=₹Rs]*([0-9,]+\\.?[0-9]{0,2})`, 'i');
      const match = rawText.match(regex);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  };

  const basicPay = extractAmount(['Basic Pay', 'Basic Salary', 'Basic']);
  const hra = extractAmount(['HRA', 'House Rent Allowance']);
  const specialAllowance = extractAmount(['Special Allowance', 'Other Allowance', 'Special']);
  const bonus = extractAmount(['Bonus', 'Incentive', 'Performance Bonus']);
  const grossSalary = extractAmount(['Gross Salary', 'Gross Pay', 'Gross Earnings', 'Total Earnings']);

  const epf = extractAmount(['PF', 'EPF', 'Provident Fund', 'Employee PF']);
  const professionalTax = extractAmount(['Professional Tax', 'PT', 'P.Tax']);
  const tds = extractAmount(['TDS', 'Tax Deducted', 'Income Tax', 'IT Deduction']);
  const insurance = extractAmount(['Insurance', 'Medical Insurance', 'Group Insurance']);

  let netPay = extractAmount(['Net Pay', 'Net Salary', 'Take Home', 'Net Amount']);
  
  // Calculate total earnings if gross was 0
  const calculatedGross = basicPay + hra + specialAllowance + bonus;
  const finalGross = grossSalary > 0 ? grossSalary : calculatedGross;

  const calculatedDeductions = epf + professionalTax + tds + insurance;
  if (netPay === 0 && finalGross > 0) {
    netPay = finalGross - calculatedDeductions;
  }

  // Month & Year extraction
  const monthMatch = rawText.match(/(?:Month|Pay Period|Period|Payslip for)[\s:]*([A-Za-z]+)\s*(\d{4})/i);
  let month = 'March';
  let year = new Date().getFullYear();
  let monthYear = `${year}-03`;

  if (monthMatch && monthMatch[1] && monthMatch[2]) {
    month = monthMatch[1];
    year = parseInt(monthMatch[2]);
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    const formattedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    monthYear = `${year}-${formattedMonth}`;
  }

  return {
    monthYear,
    month,
    year,
    grossSalary: finalGross,
    basicPay,
    hra,
    specialAllowance,
    bonus,
    epf,
    professionalTax,
    tds,
    insurance,
    netPay
  };
}
