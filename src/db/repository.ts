import { db } from './index';
import { encryptData, decryptData } from '../services/crypto';
import { Transaction, Payslip, CategoryBudget, AuthMetadata } from '../types';

// Auth Metadata Repository
export async function getAuthMetadata(): Promise<AuthMetadata | undefined> {
  return await db.authMetadata.get('auth');
}

export async function saveAuthMetadata(metadata: AuthMetadata): Promise<void> {
  await db.authMetadata.put(metadata);
}

// Transactions Repository
export async function saveTransaction(key: CryptoKey, tx: Transaction): Promise<void> {
  const encrypted = await encryptData(key, tx);
  await db.transactions.put({
    id: tx.id,
    iv: encrypted.iv,
    cipherText: encrypted.cipherText,
    updatedAt: Date.now()
  });
}

export async function getAllTransactions(key: CryptoKey): Promise<Transaction[]> {
  const records = await db.transactions.toArray();
  const transactions: Transaction[] = [];

  for (const record of records) {
    try {
      const decrypted = await decryptData<Transaction>(key, record.cipherText, record.iv);
      transactions.push(decrypted);
    } catch (e) {
      console.error(`Failed to decrypt transaction ${record.id}:`, e);
    }
  }

  // Sort newest first
  return transactions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

// Payslips Repository
export async function savePayslip(key: CryptoKey, payslip: Payslip): Promise<void> {
  const encrypted = await encryptData(key, payslip);
  await db.payslips.put({
    id: payslip.id,
    iv: encrypted.iv,
    cipherText: encrypted.cipherText,
    updatedAt: Date.now()
  });
}

export async function getAllPayslips(key: CryptoKey): Promise<Payslip[]> {
  const records = await db.payslips.toArray();
  const payslips: Payslip[] = [];

  for (const record of records) {
    try {
      const decrypted = await decryptData<Payslip>(key, record.cipherText, record.iv);
      payslips.push(decrypted);
    } catch (e) {
      console.error(`Failed to decrypt payslip ${record.id}:`, e);
    }
  }

  return payslips.sort((a, b) => b.monthYear.localeCompare(a.monthYear));
}

export async function deletePayslip(id: string): Promise<void> {
  await db.payslips.delete(id);
}

// Budgets Repository
export async function saveCategoryBudget(key: CryptoKey, budget: CategoryBudget): Promise<void> {
  const encrypted = await encryptData(key, budget);
  await db.budgets.put({
    id: budget.id,
    iv: encrypted.iv,
    cipherText: encrypted.cipherText,
    updatedAt: Date.now()
  });
}

export async function getAllBudgets(key: CryptoKey): Promise<CategoryBudget[]> {
  const records = await db.budgets.toArray();
  const budgets: CategoryBudget[] = [];

  for (const record of records) {
    try {
      const decrypted = await decryptData<CategoryBudget>(key, record.cipherText, record.iv);
      budgets.push(decrypted);
    } catch (e) {
      console.error(`Failed to decrypt budget ${record.id}:`, e);
    }
  }

  return budgets;
}

export async function deleteCategoryBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

// Clear Database completely (Emergency Reset)
export async function clearAllLocalData(): Promise<void> {
  await db.delete();
  await db.open();
  localStorage.clear();
  sessionStorage.clear();
}
