import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Transaction, CategoryBudget } from '../types';
import { ExpenseDonutChart, CashFlowBarChart, getCategoryColor } from '../components/Charts';
import { formatCurrency } from '../utils/formatters';
import { Plus, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AnalyticsProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  onSaveBudget: (budget: CategoryBudget) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}

export const Analytics: React.FC<AnalyticsProps> = ({
  transactions,
  budgets,
  onSaveBudget,
  onDeleteBudget
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('Food');
  const [budgetLimit, setBudgetLimit] = useState<number | ''>('');

  // Month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const monthlyInflow = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const monthlyOutflow = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  // Category breakdown for Donut Chart
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    return Object.entries(categoryTotals)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        color: getCategoryColor(cat)
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions]);

  // Budget calculations
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return map;
  }, [monthTransactions]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetLimit || budgetLimit <= 0) return;

    const newBudget: CategoryBudget = {
      id: `budget_${budgetCategory.toLowerCase()}`,
      category: budgetCategory,
      monthlyLimit: Number(budgetLimit)
    };

    await onSaveBudget(newBudget);
    setIsBudgetModalOpen(false);
    setBudgetLimit('');
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Spending Insights</h1>
          <p className="text-xs text-slate-500 font-medium">Category breakdowns and monthly budget targets</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-600 focus:outline-none"
          />
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsBudgetModalOpen(true)}>
            Set Budget
          </Button>
        </div>
      </div>

      {/* Main Grid: Expense Donut Chart + Cash Flow Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Expense Breakdown" subtitle="Monthly expenses by category">
          <ExpenseDonutChart data={categoryData} totalExpense={monthlyOutflow} />
        </Card>

        <Card title="Monthly Cash Flow" subtitle="Income vs Expenses">
          <CashFlowBarChart inflow={monthlyInflow} outflow={monthlyOutflow} tax={0} />
        </Card>
      </div>

      {/* Budget Tracking Section */}
      <Card title="Monthly Category Budgets" subtitle="Monitor expenses against set targets">
        {budgets.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No monthly budgets configured yet. Click "Set Budget" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {budgets.map(b => {
              const spent = categorySpentMap[b.category] || 0;
              const percent = Math.min(100, Math.round((spent / b.monthlyLimit) * 100));
              const isOverBudget = spent > b.monthlyLimit;
              const isWarning = percent >= 80 && !isOverBudget;

              return (
                <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(b.category) }} />
                      <span className="text-xs font-bold text-slate-900">{b.category}</span>
                    </div>

                    {isOverBudget ? (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                        <ShieldAlert className="w-3 h-3" /> OVER BUDGET
                      </span>
                    ) : isWarning ? (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> &gt;80% USED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> ON TRACK
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Spent: <strong className="text-slate-900">{formatCurrency(spent)}</strong></span>
                      <span className="text-slate-500">Limit: <strong className="text-slate-800">{formatCurrency(b.monthlyLimit)}</strong></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 font-medium">{percent}% of limit used</span>
                    <button
                      onClick={() => onDeleteBudget(b.id)}
                      className="text-[10px] text-slate-500 hover:text-rose-600 underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Set Budget Modal */}
      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Set Monthly Budget">
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={budgetCategory}
              onChange={e => setBudgetCategory(e.target.value)}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Spending Limit (₹)</label>
            <input
              type="number"
              required
              placeholder="e.g. 15000"
              value={budgetLimit}
              onChange={e => setBudgetLimit(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsBudgetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
