import { useState } from 'react'
import LoginPage from './components/LoginPage.jsx'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  const [apiKey, setApiKey] = useState(null)

  if (!apiKey) {
    return <LoginPage onLogin={setApiKey} />
  }
  return <Dashboard apiKey={apiKey} onLogout={() => setApiKey(null)} />
}
