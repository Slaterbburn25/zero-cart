import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#300', color: '#fff', borderRadius: '12px', margin: '2rem' }}>
          <h2>UI Render Crash</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ fontSize: '0.8rem', background: '#000', padding: '1rem', marginTop: '1rem', overflowX: 'auto' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children; 
  }
}
