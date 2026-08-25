import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, action, className = '' }) => {
  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-normal">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
