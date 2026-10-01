import React from 'react'
import ReactDOM from 'react-dom/client'
import { RdcUiScanner } from '@rdc-npm/rdc-ui-scanner/react'
import PasswordGate from './PasswordGate'
import Shell from './Shell'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PasswordGate>{locked => <Shell locked={locked} />}</PasswordGate>
    <RdcUiScanner render="always" />
  </React.StrictMode>
)
