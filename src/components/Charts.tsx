import React from 'react';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

interface ExpenseDonutChartProps {
  data: CategoryData[];
  totalExpense: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f59e0b',
  Rent: '#3b82f6',
  Utilities: '#06b6d4',
  Shopping: '#ec4899',
  Entertainment: '#8b5cf6',
  Travel: '#10b981',
  Healthcare: '#ef4444',
  Investments: '#6366f1',
  Other: '#64748b'
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#64748b';
}

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({ data, totalExpense }) => {
  if (totalExpense === 0 || data.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
        <p>No expense entries for this period.</p>
      </div>
    );
  }

  let cumulativeAngle = 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const slices = data.map(item => {
    const percentage = item.amount / totalExpense;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += percentage;

    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-slate-100"
            strokeWidth="24"
            fill="none"
          />
          {slices.map((slice, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={radius}
              stroke={slice.color}
              strokeWidth="24"
              fill="none"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              className="transition-all duration-500 hover:opacity-80 cursor-pointer"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expenses</span>
          <span className="text-base font-black text-slate-900">{formatCurrency(totalExpense)}</span>
        </div>
      </div>

      <div className="w-full space-y-2 max-h-52 overflow-y-auto pr-1">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-semibold text-slate-800">{slice.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-medium">{formatPercent(slice.percentage * 100)}</span>
              <span className="font-bold text-slate-900">{formatCurrency(slice.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CashFlowBarChartProps {
  inflow: number;
  outflow: number;
  tax: number;
}

export const CashFlowBarChart: React.FC<CashFlowBarChartProps> = ({ inflow, outflow, tax }) => {
  const maxVal = Math.max(inflow, outflow + tax, 1000);

  const items = [
    { label: 'Income Inflow', amount: inflow, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: 'Expense Outflow', amount: outflow, color: 'bg-rose-500', textColor: 'text-rose-600' },
  ];

  return (
    <div className="space-y-4 py-2">
      {items.map((item, idx) => {
        const percent = Math.min(100, Math.round((item.amount / maxVal) * 100));
        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">{item.label}</span>
              <span className={`font-black ${item.textColor}`}>{formatCurrency(item.amount)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
