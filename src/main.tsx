import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function App(): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-foreground)' }}>
        GrowUp
      </h1>
    </div>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
