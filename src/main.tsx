import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/globals.css'
import App from './App.tsx'
import { AppUiProvider } from './context/AppUiContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppUiProvider>
      <App />
    </AppUiProvider>
  </StrictMode>,
)
