import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Transaction, Payslip } from '../types';
import { formatCurrency, formatPercent, formatDate } from '../utils/formatters';
import { getCategoryColor } from '../components/Charts';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PlusCircle,
  ScanLine,
  FileText,
  Calculator,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  payslips: Payslip[];
  onNavigate: (tab: any) => void;
  onOpenAddTx: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  payslips,
  onNavigate,
  onOpenAddTx
}) => {
  // Current Month calculations
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthTxs = transactions.filter(t => t.date.startsWith(currentMonthStr));

  const monthlyInflow = currentMonthTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyOutflow = currentMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInflowAllTime = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflowAllTime = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalInflowAllTime - totalOutflowAllTime;

  const netSavings = monthlyInflow - monthlyOutflow;
  const savingsRate = monthlyInflow > 0 ? (netSavings / monthlyInflow) * 100 : 0;

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Friendly Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Welcome Back 👋</h1>
          <p className="text-xs text-slate-500 font-medium">
            {now.toLocaleString('default', { month: 'long', year: 'numeric' })} overview
          </p>
        </div>
        <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Vault Active</span>
        </div>
      </div>

      {/* Hero Mobile App Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-6 text-white shadow-xl shadow-indigo-600/20 space-y-5">
        <div>
          <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Total Net Balance</span>
          <div className="text-3xl font-black text-white tracking-tight mt-0.5">{formatCurrency(totalBalance)}</div>
        </div>

        {/* Monthly Summary Strip inside hero card */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-emerald-300 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-indigo-200 uppercase font-semibold">Income</div>
              <div className="text-sm font-extrabold text-white">{formatCurrency(monthlyInflow)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-rose-300 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-indigo-200 uppercase font-semibold">Expenses</div>
              <div className="text-sm font-extrabold text-white">{formatCurrency(monthlyOutflow)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Quick Action Buttons Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={onOpenAddTx}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition active:scale-95 text-slate-800 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold">Add Entry</span>
        </button>

        <button
          onClick={() => onNavigate('ocr')}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition active:scale-95 text-slate-800 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
            <ScanLine className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold">Scan Receipt</span>
        </button>

        <button
          onClick={() => onNavigate('payslips')}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition active:scale-95 text-slate-800 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold">Payslips</span>
        </button>
      </div>

      {/* Savings Rate Card */}
      <Card className="bg-gradient-to-br from-white to-purple-50/50 border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Monthly Savings Rate</div>
              <div className="text-[11px] text-slate-500 font-medium">Net Savings: {formatCurrency(netSavings > 0 ? netSavings : 0)}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-black text-purple-700">{formatPercent(savingsRate)}</div>
            <div className="text-[10px] text-purple-600 font-medium">saved</div>
          </div>
        </div>
      </Card>

      {/* Recent Ledger Mobile Card */}
      <Card
        title="Recent Transactions"
        subtitle="Your latest account activity"
        action={
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5"
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No transactions recorded yet. Tap "Add Entry" above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="py-3 flex items-center justify-between active:bg-slate-50 px-1 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9.5 h-9.5 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {tx.merchant || tx.category}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                      <span>{formatDate(tx.date)}</span>
                      <span>•</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(tx.category) }} />
                      <span>{tx.category}</span>
                    </div>
                  </div>
                </div>

                <div className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tax Quick Action Card */}
      <Card className="border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Income Tax Planner</div>
              <div className="text-[10px] text-slate-500 font-medium">{payslips.length} payslips recorded</div>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={() => onNavigate('tax')}>
            Check Tax Savings
          </Button>
        </div>
      </Card>
    </div>
  );
};
