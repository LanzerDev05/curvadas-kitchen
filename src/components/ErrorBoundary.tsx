import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('curvada_cart');
    localStorage.removeItem('curvada_active_id');
    localStorage.removeItem('curvada_active_group_id');
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0D0D0C] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#181818] border border-brand-red/30 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-3xl">
              🍛
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-black text-2xl uppercase tracking-wider text-white">
                Something went wrong
              </h2>
              <p className="text-gray-400 text-xs leading-relaxed">
                An unexpected interface issue occurred. You can safely reload or refresh local app state below.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="bg-black/40 rounded-xl p-3 text-left font-mono text-[11px] text-red-400 max-h-28 overflow-y-auto border border-white/5">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-display font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-brand-red/20"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
