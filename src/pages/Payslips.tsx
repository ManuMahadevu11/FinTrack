import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Payslip } from '../types';
import { parsePdfPayslip } from '../services/pdfParser';
import { preprocessImageForOCR } from '../services/imagePreprocessor';
import { processReceiptOCR } from '../services/ocrWorker';
import { parsePayslipTextHeuristics } from '../services/pdfParser';
import { formatCurrency } from '../utils/formatters';
import { FileText, Plus, Trash2, Calendar } from 'lucide-react';

interface PayslipsProps {
  payslips: Payslip[];
  onSavePayslip: (payslip: Payslip) => Promise<void>;
  onDeletePayslip: (id: string) => Promise<void>;
}

export const Payslips: React.FC<PayslipsProps> = ({ payslips, onSavePayslip, onDeletePayslip }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');

  // Form State
  const [month, setMonth] = useState('March');
  const [year, setYear] = useState(new Date().getFullYear());
  const [grossSalary, setGrossSalary] = useState<number | ''>('');
  const [basicPay, setBasicPay] = useState<number | ''>('');
  const [hra, setHra] = useState<number | ''>('');
  const [specialAllowance, setSpecialAllowance] = useState<number | ''>('');
  const [bonus, setBonus] = useState<number | ''>('');

  const [epf, setEpf] = useState<number | ''>('');
  const [professionalTax, setProfessionalTax] = useState<number | ''>('');
  const [tds, setTds] = useState<number | ''>('');
  const [insurance, setInsurance] = useState<number | ''>('');

  const [netPay, setNetPay] = useState<number | ''>('');
  const [fileAttachment, setFileAttachment] = useState<string | undefined>();

  const resetForm = () => {
    setMonth('March');
    setYear(new Date().getFullYear());
    setGrossSalary('');
    setBasicPay('');
    setHra('');
    setSpecialAllowance('');
    setBonus('');
    setEpf('');
    setProfessionalTax('');
    setTds('');
    setInsurance('');
    setNetPay('');
    setFileAttachment(undefined);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseStatus('Reading document...');

    try {
      if (file.type === 'application/pdf') {
        setParseStatus('Extracting PDF details...');
        const parsed = await parsePdfPayslip(file);
        populateFormFromParsed(parsed);
      } else {
        setParseStatus('Reading payslip image...');
        const dataUrl = await preprocessImageForOCR(file);
        setFileAttachment(dataUrl);
        const ocr = await processReceiptOCR(dataUrl);
        const parsed = parsePayslipTextHeuristics(ocr.rawText);
        populateFormFromParsed(parsed);
      }
    } catch (err) {
      console.warn('Auto-parsing failed, manual entry allowed:', err);
      alert('Could not auto-fill all fields. Please enter the remaining salary breakdown.');
    } finally {
      setIsParsing(false);
      setParseStatus('');
    }
  };

  const populateFormFromParsed = (parsed: Partial<Payslip>) => {
    if (parsed.month) setMonth(parsed.month);
    if (parsed.year) setYear(parsed.year);
    if (parsed.grossSalary) setGrossSalary(parsed.grossSalary);
    if (parsed.basicPay) setBasicPay(parsed.basicPay);
    if (parsed.hra) setHra(parsed.hra);
    if (parsed.specialAllowance) setSpecialAllowance(parsed.specialAllowance);
    if (parsed.bonus) setBonus(parsed.bonus);
    if (parsed.epf) setEpf(parsed.epf);
    if (parsed.professionalTax) setProfessionalTax(parsed.professionalTax);
    if (parsed.tds) setTds(parsed.tds);
    if (parsed.insurance) setInsurance(parsed.insurance);
    if (parsed.netPay) setNetPay(parsed.netPay);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gross = Number(grossSalary) || 0;
    const basic = Number(basicPay) || 0;
    const hraVal = Number(hra) || 0;
    const special = Number(specialAllowance) || 0;
    const bonusVal = Number(bonus) || 0;

    const epfVal = Number(epf) || 0;
    const ptVal = Number(professionalTax) || 0;
    const tdsVal = Number(tds) || 0;
    const insVal = Number(insurance) || 0;

    const calculatedGross = gross > 0 ? gross : basic + hraVal + special + bonusVal;
    const calculatedDeductions = epfVal + ptVal + tdsVal + insVal;
    const finalNet = Number(netPay) > 0 ? Number(netPay) : calculatedGross - calculatedDeductions;

    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    const formattedMonthNum = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const monthYear = `${year}-${formattedMonthNum}`;

    const payslip: Payslip = {
      id: `payslip_${Date.now()}`,
      monthYear,
      month,
      year,
      grossSalary: calculatedGross,
      basicPay: basic,
      hra: hraVal,
      specialAllowance: special,
      bonus: bonusVal,
      epf: epfVal,
      professionalTax: ptVal,
      tds: tdsVal,
      insurance: insVal,
      netPay: finalNet,
      fileAttachment,
      createdAt: Date.now()
    };

    await onSavePayslip(payslip);
    setIsModalOpen(false);
    resetForm();
  };

  // Cumulative YTD Totals
  const ytdTotals = payslips.reduce(
    (acc, p) => ({
      gross: acc.gross + p.grossSalary,
      basic: acc.basic + p.basicPay,
      epf: acc.epf + p.epf,
      tds: acc.tds + p.tds,
      net: acc.net + p.netPay
    }),
    { gross: 0, basic: 0, epf: 0, tds: 0, net: 0 }
  );

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Payslips & Salary</h1>
          <p className="text-xs text-slate-500 font-medium">Upload PDF payslips and track your cumulative YTD income</p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          Add Payslip
        </Button>
      </div>

      {/* YTD Cumulative Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-white to-blue-50/40 border-blue-100 p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">YTD Gross Earnings</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(ytdTotals.gross)}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">{payslips.length} payslips uploaded</div>
        </Card>

        <Card className="bg-gradient-to-br from-white to-emerald-50/40 border-emerald-100 p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">YTD Take-Home</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrency(ytdTotals.net)}</div>
          <div className="text-[10px] text-emerald-600/80 mt-1 font-medium">Net salary credited</div>
        </Card>

        <Card className="bg-gradient-to-br from-white to-purple-50/40 border-purple-100 p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">YTD EPF Total</div>
          <div className="text-xl font-black text-purple-700 mt-0.5">{formatCurrency(ytdTotals.epf)}</div>
          <div className="text-[10px] text-purple-600 mt-1 font-medium">Section 80C Provident Fund</div>
        </Card>

        <Card className="bg-gradient-to-br from-white to-amber-50/40 border-amber-100 p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">YTD TDS Tax Withheld</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{formatCurrency(ytdTotals.tds)}</div>
          <div className="text-[10px] text-amber-600 mt-1 font-medium">Tax deducted at source</div>
        </Card>
      </div>

      {/* Historical Archive List */}
      <Card title="Uploaded Payslips" subtitle="Monthly salary breakdown history">
        {payslips.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No payslips added yet. Click "Add Payslip" to upload a PDF or image payslip.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {payslips.map(p => (
              <div
                key={p.id}
                className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 relative hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{p.month} {p.year}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{p.monthYear}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeletePayslip(p.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Gross Salary:</span>
                    <div className="font-bold text-slate-900">{formatCurrency(p.grossSalary)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Net Take-Home:</span>
                    <div className="font-bold text-emerald-600">{formatCurrency(p.netPay)}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-4 gap-1 text-[10px] text-slate-500 font-medium">
                  <div>Basic: <span className="font-bold text-slate-800">{formatCurrency(p.basicPay)}</span></div>
                  <div>HRA: <span className="font-bold text-slate-800">{formatCurrency(p.hra)}</span></div>
                  <div>EPF: <span className="font-bold text-purple-700">{formatCurrency(p.epf)}</span></div>
                  <div>TDS: <span className="font-bold text-amber-600">{formatCurrency(p.tds)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payslip Ingestion Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Payslip" maxWidth="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Upload PDF or Image File</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
            {isParsing && (
              <div className="text-xs text-indigo-600 font-medium flex items-center gap-2 pt-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                {parseStatus}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Earnings Breakdown (₹)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">Gross Salary</label>
                <input
                  type="number"
                  placeholder="0"
                  value={grossSalary}
                  onChange={e => setGrossSalary(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">Basic Pay</label>
                <input
                  type="number"
                  placeholder="0"
                  value={basicPay}
                  onChange={e => setBasicPay(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">HRA Received</label>
                <input
                  type="number"
                  placeholder="0"
                  value={hra}
                  onChange={e => setHra(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">Special Allowance</label>
                <input
                  type="number"
                  placeholder="0"
                  value={specialAllowance}
                  onChange={e => setSpecialAllowance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">Bonus / Variable</label>
                <input
                  type="number"
                  placeholder="0"
                  value={bonus}
                  onChange={e => setBonus(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Deductions Breakdown (₹)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">EPF Deduction</label>
                <input
                  type="number"
                  placeholder="0"
                  value={epf}
                  onChange={e => setEpf(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">Professional Tax (PT)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={professionalTax}
                  onChange={e => setProfessionalTax(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">TDS Withheld</label>
                <input
                  type="number"
                  placeholder="0"
                  value={tds}
                  onChange={e => setTds(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">Insurance / Other</label>
                <input
                  type="number"
                  placeholder="0"
                  value={insurance}
                  onChange={e => setInsurance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-700 mb-1">Net Take-Home Salary Credited</label>
            <input
              type="number"
              placeholder="0"
              value={netPay}
              onChange={e => setNetPay(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-emerald-700 font-extrabold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Payslip
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
