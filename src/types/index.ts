export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cash' | 'Other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  merchant?: string;
  receiptAttachment?: string; // Base64 data URL
  createdAt: number;
}

export interface EncryptedPayload {
  id: string;
  iv: string; // Base64 encoded 12-byte IV
  cipherText: string; // Base64 encoded AES-GCM ciphertext
  updatedAt: number;
}

export interface Payslip {
  id: string;
  monthYear: string; // e.g., "2026-03"
  month: string; // "March"
  year: number; // 2026
  
  // Earnings
  grossSalary: number;
  basicPay: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  otherEarnings?: number;

  // Deductions
  epf: number;
  professionalTax: number;
  tds: number;
  insurance: number;
  otherDeductions?: number;

  // Calculated
  netPay: number;
  
  fileAttachment?: string; // PDF or image base64
  createdAt: number;
}

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyLimit: number;
}

export interface AuthMetadata {
  id: string;
  salt: string; // Base64 encoded 16-byte salt
  verificationPayload: string; // Encrypted known string to verify password
  iv: string; // IV for verification payload
  createdAt: number;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  transactions: EncryptedPayload[];
  payslips: EncryptedPayload[];
  budgets: EncryptedPayload[];
}

export interface OCRResult {
  merchant?: string;
  amount?: number;
  date?: string;
  rawText: string;
  confidence: number;
}

export interface TaxRegimeResult {
  regime: 'NEW' | 'OLD';
  grossIncome: number;
  deductions: {
    standardDeduction: number;
    section80C: number;
    section80D: number;
    hraExemption: number;
    totalDeductions: number;
  };
  taxableIncome: number;
  slabTax: number;
  rebate87A: number;
  netTaxBeforeCess: number;
  healthAndEduCess: number;
  totalTaxLiability: number;
  tdsDeducted: number;
  netDiff: number; // positive = refund, negative = advance tax due
}

export interface TaxCalculationSummary {
  newRegime: TaxRegimeResult;
  oldRegime: TaxRegimeResult;
  recommendedRegime: 'NEW' | 'OLD';
  taxSavings: number;
}
