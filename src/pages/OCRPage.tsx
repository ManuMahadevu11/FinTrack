import React, { useState } from 'react';
import { Card } from '../components/Card';
import { preprocessImageForOCR } from '../services/imagePreprocessor';
import { processReceiptOCR } from '../services/ocrWorker';
import { ReceiptOCRModal } from '../components/ReceiptOCRModal';
import { OCRResult, TransactionType, PaymentMethod } from '../types';
import { ScanLine, Upload, Camera, Loader2, Sparkles, CheckCircle } from 'lucide-react';

interface OCRPageProps {
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

export const OCRPage: React.FC<OCRPageProps> = ({ onSaveTransaction }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [processedImageDataUrl, setProcessedImageDataUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage('Reading receipt image...');

    try {
      // Step 1: Pre-process canvas
      const dataUrl = await preprocessImageForOCR(file);
      setProcessedImageDataUrl(dataUrl);

      // Step 2: Run OCR
      setStatusMessage('Extracting store name & amount...');
      const result = await processReceiptOCR(dataUrl);

      setOcrResult(result);
      setIsModalOpen(true);
    } catch (err) {
      console.error('OCR Processing error:', err);
      alert('Failed to read receipt. Please upload a clear receipt photo.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Receipt Scanner</h1>
        <p className="text-xs text-slate-500 font-medium">
          Automatically extract details from paper bills & receipts
        </p>
      </div>

      <Card className="p-8 text-center space-y-6 border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
        <div className="w-18 h-18 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
          <ScanLine className="w-9 h-9" />
        </div>

        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-extrabold text-slate-900">Scan a bill or receipt</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Upload a photo or capture a receipt. We will scan the merchant name, date, and total amount for you to confirm.
          </p>
        </div>

        {isProcessing ? (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl max-w-xs mx-auto space-y-2.5 shadow-sm">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
            <div className="text-xs font-bold text-slate-800">{statusMessage}</div>
            <p className="text-[11px] text-slate-400 font-medium">Processing on your device...</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <label className="cursor-pointer w-full sm:w-auto">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              <div className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition active:scale-95">
                <Upload className="w-4 h-4" />
                Upload Photo
              </div>
            </label>

            <label className="cursor-pointer w-full sm:w-auto">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
              <div className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition active:scale-95">
                <Camera className="w-4 h-4" />
                Take Photo
              </div>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-5 border-t border-slate-100">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-0.5">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Smart Enhancement
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Auto-enhances lighting & contrast for fast recognition.</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-0.5">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> On-Device Scanning
            </div>
            <p className="text-[11px] text-slate-500 font-medium">All image reading takes place privately inside your app.</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-0.5">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-amber-600" /> Quick Review
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Easily verify and edit scanned totals before saving.</p>
          </div>
        </div>
      </Card>

      {/* Human in the loop modal */}
      <ReceiptOCRModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ocrResult={ocrResult}
        imageDataUrl={processedImageDataUrl}
        onSaveTransaction={async tx => {
          const newTx = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...tx,
            createdAt: Date.now()
          };
          await onSaveTransaction(newTx);
        }}
      />
    </div>
  );
};
