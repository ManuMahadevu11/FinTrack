import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isCryptoError =
        this.state.error?.message?.includes('crypto') ||
        this.state.error?.message?.includes('subtle') ||
        this.state.error?.message?.includes('undefined');

      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-5 text-center">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-extrabold text-slate-900">
              {isCryptoError ? 'HTTPS Connection Required' : 'Something went wrong'}
            </h2>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {isCryptoError
                ? 'Mobile browsers require a secure HTTPS connection (or GitHub Pages) to run local encryption features. Please access via your HTTPS URL or localhost.'
                : this.state.error?.message || 'An unexpected error occurred while loading the application.'}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
