import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BicharioPage } from './pages/BicharioPage'
import { WorkspacePage } from './pages/WorkspacePage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BicharioPage />} />
        <Route path="/agent/:agentId" element={<WorkspacePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
