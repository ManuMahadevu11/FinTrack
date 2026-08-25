import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { OCRResult, TransactionType, PaymentMethod } from '../types';
import { CheckCircle2, FileText } from 'lucide-react';

interface ReceiptOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrResult: OCRResult | null;
  imageDataUrl: string | null;
  onSaveTransaction: (tx: {
    type: TransactionType;
    amount: number;
    date: string;
    category: string;
    merchant: string;
    paymentMethod: PaymentMethod;
    notes: string;
    receiptAttachment?: string;
  }) => Promise<void>;
}

export const ReceiptOCRModal: React.FC<ReceiptOCRModalProps> = ({
  isOpen,
  onClose,
  ocrResult,
  imageDataUrl,
  onSaveTransaction
}) => {
  const [merchant, setMerchant] = useState<string>(ocrResult?.merchant || '');
  const [amount, setAmount] = useState<number>(ocrResult?.amount || 0);
  const [date, setDate] = useState<string>(ocrResult?.date || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Shopping');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [type, setType] = useState<TransactionType>('expense');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  React.useEffect(() => {
    if (ocrResult) {
      setMerchant(ocrResult.merchant || '');
      setAmount(ocrResult.amount || 0);
      setDate(ocrResult.date || new Date().toISOString().split('T')[0]);
    }
  }, [ocrResult]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    setIsSaving(true);
    try {
      await onSaveTransaction({
        type,
        amount,
        date,
        category,
        merchant,
        paymentMethod,
        notes,
        receiptAttachment: imageDataUrl || undefined
      });
      onClose();
    } catch (e) {
      console.error('Failed to save transaction:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !ocrResult) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Receipt Details" maxWidth="lg">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Receipt details extracted automatically. Please verify or update before saving.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Receipt Image Preview */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              Receipt Photo
            </label>
            <div className="h-64 rounded-xl border border-slate-200 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="Receipt" className="max-h-full object-contain rounded-lg shadow-sm" />
              ) : (
                <span className="text-xs text-slate-400">No photo available</span>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    type === 'expense'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    type === 'income'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant / Store Name</label>
              <input
                type="text"
                required
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                >
                  <option value="Food">Food & Dining</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Travel">Travel</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Investments">Investments</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
              >
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
