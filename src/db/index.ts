import Dexie, { Table } from 'dexie';
import { AuthMetadata, EncryptedPayload } from '../types';

export class FinTrackDatabase extends Dexie {
  authMetadata!: Table<AuthMetadata, string>;
  transactions!: Table<EncryptedPayload, string>;
  payslips!: Table<EncryptedPayload, string>;
  budgets!: Table<EncryptedPayload, string>;

  constructor() {
    super('FinTrackLocalDB');
    this.version(1).stores({
      authMetadata: 'id',
      transactions: 'id, updatedAt',
      payslips: 'id, updatedAt',
      budgets: 'id, updatedAt'
    });
  }
}

export const db = new FinTrackDatabase();
