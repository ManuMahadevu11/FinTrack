import React, { useState, useEffect } from 'react';
import { AuthKeyProvider, useAuthKey } from './context/AuthKeyContext';
import { LockScreen } from './pages/LockScreen';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { OCRPage } from './pages/OCRPage';
import { Payslips } from './pages/Payslips';
import { TaxPlanner } from './pages/TaxPlanner';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

import { Transaction, Payslip, CategoryBudget } from './types';
import {
  getAllTransactions,
  saveTransaction,
  deleteTransaction,
  getAllPayslips,
  savePayslip,
  deletePayslip,
  getAllBudgets,
  saveCategoryBudget,
  deleteCategoryBudget
} from './db/repository';

const MainApp: React.FC = () => {
  const { isAuthenticated, cryptoKey, isLoading } = useAuthKey();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Domain State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);

  // Add modal trigger
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    if (!cryptoKey) return;
    try {
      const [txs, pays, bgs] = await Promise.all([
        getAllTransactions(cryptoKey),
        getAllPayslips(cryptoKey),
        getAllBudgets(cryptoKey)
      ]);
      setTransactions(txs);
      setPayslips(pays);
      setBudgets(bgs);
    } catch (e) {
      console.error('Failed to load local records:', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated && cryptoKey) {
      loadData();
    }
  }, [isAuthenticated, cryptoKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl animate-bounce shadow-lg shadow-indigo-600/30">
          ₹
        </div>
        <div className="text-xs font-bold text-slate-500 animate-pulse tracking-wider uppercase">Opening FinTrack...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  // Handlers for Transactions
  const handleSaveTransaction = async (tx: Transaction) => {
    if (!cryptoKey) return;
    await saveTransaction(cryptoKey, tx);
    await loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    await loadData();
  };

  // Handlers for Payslips
  const handleSavePayslip = async (payslip: Payslip) => {
    if (!cryptoKey) return;
    await savePayslip(cryptoKey, payslip);
    await loadData();
  };

  const handleDeletePayslip = async (id: string) => {
    await deletePayslip(id);
    await loadData();
  };

  // Handlers for Budgets
  const handleSaveBudget = async (budget: CategoryBudget) => {
    if (!cryptoKey) return;
    await saveCategoryBudget(cryptoKey, budget);
    await loadData();
  };

  const handleDeleteBudget = async (id: string) => {
    await deleteCategoryBudget(id);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white flex justify-center">
      {/* Centered Mobile Shell Frame */}
      <div className="w-full max-w-2xl min-h-screen bg-slate-50 border-x border-slate-200/80 shadow-xl flex flex-col relative pb-24">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="px-4 py-5 flex-1 space-y-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              payslips={payslips}
              onNavigate={setActiveTab}
              onOpenAddTx={() => {
                setActiveTab('transactions');
                setIsAddTxModalOpen(true);
              }}
            />
          )}

          {activeTab === 'transactions' && (
            <Transactions
              transactions={transactions}
              onSave={handleSaveTransaction}
              onDelete={handleDeleteTransaction}
              isAddModalOpen={isAddTxModalOpen}
              setIsAddModalOpen={setIsAddTxModalOpen}
            />
          )}

          {activeTab === 'ocr' && (
            <OCRPage
              onSaveTransaction={async tx => {
                await handleSaveTransaction(tx as Transaction);
                setActiveTab('transactions');
              }}
            />
          )}

          {activeTab === 'payslips' && (
            <Payslips
              payslips={payslips}
              onSavePayslip={handleSavePayslip}
              onDeletePayslip={handleDeletePayslip}
            />
          )}

          {activeTab === 'tax' && <TaxPlanner payslips={payslips} />}

          {activeTab === 'analytics' && (
            <Analytics
              transactions={transactions}
              budgets={budgets}
              onSaveBudget={handleSaveBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              transactions={transactions}
              payslips={payslips}
              onRefreshData={loadData}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthKeyProvider>
      <MainApp />
    </AuthKeyProvider>
  );
};

export default App;
