import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  ScanLine,
  FileText,
  Calculator,
  PieChart,
  Settings as SettingsIcon,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { useAuthKey } from '../context/AuthKeyContext';

export type NavTab = 'dashboard' | 'transactions' | 'ocr' | 'payslips' | 'tax' | 'analytics' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { lockSession } = useAuthKey();

  const mainNavItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transactions', label: 'Ledger', icon: <Receipt className="w-5 h-5" /> },
    { id: 'ocr', label: 'Scan', icon: <ScanLine className="w-5 h-5" /> },
    { id: 'payslips', label: 'Payslips', icon: <FileText className="w-5 h-5" /> },
    { id: 'tax', label: 'Tax', icon: <Calculator className="w-5 h-5" /> },
    { id: 'analytics', label: 'Insights', icon: <PieChart className="w-5 h-5" /> },
    { id: 'settings', label: 'Vault', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Top Mobile App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-600/25">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">FinTrack</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Personal Finance Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Private Vault</span>
            </div>

            <button
              onClick={lockSession}
              className="p-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 transition active:scale-95 flex items-center gap-1 text-xs font-semibold"
              title="Lock App"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Bottom Mobile App Tab Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-3xl p-1.5 shadow-xl shadow-slate-300/50">
        <nav className="flex items-center justify-between">
          {mainNavItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl text-[10px] font-bold transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
