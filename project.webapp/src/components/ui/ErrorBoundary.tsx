import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: String(error?.message || 'Unexpected error') };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('structure_analysis_state')) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
    this.setState({ hasError: false, message: undefined });
    try { window.location.reload(); } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl p-6 text-center">
            <h2 className="text-xl font-bold text-black mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">{this.state.message || 'The page failed to render.'}</p>
            <button
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
              onClick={this.handleReset}
            >Reset Structure Analysis</button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;


