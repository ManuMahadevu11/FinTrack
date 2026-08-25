import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useAuthKey } from '../context/AuthKeyContext';
import { Transaction, Payslip } from '../types';
import {
  exportEncryptedBackup,
  restoreEncryptedBackup,
  exportTransactionsToCSV,
  exportPayslipsToCSV,
  requestStoragePersistence
} from '../services/exportImport';
import { Download, Upload, FileSpreadsheet, HardDrive, Lock, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  transactions: Transaction[];
  payslips: Payslip[];
  onRefreshData: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ transactions, payslips, onRefreshData }) => {
  const { cryptoKey, lockSession, emergencyReset } = useAuthKey();

  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [restorePassword, setRestorePassword] = useState<string>('');
  const [restoreFileText, setRestoreFileText] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [restoreError, setRestoreError] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(res => setIsPersisted(res));
    }
  }, []);

  const handleRequestPersistence = async () => {
    const res = await requestStoragePersistence();
    setIsPersisted(res);
  };

  const handleExportEncryptedJSON = async () => {
    if (!cryptoKey) return;
    setIsExporting(true);
    try {
      const blob = await exportEncryptedBackup(cryptoKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fintrack_backup_${new Date().toISOString().split('T')[0]}.enc.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        setRestoreFileText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFileText || !restorePassword) return;

    setRestoreError('');
    setIsRestoring(true);

    try {
      const result = await restoreEncryptedBackup(restoreFileText, restorePassword, restoreMode);
      if (result.success) {
        await onRefreshData();
        setIsRestoreModalOpen(false);
        setRestorePassword('');
        setRestoreFileText('');
        alert(`Successfully restored ${result.importedTxCount} transactions and ${result.importedPayslipCount} payslips.`);
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Restore failed. Please check your password.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Settings & Backup</h1>
        <p className="text-xs text-slate-500 font-medium">Backup your data, export to CSV, or manage app access</p>
      </div>

      {/* Storage Protection */}
      <Card title="App Storage Protection" subtitle="Keeps your data protected against browser cleanup">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isPersisted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Storage Status: {isPersisted ? 'Protected' : 'Standard'}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {isPersisted
                  ? 'Your data has persistent storage permission.'
                  : 'Grant persistent storage to ensure your offline data is safe.'}
              </p>
            </div>
          </div>

          {!isPersisted && (
            <Button variant="secondary" size="sm" onClick={handleRequestPersistence}>
              Grant Permission
            </Button>
          )}
        </div>
      </Card>

      {/* Backup & Restore */}
      <Card title="Backup & Restore" subtitle="Save or import your financial records file">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Download className="w-4 h-4 text-indigo-600" />
              Export Backup File
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Save a encrypted backup file of all your transactions and payslips.
            </p>
            <Button variant="primary" size="sm" className="w-full" onClick={handleExportEncryptedJSON} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export Backup'}
            </Button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Upload className="w-4 h-4 text-emerald-600" />
              Restore Backup File
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Import a previously exported backup file to restore your entries.
            </p>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setIsRestoreModalOpen(true)}>
              Import & Restore
            </Button>
          </div>
        </div>
      </Card>

      {/* CSV Export */}
      <Card title="Export to Excel / CSV" subtitle="Download readable spreadsheet files">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Transactions CSV
              </div>
              <div className="text-[10px] text-slate-500 font-medium">{transactions.length} records</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => exportTransactionsToCSV(transactions)}>
              Export
            </Button>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Payslips CSV
              </div>
              <div className="text-[10px] text-slate-500 font-medium">{payslips.length} records</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => exportPayslipsToCSV(payslips)}>
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Security Actions */}
      <Card title="Security & App Lock" subtitle="Manage your active app session">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button variant="secondary" size="sm" icon={<Lock className="w-4 h-4" />} onClick={lockSession}>
            Lock App Session
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={<AlertTriangle className="w-4 h-4" />}
            onClick={() => setShowWipeConfirm(true)}
          >
            Clear All Data
          </Button>
        </div>

        {showWipeConfirm && (
          <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5">
            <h4 className="text-xs font-bold text-rose-900">Confirm Data Clear</h4>
            <p className="text-[11px] text-rose-800 font-medium">
              This will permanently delete all records saved on this device. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={emergencyReset}>
                Clear Data
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowWipeConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Restore Modal */}
      <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="Restore Backup File">
        <form onSubmit={handleExecuteRestore} className="space-y-4">
          {restoreError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {restoreError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Backup (.json) File</label>
            <input
              type="file"
              accept=".json"
              required
              onChange={handleRestoreFileSelect}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Master Password</label>
            <input
              type="password"
              required
              placeholder="Password used when exporting backup"
              value={restorePassword}
              onChange={e => setRestorePassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Import Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  restoreMode === 'merge'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Merge Entries
              </button>
              <button
                type="button"
                onClick={() => setRestoreMode('overwrite')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  restoreMode === 'overwrite'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Overwrite All
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsRestoreModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isRestoring}>
              {isRestoring ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
