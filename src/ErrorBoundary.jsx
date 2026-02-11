import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <header className="cf-header">
            <div className="cf-header__content">
              <div className="cf-header__left">
                <h1 className="cf-logo">Mock.sh🐦</h1>
              </div>
            </div>
          </header>
          <div className="cf-container">
            <div className="cf-box">
              <div className="cf-box__header" style={{ background: '#ffebee', borderColor: '#ef9a9a' }}>
                Application Error
              </div>
              <div className="cf-box__body">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#c62828"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ margin: '0 auto 20px' }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <h2 style={{ marginBottom: '12px', color: '#333' }}>
                    Something went wrong
                  </h2>
                  <p style={{ color: '#666', marginBottom: '24px' }}>
                    An unexpected error occurred. Please try reloading the page.
                  </p>
                  {this.state.error && (
                    <details
                      style={{
                        textAlign: 'left',
                        background: '#f5f5f5',
                        padding: '16px',
                        borderRadius: '4px',
                        marginBottom: '20px',
                        border: '1px solid #d4d4d4',
                      }}
                    >
                      <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>
                        Error Details
                      </summary>
                      <pre
                        style={{
                          fontSize: '0.85rem',
                          overflow: 'auto',
                          margin: 0,
                          fontFamily: 'monospace',
                          color: '#c62828',
                        }}
                      >
                        {this.state.error.toString()}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </details>
                  )}
                  <button className="cf-btn cf-btn--primary" onClick={this.handleReload}>
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
