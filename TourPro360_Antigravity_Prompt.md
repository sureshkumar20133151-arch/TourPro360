# 360 Virtual Tour Platform — Full Build Prompt for Antigravity

---

## PROJECT OVERVIEW

Build a full-stack 360° Virtual Tour Platform called **TourPro360** for the construction industry in Tamil Nadu, India. This is a SaaS product built and operated by a solo developer (Suresh) who visits construction sites, captures 360° room photos, uploads them via a mobile app, and delivers an interactive virtual tour embedded on clients' websites.

The system has **3 parts**:
1. **Mobile Capture App** — Android app (React + Capacitor) for on-site photo upload
2. **Admin Dashboard** — Web app (React + Tailwind) for managing projects and generating embed codes
3. **Embed Widget** — Vanilla JS bundle that renders the 360° tour on any client website

**Core Tech Stack:**
- Frontend: React 18 + Tailwind CSS + Vite
- Mobile: React + Capacitor (Android APK)
- Backend/DB: Supabase (PostgreSQL + Storage + Auth)
- 360° Viewer: Pannellum.js
- Hosting: Vercel

---

## PART 1 — SUPABASE BACKEND SETUP

### 1.1 Database Schema

Create the following tables in Supabase:

```sql
-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  building_name TEXT NOT NULL,
  city TEXT,
  building_type TEXT CHECK (building_type IN ('Residential', 'Commercial', 'Villa', 'Apartment', 'Plot')),
  entry_room_id UUID,
  is_live BOOLEAN DEFAULT false,
  embed_token TEXT DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key for entry_room after rooms table exists
ALTER TABLE projects
  ADD CONSTRAINT fk_entry_room
  FOREIGN KEY (entry_room_id) REFERENCES rooms(id) ON DELETE SET NULL;

-- Hotspots table
CREATE TABLE hotspots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  to_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  pitch FLOAT DEFAULT 0,
  yaw FLOAT DEFAULT 0,
  label TEXT DEFAULT 'Go to next room',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Supabase Storage Bucket

Create a public bucket called `tours`:
- Bucket name: `tours`
- Public access: enabled (so embed widget can read photos without auth)
- File path format: `tours/{project_id}/{room_id}.jpg`

### 1.3 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

-- Admin (Suresh) can do everything (authenticated user)
CREATE POLICY "Admin full access" ON projects
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access" ON rooms
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access" ON hotspots
  FOR ALL USING (auth.role() = 'authenticated');

-- Public can read live projects (for embed widget)
CREATE POLICY "Public read live projects" ON projects
  FOR SELECT USING (is_live = true);

CREATE POLICY "Public read rooms" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = rooms.project_id AND p.is_live = true
    )
  );

CREATE POLICY "Public read hotspots" ON hotspots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = hotspots.from_room_id AND p.is_live = true
    )
  );
```

### 1.4 Environment Variables

Create `.env` file:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 1.5 Supabase Client Setup

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## PART 2 — ADMIN DASHBOARD (React + Tailwind)

### 2.1 Project Structure

```
src/
  components/
    Layout.jsx          ← Sidebar + header shell
    ProjectCard.jsx     ← Project list item
    RoomCard.jsx        ← Room thumbnail card
    HotspotForm.jsx     ← Add/edit hotspot form
    TourViewer.jsx      ← Pannellum.js wrapper component
    EmbedCodePanel.jsx  ← Shows iframe + script embed codes
  pages/
    Login.jsx
    Dashboard.jsx       ← Stats overview
    Projects.jsx        ← Project list
    ProjectDetail.jsx   ← Rooms + hotspots management
    TourPreview.jsx     ← Full-screen tour preview
    EmbedCode.jsx       ← Embed code generator page
  lib/
    supabase.js
    uploadPhoto.js      ← File upload helper
  App.jsx
  main.jsx
```

### 2.2 Login Page

