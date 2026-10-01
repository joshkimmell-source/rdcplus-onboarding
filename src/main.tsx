import React from 'react'
import ReactDOM from 'react-dom/client'
import { RdcUiScanner } from '@rdc-npm/rdc-ui-scanner/react'
import Shell from './Shell'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Shell />
    <RdcUiScanner render="always" />
  </React.StrictMode>
)
