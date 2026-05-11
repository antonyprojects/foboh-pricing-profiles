import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional label so the panel can tell the user where it crashed. */
  area?: string;
}

interface State {
  error: Error | null;
}

/**
 * Top-level React error boundary. Without one of these, any render
 * exception in a child tree results in React unmounting the whole
 * subtree and the user seeing a white screen — the worst kind of
 * silent failure because the only signal is in the dev console.
 *
 * We wrap the whole `<App />` in main.tsx and individual page routes
 * too, so a crash in (say) ProfilesPage doesn't take the sidebar with
 * it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this is where we'd ship to Sentry / Datadog.
    // For now, surface to the dev console with the React tree so it's
    // discoverable.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.area ?? "app", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="card" role="alert" style={{ maxWidth: 720, margin: "32px auto" }}>
        <h2 className="section-title">Something went wrong</h2>
        <p className="section-sub">
          {this.props.area
            ? `The ${this.props.area} view crashed while rendering.`
            : "A render error stopped the page."}
          {" "}You can try again — your work in progress is preserved.
        </p>
        <pre
          className="mono"
          style={{
            background: "var(--bg-elev-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 12,
            fontSize: 12,
            overflowX: "auto",
            color: "var(--bad)",
            whiteSpace: "pre-wrap",
          }}
        >
          {error.name}: {error.message}
        </pre>
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={this.reset}>Try again</button>
          <button onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