```jsx
// src/pages/Login.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">TourPro360</h1>
        <p className="text-gray-400 mb-8">Admin Dashboard</p>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 2.3 Dashboard Home (Stats Page)

```jsx
// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Building2, Eye, HardDrive, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    liveProjects: 0,
    totalRooms: 0,
    draftProjects: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      const { data: projects } = await supabase.from('projects').select('id, is_live')
      const { data: rooms } = await supabase.from('rooms').select('id')

      setStats({
        totalProjects: projects?.length || 0,
        liveProjects: projects?.filter(p => p.is_live).length || 0,
        totalRooms: rooms?.length || 0,
        draftProjects: projects?.filter(p => !p.is_live).length || 0
      })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total Projects', value: stats.totalProjects, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-900/20' },
    { label: 'Live Tours', value: stats.liveProjects, icon: Eye, color: 'text-green-400', bg: 'bg-green-900/20' },
    { label: 'Total Rooms', value: stats.totalRooms, icon: HardDrive, color: 'text-purple-400', bg: 'bg-purple-900/20' },
    { label: 'Drafts', value: stats.draftProjects, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-900/20' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} border border-gray-800 rounded-xl p-5`}>
            <card.icon className={`${card.color} mb-3`} size={24} />
            <div className="text-3xl font-bold text-white">{card.value}</div>
            <div className="text-gray-400 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 2.4 Projects List Page

```jsx
// src/pages/Projects.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Code, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*, rooms(count)')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [])

  const toggleLive = async (project) => {
    await supabase
      .from('projects')
      .update({ is_live: !project.is_live })
      .eq('id', project.id)
    fetchProjects()
  }

  const deleteProject = async (id) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    await supabase.from('projects').delete().eq('id', id)
    fetchProjects()
  }

  const filtered = projects.filter(p =>
    p.client_name.toLowerCase().includes(search.toLowerCase()) ||
    p.building_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      <input
        placeholder="Search by client or building name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-6 focus:outline-none focus:border-orange-500"
      />

      {loading ? (
        <div className="text-gray-400">Loading projects...</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Client</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Building</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Type</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Status</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(project => (
                <tr key={project.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white font-medium">{project.client_name}</td>
                  <td className="px-4 py-3 text-gray-300">{project.building_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{project.building_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${project.is_live ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {project.is_live ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/projects/${project.id}`)} className="text-gray-400 hover:text-white" title="Edit">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => navigate(`/embed/${project.id}`)} className="text-gray-400 hover:text-blue-400" title="Embed Code">
                        <Code size={16} />
                      </button>
                      <button onClick={() => toggleLive(project)} className="text-gray-400 hover:text-green-400" title="Toggle Live">
                        {project.is_live ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button onClick={() => deleteProject(project.id)} className="text-gray-400 hover:text-red-400" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

### 2.5 Project Detail Page (Rooms + Hotspots)

Build a full Project Detail page at `/projects/:id` with these sections:

**Section A — Project Info Header**
- Show: Client Name, Building Name, City, Type, Status badge
- Edit button opens inline edit form
- "Preview Tour" button → opens `/preview/:id` in new tab
- "Get Embed Code" button → navigates to `/embed/:id`

**Section B — Rooms Manager**
```jsx
// Room card component
function RoomCard({ room, onDelete, onSetEntry, isEntry }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {room.photo_url ? (
        <img src={room.photo_url} alt={room.room_name} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-gray-700 flex items-center justify-center text-gray-500">
          No Photo
        </div>
      )}
      <div className="p-3">
        <div className="font-medium text-white text-sm">{room.room_name}</div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onSetEntry(room.id)}
            className={`text-xs px-2 py-1 rounded-full ${isEntry ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            {isEntry ? 'Entry Room' : 'Set Entry'}
          </button>
          <button onClick={() => onDelete(room.id)} className="text-xs text-red-400 hover:text-red-300">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Section C — Hotspot Connections**
```jsx
// HotspotForm component
function HotspotForm({ rooms, projectId, onSave }) {
  const [fromRoom, setFromRoom] = useState('')
  const [toRoom, setToRoom] = useState('')
  const [pitch, setPitch] = useState(0)
  const [yaw, setYaw] = useState(0)
  const [label, setLabel] = useState('')

  const handleSave = async () => {
    if (!fromRoom || !toRoom || fromRoom === toRoom) return

    await supabase.from('hotspots').insert({
      from_room_id: fromRoom,
      to_room_id: toRoom,
      pitch: parseFloat(pitch),
      yaw: parseFloat(yaw),
      label: label || `Go to ${rooms.find(r => r.id === toRoom)?.room_name}`
    })
    onSave()
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-4">Add Room Connection (Hotspot)</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">From Room</label>
          <select value={fromRoom} onChange={e => setFromRoom(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
            <option value="">Select room...</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">To Room</label>
          <select value={toRoom} onChange={e => setToRoom(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
            <option value="">Select room...</option>
            {rooms.filter(r => r.id !== fromRoom).map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Pitch (-90 to 90) — vertical arrow position</label>
          <input type="number" min="-90" max="90" value={pitch} onChange={e => setPitch(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Yaw (0 to 360) — horizontal direction</label>
          <input type="number" min="0" max="360" value={yaw} onChange={e => setYaw(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-gray-400 text-xs mb-1 block">Arrow Label (optional)</label>
        <input type="text" placeholder="e.g. Go to Kitchen" value={label} onChange={e => setLabel(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
      </div>
      <button onClick={handleSave}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
        Add Hotspot Connection
      </button>
    </div>
  )
}
```

### 2.6 Tour Preview Page

```jsx
// src/pages/TourPreview.jsx
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function TourPreview() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [rooms, setRooms] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const viewerRef = useRef(null)
  const pannellumRef = useRef(null)

  useEffect(() => {
    const loadProject = async () => {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
      const { data: roomData } = await supabase.from('rooms').select('*').eq('project_id', id).order('sort_order')
      const { data: hotspotData } = await supabase.from('hotspots').select('*')
        .in('from_room_id', roomData.map(r => r.id))

      setProject(proj)
      setRooms(roomData || [])
      setHotspots(hotspotData || [])

      const entry = roomData?.find(r => r.id === proj.entry_room_id) || roomData?.[0]
      setCurrentRoom(entry)
    }
    loadProject()
  }, [id])

  useEffect(() => {
    if (!currentRoom || !viewerRef.current) return

    // Load Pannellum dynamically
    if (!window.pannellum) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
      script.onload = () => initViewer()
      document.head.appendChild(script)

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
      document.head.appendChild(link)
    } else {
      initViewer()
    }
  }, [currentRoom])

  const initViewer = () => {
    if (pannellumRef.current) {
      pannellumRef.current.destroy()
    }

    const roomHotspots = hotspots
      .filter(h => h.from_room_id === currentRoom.id)
      .map(h => {
        const targetRoom = rooms.find(r => r.id === h.to_room_id)
        return {
          pitch: h.pitch,
          yaw: h.yaw,
          type: 'custom',
          text: h.label || `Go to ${targetRoom?.room_name}`,
          cssClass: 'tour-hotspot',
          clickHandlerFunc: () => setCurrentRoom(targetRoom)
        }
      })

    pannellumRef.current = window.pannellum.viewer(viewerRef.current, {
      type: 'equirectangular',
      panorama: currentRoom.photo_url,
      autoLoad: true,
      autoRotate: -2,
      compass: false,
      showFullscreenCtrl: true,
      showZoomCtrl: false,
      hotSpots: roomHotspots,
    })
  }

  return (
    <div className="h-screen bg-black flex">
      {/* Room List Sidebar */}
      <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="text-white font-semibold text-sm">{project?.building_name}</div>
          <div className="text-gray-400 text-xs">{project?.client_name}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setCurrentRoom(room)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                currentRoom?.id === room.id
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {room.room_name}
            </button>
          ))}
        </div>
      </div>

      {/* 360 Viewer */}
      <div className="flex-1 relative">
        <div ref={viewerRef} className="w-full h-full" />
        {currentRoom && (
          <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm">
            {currentRoom.room_name}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2.7 Embed Code Generator Page

```jsx
// src/pages/EmbedCode.jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Copy, Check } from 'lucide-react'

export default function EmbedCode() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    supabase.from('projects').select('*').eq('id', id).single()
      .then(({ data }) => setProject(data))
  }, [id])

  const TOUR_DOMAIN = 'https://tour.solodeveloper.pro'

  const iframeCode = project
    ? `<iframe\n  src="${TOUR_DOMAIN}/embed/${project.embed_token}"\n  width="100%"\n  height="600px"\n  frameborder="0"\n  allowfullscreen\n  style="border-radius:12px;"\n></iframe>`
    : ''

  const scriptCode = project
    ? `<div id="tourpro-container"\n  data-token="${project.embed_token}"\n  style="width:100%;height:600px;">\n</div>\n<script src="${TOUR_DOMAIN}/widget.js"></script>`
    : ''

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const CodeBlock = ({ code, copyKey, label }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <button
          onClick={() => copyToClipboard(code, copyKey)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied === copyKey ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied === copyKey ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm text-orange-300 font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-2">Embed Code</h1>
      {project && (
        <p className="text-gray-400 mb-6">
          {project.building_name} — {project.client_name}
        </p>
      )}

      {!project?.is_live && (
        <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-400 rounded-xl px-4 py-3 mb-6 text-sm">
          ⚠️ This tour is currently set to Draft. Go live from the project page before sharing this code.
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-white font-semibold mb-2">Option A — iframe (Recommended for WordPress / Wix)</h2>
          <CodeBlock code={iframeCode} copyKey="iframe" label="HTML" />
        </div>

        <div>
          <h2 className="text-white font-semibold mb-2">Option B — Script Tag (Best Performance)</h2>
          <CodeBlock code={scriptCode} copyKey="script" label="HTML" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-gray-300 font-medium mb-2 text-sm">How to add to client's website</h3>
          <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
            <li>Copy the code above (Option A is easiest)</li>
            <li>Go to client's website CMS (WordPress, Wix, or Hostinger)</li>
            <li>Add an HTML block / Custom Code section to the Projects page</li>
            <li>Paste the code and save</li>
            <li>Tour appears live immediately</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
```

---

## PART 3 — EMBED WIDGET (Vanilla JS Bundle)

### 3.1 Widget Architecture

This is a standalone Vite project that compiles to a single `widget.js` file. It reads the `data-token` attribute, fetches project data from Supabase, and renders Pannellum.js inside the container div.

```javascript
// widget/src/main.js
import pannellum from 'pannellum'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'

async function initTour() {
  const container = document.getElementById('tourpro-container')
  if (!container) return

  const token = container.dataset.token
  if (!token) {
    container.innerHTML = '<div style="color:#666;padding:20px;text-align:center">Tour token missing</div>'
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Fetch project by embed_token
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('embed_token', token)
    .eq('is_live', true)
    .single()

  if (error || !project) {
    container.innerHTML = '<div style="color:#666;padding:20px;text-align:center">Tour not available</div>'
    return
  }

  // Fetch rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')

  // Fetch hotspots for all rooms
  const roomIds = rooms.map(r => r.id)
  const { data: hotspots } = await supabase
    .from('hotspots')
    .select('*')
    .in('from_room_id', roomIds)

  const entryRoom = rooms.find(r => r.id === project.entry_room_id) || rooms[0]
  let currentViewer = null

  function loadRoom(room) {
    if (currentViewer) {
      currentViewer.destroy()
    }

    const roomHotspots = hotspots
      .filter(h => h.from_room_id === room.id)
      .map(h => {
        const targetRoom = rooms.find(r => r.id === h.to_room_id)
        return {
          pitch: h.pitch,
          yaw: h.yaw,
          type: 'scene',
          text: h.label || `Go to ${targetRoom?.room_name}`,
          sceneId: h.to_room_id,
          cssClass: 'tourpro-hotspot'
        }
      })

    currentViewer = pannellum.viewer(container, {
      type: 'equirectangular',
      panorama: room.photo_url,
      autoLoad: true,
      autoRotate: -2,
      showFullscreenCtrl: true,
      showZoomCtrl: false,
      hotSpots: roomHotspots,
      hotSpotDebug: false
    })

    // Handle hotspot clicks manually
    roomHotspots.forEach(hs => {
      currentViewer.on('click', () => {
        const targetRoom = rooms.find(r => r.id === hs.sceneId)
        if (targetRoom) loadRoom(targetRoom)
      })
    })

    // Update room label
    const label = container.querySelector('.tourpro-room-label')
    if (label) label.textContent = room.room_name
  }

  // Inject CSS for hotspot styling
  const style = document.createElement('style')
  style.textContent = `
    .tourpro-hotspot {
      width: 40px;
      height: 40px;
      background: rgba(234, 88, 12, 0.85);
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .tourpro-hotspot:hover { transform: scale(1.15); }
    .tourpro-hotspot::after {
      content: '→';
      color: white;
      font-size: 16px;
      font-weight: bold;
    }
    .tourpro-room-label {
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: rgba(0,0,0,0.65);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-family: sans-serif;
      font-size: 14px;
      pointer-events: none;
      backdrop-filter: blur(4px);
    }
    .tourpro-watermark {
      position: absolute;
      bottom: 16px;
      right: 16px;
      color: rgba(255,255,255,0.4);
      font-family: sans-serif;
      font-size: 11px;
      pointer-events: none;
    }
  `
  document.head.appendChild(style)

  // Set container to relative positioning
  container.style.position = 'relative'

  // Add room label overlay
  const label = document.createElement('div')
  label.className = 'tourpro-room-label'
  label.textContent = entryRoom.room_name
  container.appendChild(label)

  // Add watermark
  const watermark = document.createElement('div')
  watermark.className = 'tourpro-watermark'
  watermark.textContent = 'Powered by TourPro360'
  container.appendChild(watermark)

  loadRoom(entryRoom)
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTour)
} else {
  initTour()
}
```

---

## PART 4 — MOBILE CAPTURE APP (React + Capacitor)

### 4.1 Setup

```bash
# Create Capacitor React app
npm create vite@latest tourpro-mobile -- --template react
cd tourpro-mobile
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/camera @capacitor/filesystem @capacitor/preferences
npm install @supabase/supabase-js
npx cap init TourPro360 com.solodeveloper.tourpro
npx cap add android
```

### 4.2 Capacitor Config

```javascript
// capacitor.config.js
const config = {
  appId: 'com.solodeveloper.tourpro',
  appName: 'TourPro360',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    Camera: {
      saveToGallery: false
    }
  }
}
export default config
```

### 4.3 Mobile App Screens

**App.jsx — Router Setup**
```jsx
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
```

**NewProject.jsx — Create Project Form**
```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const BUILDING_TYPES = ['Residential', 'Commercial', 'Villa', 'Apartment', 'Plot']

export default function NewProject() {
  const [form, setForm] = useState({
    client_name: '',
    building_name: '',
    city: '',
    building_type: 'Residential'
  })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!form.client_name || !form.building_name) return
    setSaving(true)
    const { data, error } = await supabase
      .from('projects')
      .insert(form)
      .select()
      .single()
    if (!error) navigate(`/project/${data.id}/rooms`)
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <h1 className="text-xl font-bold text-white mb-6">New Project</h1>
      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Client Name *</label>
          <input
            placeholder="e.g. Rajan Builders"
            value={form.client_name}
            onChange={e => setForm({...form, client_name: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Building Name *</label>
          <input
            placeholder="e.g. Green Valley Villa"
            value={form.building_name}
            onChange={e => setForm({...form, building_name: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1 block">City</label>
          <input
            placeholder="e.g. Madurai"
            value={form.city}
            onChange={e => setForm({...form, city: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Building Type</label>
          <select
            value={form.building_type}
            onChange={e => setForm({...form, building_type: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
          >
            {BUILDING_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl"
        >
          {saving ? 'Creating...' : 'Create Project & Add Rooms →'}
        </button>
      </div>
    </div>
  )
}
```

**AddRoom.jsx — Photo Picker**
```jsx
import { useState } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

const ROOM_PRESETS = [
  'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Kitchen', 'Dining Room', 'Bathroom', 'Master Bathroom',
  'Balcony', 'Terrace', 'Parking', 'Pooja Room',
  'Study Room', 'Hall', 'Store Room', 'Entrance'
]

export default function AddRoom() {
  const { id: projectId } = useParams()
  const [roomName, setRoomName] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState(null)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const pickPhoto = async () => {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    })
    setPhotoDataUrl(image.dataUrl)
    // Convert dataUrl to blob for upload
    const res = await fetch(image.dataUrl)
    const blob = await res.blob()
    setPhotoBlob(blob)
  }

  const handleSave = async () => {
    if (!roomName || !photoBlob) return
    setSaving(true)

    // 1. Create room record first to get UUID
    const { data: room } = await supabase
      .from('rooms')
      .insert({ project_id: projectId, room_name: roomName })
      .select()
      .single()

    // 2. Upload photo to Supabase Storage
    const filePath = `tours/${projectId}/${room.id}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('tours')
      .upload(filePath, photoBlob, { contentType: 'image/jpeg', upsert: true })

    if (!uploadError) {
      // 3. Get public URL and update room record
      const { data: urlData } = supabase.storage.from('tours').getPublicUrl(filePath)
      await supabase.from('rooms').update({ photo_url: urlData.publicUrl }).eq('id', room.id)
    }

    setSaving(false)
    navigate(`/project/${projectId}/rooms`)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <h1 className="text-xl font-bold text-white mb-6">Add Room</h1>

      <div className="mb-4">
        <label className="text-gray-400 text-sm mb-2 block">Room Name</label>
        <input
          placeholder="e.g. Living Room"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mb-2"
        />
        <div className="flex flex-wrap gap-2">
          {ROOM_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setRoomName(preset)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                roomName === preset
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-2 block">360° Photo</label>
        {photoDataUrl ? (
          <div className="relative">
            <img src={photoDataUrl} alt="360 preview" className="w-full h-48 object-cover rounded-xl" />
            <button
              onClick={pickPhoto}
              className="absolute top-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              Change Photo
            </button>
          </div>
        ) : (
          <button
            onClick={pickPhoto}
            className="w-full h-48 bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-orange-500"
          >
            <span className="text-3xl mb-2">📷</span>
            <span className="text-sm">Tap to select 360° photo from gallery</span>
            <span className="text-xs mt-1 text-gray-500">(from Insta360 app)</span>
          </button>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!roomName || !photoBlob || saving}
        className="w-full bg-orange-500 disabled:opacity-40 text-white font-bold py-4 rounded-xl"
      >
        {saving ? 'Saving...' : 'Save Room'}
      </button>
    </div>
  )
}
```

**UploadProgress.jsx — Bulk Upload with Progress**
```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function UploadProgress() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [progress, setProgress] = useState({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    const loadAndValidate = async () => {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('project_id', projectId)

      const missing = roomData.filter(r => !r.photo_url)
      if (missing.length > 0) {
        alert(`${missing.length} room(s) have no photo. Please add photos first.`)
        navigate(`/project/${projectId}/rooms`)
        return
      }

      setRooms(roomData)
      setDone(true) // All rooms already uploaded individually in AddRoom
    }
    loadAndValidate()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <h1 className="text-xl font-bold text-white mb-6">Project Status</h1>
      {rooms.map(room => (
        <div key={room.id} className="flex items-center gap-3 mb-3 bg-gray-800 rounded-xl px-4 py-3">
          <span className="text-green-400 text-lg">✓</span>
          <span className="text-white">{room.room_name}</span>
        </div>
      ))}
      {done && (
        <button
          onClick={() => navigate('/')}
          className="w-full bg-green-500 text-white font-bold py-4 rounded-xl mt-4"
        >
          ✓ All rooms uploaded — Back to Projects
        </button>
      )}
    </div>
  )
}
```

---

## PART 5 — ROUTING & AUTH GUARD

```jsx
// src/App.jsx (Admin Dashboard)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import TourPreview from './pages/TourPreview'
import EmbedCode from './pages/EmbedCode'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/preview/:id" element={<TourPreview />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/embed/:id" element={<EmbedCode />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## PART 6 — LAYOUT COMPONENT (Admin Sidebar)

```jsx
// src/components/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Building2, LogOut } from 'lucide-react'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/projects', icon: Building2, label: 'Projects' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="text-orange-400 font-bold text-lg">TourPro360</div>
          <div className="text-gray-500 text-xs">solodeveloper.pro</div>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${
                  active ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

---

## PART 7 — PHOTO UPLOAD HELPER

```javascript
// src/lib/uploadPhoto.js
import { supabase } from './supabase'

export async function uploadRoomPhoto(projectId, roomId, file) {
  // Compress if over 8MB
  let uploadFile = file
  if (file.size > 8 * 1024 * 1024) {
    // Use browser-image-compression if installed
    try {
      const imageCompression = (await import('browser-image-compression')).default
      uploadFile = await imageCompression(file, {
        maxSizeMB: 7,
        maxWidthOrHeight: 5760,
        useWebWorker: true
      })
    } catch (e) {
      console.warn('Compression failed, uploading original', e)
    }
  }

  const filePath = `tours/${projectId}/${roomId}.jpg`
  const { error } = await supabase.storage
    .from('tours')
    .upload(filePath, uploadFile, {
      contentType: 'image/jpeg',
      upsert: true
    })

  if (error) throw error

  const { data } = supabase.storage.from('tours').getPublicUrl(filePath)
  return data.publicUrl
}
```

---

## DEPENDENCIES TO INSTALL

```bash
# Admin Dashboard
npm install @supabase/supabase-js react-router-dom lucide-react
npm install pannellum  # or load from CDN in TourPreview
npm install browser-image-compression

# Mobile App
npm install @supabase/supabase-js react-router-dom
npm install @capacitor/core @capacitor/camera @capacitor/filesystem @capacitor/preferences
```

---

## IMPORTANT NOTES FOR ANTIGRAVITY

1. **Color theme**: dark background `#030712` (gray-950), orange accent `#f97316` (orange-500), all UI dark mode only
2. **No form tags anywhere** — use div + onClick handlers only
3. **Pannellum.js** for 360° viewer — load from CDN `https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js`
4. **360° photos must be equirectangular** — the viewer will not work with normal camera photos
5. **Supabase Storage bucket** must be set to public for embed widget to work without auth token
6. **Mobile app** runs on Android via Capacitor — test with `npx cap run android`
7. **Embed widget** is a separate Vite build compiled to single `widget.js` — NOT part of the admin dashboard build
8. **Entry room** defaults to first room in sort_order if entry_room_id is null
9. **Hotspot pitch/yaw** — pitch 0 = eye level, yaw 0 = facing north. For doors, pitch typically -10 to 10, yaw depends on direction
10. **RLS must be enabled** before going live — anonymous users can only read projects where `is_live = true`

---

## BUILD ORDER (Follow This Sequence)

1. Set up Supabase project → run SQL schema → create storage bucket
2. Build Admin Dashboard login + project list + project detail
3. Build TourPreview page with Pannellum.js working
4. Build EmbedCode page
5. Build Embed Widget (separate Vite project)
6. Build Mobile Capture App (React + Capacitor)
7. Test full flow: create project → add rooms → add hotspots → preview → generate embed → paste on test page

Start with Step 1 and 2. Do not move to mobile app until the web dashboard and viewer are fully working.
