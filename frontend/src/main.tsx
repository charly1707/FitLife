import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ActivityProvider } from './context/ActivityContext'
import { hideSplashWhenReady } from './utils/splash'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ActivityProvider>
          <App />
        </ActivityProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

// L'écran de chargement (index.html) disparaît à la fin de l'animation du logo.
hideSplashWhenReady()
