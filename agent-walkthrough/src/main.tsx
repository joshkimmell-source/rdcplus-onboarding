import React from 'react'
import ReactDOM from 'react-dom/client'
import Shell from './Shell'
import NameGate from './NameGate'
import './index.css'

// Dev-only switches for comparing treatments (not product controls):
//   ?dim=0          ring + halo instead of a dimmed scrim during tours
//   ?corner=left    float the tour list bottom-left, next to the rail
const params = new URLSearchParams(window.location.search)
const dimDuringTours = params.get('dim') !== '0'
const listCorner = params.get('corner') === 'left' ? 'bottom-left' : 'bottom-right'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NameGate>
      {locked => <Shell locked={locked} dimDuringTours={dimDuringTours} listCorner={listCorner} />}
    </NameGate>
  </React.StrictMode>
)
