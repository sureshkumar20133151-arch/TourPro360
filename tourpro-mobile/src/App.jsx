import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProjectList from './pages/ProjectList'
import NewProject from './pages/NewProject'
import RoomManager from './pages/RoomManager'
import AddRoom from './pages/AddRoom'
import HotspotEditor from './pages/HotspotEditor'
import UploadProgress from './pages/UploadProgress'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/new" element={<NewProject />} />
        <Route path="/project/:id/rooms" element={<RoomManager />} />
        <Route path="/project/:id/add-room" element={<AddRoom />} />
        <Route path="/project/:id/hotspots" element={<HotspotEditor />} />
        <Route path="/project/:id/upload" element={<UploadProgress />} />
      </Routes>
    </BrowserRouter>
  )
}
