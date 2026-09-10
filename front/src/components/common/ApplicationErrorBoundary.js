import React from "react";

class ApplicationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, details) {
    console.error("AEROPULSE screen failed to render", error, details);
  }

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="application-error-screen" role="alert">
        <div className="application-error-card">
          <span className="application-error-mark" aria-hidden="true">!</span>
          <p className="application-error-eyebrow">AEROPULSE</p>
          <h1>This screen could not open</h1>
          <p>
            The page may have been updated while it was open. Reload to use the
            latest version. Your saved records are not affected.
          </p>
          <button type="button" onClick={this.reload}>Reload screen</button>
        </div>
      </main>
    );
  }
}

export default ApplicationErrorBoundary;
