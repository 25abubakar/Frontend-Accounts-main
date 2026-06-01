import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
            <div className="text-5xl">🚫</div>
            <div className="mt-4 text-xl font-extrabold text-red-700">Something went wrong</div>
            <div className="mt-2 rounded-lg bg-red-50 p-3 text-left text-xs font-mono text-red-600 break-all">
              {this.state.message}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              This page encountered an error. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
