import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SpectatorView from './components/SpectatorView'

createRoot(document.getElementById('spectator-root')!).render(
  <StrictMode>
    <SpectatorView />
  </StrictMode>
)
