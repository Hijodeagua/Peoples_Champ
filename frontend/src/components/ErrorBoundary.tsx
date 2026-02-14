import React from "react";
import { FEEDBACK_URL } from "./FeedbackLink";

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4">
              Something went wrong
            </h1>
            <p className="text-slate-400 mb-6">
              We hit an unexpected error loading the page. Please let us know so
              we can fix it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition"
              >
                Report this issue
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl border-2 border-slate-600 hover:border-slate-500 text-slate-200 font-semibold transition"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
