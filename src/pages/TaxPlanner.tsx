import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { Payslip } from '../types';
import { compareRegimes, aggregatePayslipAnnualTotals, TaxInputParams } from '../services/taxCalculator';
import { formatCurrency } from '../utils/formatters';
import { Sparkles } from 'lucide-react';

interface TaxPlannerProps {
  payslips: Payslip[];
}

export const TaxPlanner: React.FC<TaxPlannerProps> = ({ payslips }) => {
  const aggregated = useMemo(() => aggregatePayslipAnnualTotals(payslips), [payslips]);

  // Form Inputs
  const [grossAnnualIncome, setGrossAnnualIncome] = useState<number>(aggregated.grossAnnual || 1200000);
  const [basicPayAnnual, setBasicPayAnnual] = useState<number>(aggregated.basicAnnual || 600000);
  const [hraReceivedAnnual, setHraReceivedAnnual] = useState<number>(aggregated.hraAnnual || 240000);
  const [annualRentPaid, setAnnualRentPaid] = useState<number>(180000);
  const [isMetro, setIsMetro] = useState<boolean>(true);
  const [section80C, setSection80C] = useState<number>(aggregated.epfAnnual || 150000);
  const [section80D, setSection80D] = useState<number>(25000);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [tdsDeducted, setTdsDeducted] = useState<number>(aggregated.tdsAnnual || 50000);

  // Sync inputs if payslips update
  React.useEffect(() => {
    if (payslips.length > 0) {
      if (aggregated.grossAnnual) setGrossAnnualIncome(aggregated.grossAnnual);
      if (aggregated.basicAnnual) setBasicPayAnnual(aggregated.basicAnnual);
      if (aggregated.hraAnnual) setHraReceivedAnnual(aggregated.hraAnnual);
      if (aggregated.epfAnnual) setSection80C(aggregated.epfAnnual);
      if (aggregated.tdsAnnual) setTdsDeducted(aggregated.tdsAnnual);
    }
  }, [payslips, aggregated]);

  const inputParams: TaxInputParams = {
    grossAnnualIncome,
    basicPayAnnual,
    hraReceivedAnnual,
    annualRentPaid,
    isMetro,
    section80C,
    section80D,
    otherDeductions,
    tdsDeducted
  };

  const taxSummary = useMemo(() => compareRegimes(inputParams), [inputParams]);
  const { newRegime, oldRegime, recommendedRegime, taxSavings } = taxSummary;

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Income Tax Planner</h1>
        <p className="text-xs text-slate-500 font-medium">Compare New vs. Old Tax Regime savings for FY 2024-25 / 2025-26</p>
      </div>

      {/* Recommended Regime Banner */}
      <div className={`p-5 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        recommendedRegime === 'NEW'
          ? 'bg-gradient-to-r from-indigo-600 to-blue-700 shadow-indigo-600/20'
          : 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-600/20'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Tax Recommendation</div>
            <h3 className="text-lg font-black text-white">
              The {recommendedRegime === 'NEW' ? 'New Tax Regime' : 'Old Tax Regime'} saves you {formatCurrency(taxSavings)}!
            </h3>
          </div>
        </div>

        <div className="text-left sm:text-right bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20">
          <div className="text-[10px] text-indigo-100 font-medium">Annual Tax Payable</div>
          <div className="text-base font-black text-white">
            {formatCurrency(recommendedRegime === 'NEW' ? newRegime.totalTaxLiability : oldRegime.totalTaxLiability)}
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs Form + Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Tax Input Parameters */}
        <div className="space-y-4">
          <Card title="Tax Parameters" subtitle="Adjust salary & deduction estimates">
            <form className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Gross Annual Income (₹)</label>
                <input
                  type="number"
                  value={grossAnnualIncome}
                  onChange={e => setGrossAnnualIncome(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Basic Annual Salary (₹)</label>
                <input
                  type="number"
                  value={basicPayAnnual}
                  onChange={e => setBasicPayAnnual(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HRA Received (₹)</label>
                  <input
                    type="number"
                    value={hraReceivedAnnual}
                    onChange={e => setHraReceivedAnnual(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Rent Paid (₹/yr)</label>
                  <input
                    type="number"
                    value={annualRentPaid}
                    onChange={e => setAnnualRentPaid(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="metroCheck"
                  checked={isMetro}
                  onChange={e => setIsMetro(e.target.checked)}
                  className="rounded bg-slate-50 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="metroCheck" className="text-slate-700 font-medium">Metro City (50% HRA limit)</label>
              </div>

              <div className="border-t border-slate-100 pt-2 space-y-2">
                <div className="font-semibold text-slate-900">Old Regime Deductions</div>
                
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Section 80C (EPF, ELSS, PPF max 1.5L)</label>
                  <input
                    type="number"
                    value={section80C}
                    onChange={e => setSection80C(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Section 80D (Health Insurance)</label>
                  <input
                    type="number"
                    value={section80D}
                    onChange={e => setSection80D(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <label className="block text-amber-700 font-semibold mb-1">Total TDS Already Deducted (₹)</label>
                <input
                  type="number"
                  value={tdsDeducted}
                  onChange={e => setTdsDeducted(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-amber-900 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </form>
          </Card>
        </div>

        {/* Right 2 Columns: Side-by-Side Comparison Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* New Regime Card */}
            <Card
              className={`space-y-4 transition ${
                recommendedRegime === 'NEW' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">New Tax Regime</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Default Regime</p>
                </div>
                {recommendedRegime === 'NEW' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold">
                    RECOMMENDED
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Income:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(newRegime.grossIncome)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Standard Deduction:</span>
                  <span className="font-bold text-emerald-600">-{formatCurrency(newRegime.deductions.standardDeduction)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>Taxable Income:</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(newRegime.taxableIncome)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Calculated Tax:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(newRegime.slabTax)}</span>
                </div>
                {newRegime.rebate87A > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Sec 87A Rebate:</span>
                    <span className="font-bold">-{formatCurrency(newRegime.rebate87A)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>4% Health & Cess:</span>
                  <span className="font-bold text-slate-900">+{formatCurrency(newRegime.healthAndEduCess)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Tax Payable</div>
                <div className="text-xl font-black text-slate-900">{formatCurrency(newRegime.totalTaxLiability)}</div>
              </div>

              {/* TDS Reconciler Result */}
              <div className={`p-3 rounded-xl border text-xs font-semibold ${
                newRegime.netDiff >= 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {newRegime.netDiff >= 0 ? (
                  <div>Estimated Refund: <span className="font-black text-emerald-700">{formatCurrency(newRegime.netDiff)}</span></div>
                ) : (
                  <div>Advance Tax Payable: <span className="font-black text-rose-700">{formatCurrency(Math.abs(newRegime.netDiff))}</span></div>
                )}
              </div>
            </Card>

            {/* Old Regime Card */}
            <Card
              className={`space-y-4 transition ${
                recommendedRegime === 'OLD' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Old Tax Regime</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Includes HRA, 80C, 80D</p>
                </div>
                {recommendedRegime === 'OLD' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                    RECOMMENDED
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Income:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(oldRegime.grossIncome)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Deductions:</span>
                  <span className="font-bold text-emerald-600">-{formatCurrency(oldRegime.deductions.totalDeductions)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>Taxable Income:</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(oldRegime.taxableIncome)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Calculated Tax:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(oldRegime.slabTax)}</span>
                </div>
                {oldRegime.rebate87A > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Sec 87A Rebate:</span>
                    <span className="font-bold">-{formatCurrency(oldRegime.rebate87A)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>4% Health & Cess:</span>
                  <span className="font-bold text-slate-900">+{formatCurrency(oldRegime.healthAndEduCess)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Tax Payable</div>
                <div className="text-xl font-black text-slate-900">{formatCurrency(oldRegime.totalTaxLiability)}</div>
              </div>

              {/* TDS Reconciler Result */}
              <div className={`p-3 rounded-xl border text-xs font-semibold ${
                oldRegime.netDiff >= 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {oldRegime.netDiff >= 0 ? (
                  <div>Estimated Refund: <span className="font-black text-emerald-700">{formatCurrency(oldRegime.netDiff)}</span></div>
                ) : (
                  <div>Advance Tax Payable: <span className="font-black text-rose-700">{formatCurrency(Math.abs(oldRegime.netDiff))}</span></div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
