"use client";
import React from "react";

type Props = { children: React.ReactNode };

export default class ClientErrorBoundary extends React.Component<Props, { error: Error | null }> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // You can log the error to an external service here
    console.error('ClientErrorBoundary caught', error, info);
  }

  handleReload = () => {
    // Force a full reload to attempt fetching fresh chunks
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div className="font-semibold text-yellow-700">An application component failed to load.</div>
          <div className="text-xs text-yellow-800 mt-2">This can happen during dev when code changes and chunks are rebuilt. Try reloading the page.</div>
          <div className="mt-3">
            <button onClick={this.handleReload} className="px-3 py-1 bg-yellow-700 text-white rounded">Reload page</button>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
