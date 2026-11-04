import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initializeAnalytics } from './utils/analytics'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

initializeAnalytics()
