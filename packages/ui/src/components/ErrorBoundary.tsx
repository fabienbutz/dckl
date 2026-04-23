import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    console.error("[deckel] uncaught render error", error);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-full flex items-center justify-center px-8">
          <div className="max-w-md space-y-3">
            <div className="font-mono text-label uppercase tracking-wider text-text-tertiary">
              Render error
            </div>
            <h1 className="text-heading-lg font-medium text-text-primary">
              Something broke while rendering.
            </h1>
            <pre className="px-3 py-2 rounded-[4px] border border-border bg-surface font-mono text-label text-text-secondary overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="px-3 py-1.5 rounded-[3px] border border-border text-body text-text-primary hover:bg-surface-hover transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
