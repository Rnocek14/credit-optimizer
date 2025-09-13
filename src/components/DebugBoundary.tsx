import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DebugBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[DebugBoundary] Canvas error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      return (
        <div style={{ padding: 16 }}>
          <h3>Canvas crash</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {String(error?.message || error)}
          </pre>
          {'stack' in (error || {}) && (
            <details open>
              <summary>Stack</summary>
              <pre>{(error as any).stack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}