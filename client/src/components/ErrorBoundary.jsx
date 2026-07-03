import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Application-wide error boundary.
 *
 * Root cause this addresses (M16-E): the SPA previously had no error boundary,
 * so any exception thrown during render propagated to the React root and unmounted
 * the entire tree — producing a permanently blank page for the rest of the session,
 * including on subsequent client-side navigation. This class contains render faults
 * to a recoverable UI instead of blanking the app.
 *
 * `resetKey` (wired to the current route) clears the caught error when the user
 * navigates elsewhere, so a fault on one page does not strand the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surfaced in the browser console and any attached error reporter.
    console.error("[ErrorBoundary] Uncaught render error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page hit an unexpected error. Your data is safe. You can reload the page or
            head back to your dashboard.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reload page
            </button>
            <a
              href="/app/dashboard"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
