import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Upload from './pages/Upload'
import MeetingDetail from './pages/MeetingDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/meeting/:id" element={<MeetingDetail />} />
      </Routes>
    </BrowserRouter>
  )
}