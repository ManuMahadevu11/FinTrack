import { db } from '../db';
import { encryptData, decryptData, deriveKey, generateSalt, base64ToBuffer, bufferToBase64 } from './crypto';
import { BackupPayload, Transaction, Payslip, CategoryBudget, EncryptedPayload } from '../types';
import { getAllTransactions, getAllPayslips, getAllBudgets, saveTransaction, savePayslip, saveCategoryBudget, getAuthMetadata } from '../db/repository';

export async function exportEncryptedBackup(key: CryptoKey): Promise<Blob> {
  const transactions = await db.transactions.toArray();
  const payslips = await db.payslips.toArray();
  const budgets = await db.budgets.toArray();

  const backupData: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    payslips,
    budgets
  };

  const encrypted = await encryptData(key, backupData);
  const authMeta = await getAuthMetadata();

  const finalBackupObj = {
    salt: authMeta?.salt,
    iv: encrypted.iv,
    data: encrypted.cipherText
  };

  return new Blob([JSON.stringify(finalBackupObj, null, 2)], { type: 'application/json' });
}

export async function restoreEncryptedBackup(
  backupFileText: string,
  password: string,
  mode: 'merge' | 'overwrite'
): Promise<{ success: boolean; importedTxCount: number; importedPayslipCount: number }> {
  const parsedBackup = JSON.parse(backupFileText);
  
  if (!parsedBackup.salt || !parsedBackup.iv || !parsedBackup.data) {
    throw new Error('Invalid backup file structure.');
  }

  const saltBuffer = base64ToBuffer(parsedBackup.salt);
  const saltBytes = new Uint8Array(saltBuffer);
  const derivedKey = await deriveKey(password, saltBytes);

  let decryptedPayload: BackupPayload;
  try {
    decryptedPayload = await decryptData<BackupPayload>(derivedKey, parsedBackup.data, parsedBackup.iv);
  } catch (e) {
    throw new Error('Failed to decrypt backup. Incorrect password or corrupted file.');
  }

  if (mode === 'overwrite') {
    await db.transactions.clear();
    await db.payslips.clear();
    await db.budgets.clear();
  }

  let txCount = 0;
  let payslipCount = 0;

  if (decryptedPayload.transactions) {
    for (const record of decryptedPayload.transactions) {
      try {
        const tx = await decryptData<Transaction>(derivedKey, record.cipherText, record.iv);
        await saveTransaction(derivedKey, tx);
        txCount++;
      } catch (e) {
        console.error('Failed to import transaction record:', e);
      }
    }
  }

  if (decryptedPayload.payslips) {
    for (const record of decryptedPayload.payslips) {
      try {
        const payslip = await decryptData<Payslip>(derivedKey, record.cipherText, record.iv);
        await savePayslip(derivedKey, payslip);
        payslipCount++;
      } catch (e) {
        console.error('Failed to import payslip record:', e);
      }
    }
  }

  if (decryptedPayload.budgets) {
    for (const record of decryptedPayload.budgets) {
      try {
        const budget = await decryptData<CategoryBudget>(derivedKey, record.cipherText, record.iv);
        await saveCategoryBudget(derivedKey, budget);
      } catch (e) {
        console.error('Failed to import budget record:', e);
      }
    }
  }

  return { success: true, importedTxCount: txCount, importedPayslipCount: payslipCount };
}

export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const headers = ['ID', 'Date', 'Type', 'Amount', 'Category', 'Payment Method', 'Merchant', 'Notes'];
  const rows = transactions.map(t => [
    t.id,
    t.date,
    t.type,
    t.amount.toString(),
    `"${t.category || ''}"`,
    `"${t.paymentMethod || ''}"`,
    `"${t.merchant || ''}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csvContent, `fintrack_transactions_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportPayslipsToCSV(payslips: Payslip[]): void {
  const headers = ['ID', 'MonthYear', 'Gross Salary', 'Basic Pay', 'HRA', 'Special Allowance', 'Bonus', 'EPF', 'PT', 'TDS', 'Insurance', 'Net Pay'];
  const rows = payslips.map(p => [
    p.id,
    p.monthYear,
    p.grossSalary.toString(),
    p.basicPay.toString(),
    p.hra.toString(),
    p.specialAllowance.toString(),
    p.bonus.toString(),
    p.epf.toString(),
    p.professionalTax.toString(),
    p.tds.toString(),
    p.insurance.toString(),
    p.netPay.toString()
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csvContent, `fintrack_payslips_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function requestStoragePersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
}
