import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  title: string;
  body: string;
  reloadLabel: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected rendering error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900">
          <p className="text-lg font-semibold">{this.props.title}</p>
          <p className="text-sm">{this.props.body}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {this.props.reloadLabel}
          </button>
        </div>
      </main>
    );
  }
}
