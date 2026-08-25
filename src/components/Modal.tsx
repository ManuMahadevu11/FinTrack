import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full bg-white border-t sm:border border-slate-200 text-slate-900 rounded-t-3xl sm:rounded-3xl ${widthClasses[maxWidth]} shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] transition-transform duration-300`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-4 pb-8 sm:pb-5">{children}</div>
      </div>
    </div>
  );
};
