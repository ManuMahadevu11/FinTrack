import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCategoryColor } from '../components/Charts';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Paperclip,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onSave: (tx: Transaction) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  transactions,
  onSave,
  onDelete,
  isAddModalOpen,
  setIsAddModalOpen
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'thisMonth' | 'lastMonth' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Editing state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Form State for Modal
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [merchant, setMerchant] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [receiptAttachment, setReceiptAttachment] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Food');
    setPaymentMethod('UPI');
    setMerchant('');
    setNotes('');
    setReceiptAttachment(undefined);
    setEditingTx(null);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setType(tx.type);
    setAmount(tx.amount);
    setDate(tx.date);
    setCategory(tx.category);
    setPaymentMethod(tx.paymentMethod);
    setMerchant(tx.merchant || '');
    setNotes(tx.notes || '');
    setReceiptAttachment(tx.receiptAttachment);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    setIsSaving(true);
    try {
      const newTx: Transaction = {
        id: editingTx ? editingTx.id : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        amount: Number(amount),
        date,
        category,
        paymentMethod,
        merchant: merchant.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptAttachment,
        createdAt: editingTx ? editingTx.createdAt : Date.now()
      };

      await onSave(newTx);
      setIsAddModalOpen(false);
      resetForm();
    } catch (e) {
      console.error('Failed to save transaction:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReceiptAttachment(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter(tx => {
      // Type Filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Category Filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // Date Range Filter
      if (dateRangePreset === 'thisMonth') {
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!tx.date.startsWith(currentMonthStr)) return false;
      } else if (dateRangePreset === 'lastMonth') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        if (!tx.date.startsWith(lastMonthStr)) return false;
      } else if (dateRangePreset === 'custom') {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const merchantMatch = tx.merchant?.toLowerCase().includes(q);
        const categoryMatch = tx.category.toLowerCase().includes(q);
        const notesMatch = tx.notes?.toLowerCase().includes(q);
        const amountMatch = tx.amount.toString().includes(q);
        if (!merchantMatch && !categoryMatch && !notesMatch && !amountMatch) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, dateRangePreset, startDate, endDate, searchQuery]);

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Transaction Ledger</h1>
          <p className="text-xs text-slate-500 font-medium">View and search your income and expenses</p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
        >
          New Entry
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, category, notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>

            {/* Date Range Preset */}
            <select
              value={dateRangePreset}
              onChange={e => setDateRangePreset(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>
        </div>

        {dateRangePreset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Transactions List Table */}
      <Card>
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No entries found. Tap "New Entry" to add one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map(tx => (
              <div
                key={tx.id}
                className="py-3 px-1 flex items-center justify-between hover:bg-slate-50 rounded-xl transition gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9.5 h-9.5 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{tx.merchant || tx.category}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {tx.paymentMethod}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <span>{formatDate(tx.date)}</span>
                      <span>•</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(tx.category) }} />
                      <span>{tx.category}</span>
                      {tx.notes && <span className="italic text-slate-400">— {tx.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {tx.receiptAttachment && (
                    <button
                      onClick={() => setPreviewAttachment(tx.receiptAttachment!)}
                      className="p-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-100 text-xs flex items-center gap-1 font-semibold"
                      title="View Receipt"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title={editingTx ? 'Edit Transaction' : 'Add New Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  type === 'expense'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Expense Outflow
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  type === 'income'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Income Inflow
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
              >
                {type === 'expense' ? (
                  <>
                    <option value="Food">Food & Dining</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Travel">Travel</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Investments">Investments</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Salary">Salary / Primary Pay</option>
                    <option value="Freelance">Side Income / Freelance</option>
                    <option value="Investments">Investment Returns</option>
                    <option value="Rental">Rental / Dividends</option>
                    <option value="Other">Other Income</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant / Payee Name</label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Amazon, Landlord"
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
            <textarea
              rows={2}
              placeholder="Optional transaction memo"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Receipt Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            {receiptAttachment && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-emerald-600 font-semibold">✓ Image attached</span>
                <button
                  type="button"
                  onClick={() => setReceiptAttachment(undefined)}
                  className="text-[10px] text-rose-600 underline font-medium"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingTx ? 'Update Entry' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <Modal isOpen={!!previewAttachment} onClose={() => setPreviewAttachment(null)} title="Receipt Image">
          <div className="flex justify-center p-2">
            <img src={previewAttachment} alt="Receipt Attachment" className="max-h-[70vh] rounded-xl object-contain" />
          </div>
        </Modal>
      )}
    </div>
  );
};
