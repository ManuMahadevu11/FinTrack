import { Payslip, TaxRegimeResult, TaxCalculationSummary } from '../types';

export interface TaxInputParams {
  grossAnnualIncome: number;
  basicPayAnnual: number;
  hraReceivedAnnual: number;
  annualRentPaid: number;
  isMetro: boolean;
  section80C: number; // EPF, ELSS, PPF up to 1.5L
  section80D: number; // Health Insurance
  otherDeductions: number;
  tdsDeducted: number;
}

export function calculateNewTaxRegime(grossIncome: number, tdsDeducted: number): TaxRegimeResult {
  const stdDeduction = 75000;
  const taxableIncome = Math.max(0, grossIncome - stdDeduction);

  let slabTax = 0;

  if (taxableIncome > 1500000) {
    slabTax += (taxableIncome - 1500000) * 0.30;
    slabTax += 300000 * 0.20;
    slabTax += 200000 * 0.15;
    slabTax += 300000 * 0.10;
    slabTax += 400000 * 0.05;
  } else if (taxableIncome > 1200000) {
    slabTax += (taxableIncome - 1200000) * 0.20;
    slabTax += 200000 * 0.15;
    slabTax += 300000 * 0.10;
    slabTax += 400000 * 0.05;
  } else if (taxableIncome > 1000000) {
    slabTax += (taxableIncome - 1000000) * 0.15;
    slabTax += 300000 * 0.10;
    slabTax += 400000 * 0.05;
  } else if (taxableIncome > 700000) {
    slabTax += (taxableIncome - 700000) * 0.10;
    slabTax += 400000 * 0.05;
  } else if (taxableIncome > 300000) {
    slabTax += (taxableIncome - 300000) * 0.05;
  }

  // Section 87A Rebate: Taxable income <= 7,00,000 gets 100% rebate up to 25,000
  let rebate87A = 0;
  if (taxableIncome <= 700000) {
    rebate87A = Math.min(slabTax, 25000);
  }

  const netTaxBeforeCess = Math.max(0, slabTax - rebate87A);
  const healthAndEduCess = netTaxBeforeCess * 0.04;
  const totalTaxLiability = netTaxBeforeCess + healthAndEduCess;
  const netDiff = tdsDeducted - totalTaxLiability;

  return {
    regime: 'NEW',
    grossIncome,
    deductions: {
      standardDeduction: stdDeduction,
      section80C: 0,
      section80D: 0,
      hraExemption: 0,
      totalDeductions: stdDeduction
    },
    taxableIncome,
    slabTax,
    rebate87A,
    netTaxBeforeCess,
    healthAndEduCess,
    totalTaxLiability,
    tdsDeducted,
    netDiff
  };
}

export function calculateOldTaxRegime(params: TaxInputParams): TaxRegimeResult {
  const stdDeduction = 50000;

  // HRA Exemption calculation
  let hraExemption = 0;
  if (params.hraReceivedAnnual > 0 && params.annualRentPaid > 0) {
    const rentOverTenPercentBasic = Math.max(0, params.annualRentPaid - 0.10 * params.basicPayAnnual);
    const basicLimit = (params.isMetro ? 0.50 : 0.40) * params.basicPayAnnual;
    hraExemption = Math.min(params.hraReceivedAnnual, rentOverTenPercentBasic, basicLimit);
  }

  const capped80C = Math.min(150000, Math.max(0, params.section80C));
  const capped80D = Math.min(75000, Math.max(0, params.section80D));
  const otherDeductions = Math.max(0, params.otherDeductions);

  const totalDeductions = stdDeduction + hraExemption + capped80C + capped80D + otherDeductions;
  const taxableIncome = Math.max(0, params.grossAnnualIncome - totalDeductions);

  let slabTax = 0;
  if (taxableIncome > 1000000) {
    slabTax += (taxableIncome - 1000000) * 0.30;
    slabTax += 500000 * 0.20;
    slabTax += 250000 * 0.05;
  } else if (taxableIncome > 500000) {
    slabTax += (taxableIncome - 500000) * 0.20;
    slabTax += 250000 * 0.05;
  } else if (taxableIncome > 250000) {
    slabTax += (taxableIncome - 250000) * 0.05;
  }

  // Section 87A rebate for Old Regime: Taxable income <= 5,00,000 gets rebate up to 12,500
  let rebate87A = 0;
  if (taxableIncome <= 500000) {
    rebate87A = Math.min(slabTax, 12500);
  }

  const netTaxBeforeCess = Math.max(0, slabTax - rebate87A);
  const healthAndEduCess = netTaxBeforeCess * 0.04;
  const totalTaxLiability = netTaxBeforeCess + healthAndEduCess;
  const netDiff = params.tdsDeducted - totalTaxLiability;

  return {
    regime: 'OLD',
    grossIncome: params.grossAnnualIncome,
    deductions: {
      standardDeduction: stdDeduction,
      section80C: capped80C,
      section80D: capped80D,
      hraExemption,
      totalDeductions
    },
    taxableIncome,
    slabTax,
    rebate87A,
    netTaxBeforeCess,
    healthAndEduCess,
    totalTaxLiability,
    tdsDeducted: params.tdsDeducted,
    netDiff
  };
}

export function compareRegimes(params: TaxInputParams): TaxCalculationSummary {
  const newRegime = calculateNewTaxRegime(params.grossAnnualIncome, params.tdsDeducted);
  const oldRegime = calculateOldTaxRegime(params);

  const recommendedRegime = newRegime.totalTaxLiability <= oldRegime.totalTaxLiability ? 'NEW' : 'OLD';
  const taxSavings = Math.abs(newRegime.totalTaxLiability - oldRegime.totalTaxLiability);

  return {
    newRegime,
    oldRegime,
    recommendedRegime,
    taxSavings
  };
}

export function aggregatePayslipAnnualTotals(payslips: Payslip[]): {
  grossAnnual: number;
  basicAnnual: number;
  hraAnnual: number;
  epfAnnual: number;
  tdsAnnual: number;
} {
  return payslips.reduce(
    (acc, p) => ({
      grossAnnual: acc.grossAnnual + p.grossSalary,
      basicAnnual: acc.basicAnnual + p.basicPay,
      hraAnnual: acc.hraAnnual + p.hra,
      epfAnnual: acc.epfAnnual + p.epf,
      tdsAnnual: acc.tdsAnnual + p.tds
    }),
    { grossAnnual: 0, basicAnnual: 0, hraAnnual: 0, epfAnnual: 0, tdsAnnual: 0 }
  );
}
