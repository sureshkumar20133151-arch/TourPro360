import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Maximize2, ShieldAlert } from 'lucide-react'

export default function TourPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [rooms, setRooms] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const viewerRef = useRef(null)
  const pannellumRef = useRef(null)

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true)
      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
      if (!proj) {
        alert('Project not found!')
        navigate('/projects')
        return
      }
      const { data: roomData } = await supabase.from('rooms').select('*').eq('project_id', id).order('sort_order')
      const currentRooms = roomData || []

      let hotspotData = []
      if (currentRooms.length > 0) {
        const { data } = await supabase.from('hotspots').select('*').in('from_room_id', currentRooms.map(r => r.id))
        hotspotData = data || []
      }

      setProject(proj)
      setRooms(currentRooms)
      setHotspots(hotspotData)

      const entry = currentRooms.find(r => r.id === proj.entry_room_id) || currentRooms[0]
      setCurrentRoom(entry)
      setLoading(false)
    }
    loadProject()
  }, [id])

  useEffect(() => {
    if (!currentRoom || !viewerRef.current) return

    // Load Pannellum dynamically if not loaded
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

    return () => {
      if (pannellumRef.current) {
        pannellumRef.current.destroy()
        pannellumRef.current = null
      }
    }
  }, [currentRoom])

  const initViewer = () => {
    if (pannellumRef.current) {
      pannellumRef.current.destroy()
      pannellumRef.current = null
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

    if (viewerRef.current && window.pannellum) {
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
  }

  if (loading) {
    return <div className="h-screen bg-black flex items-center justify-center text-gray-400">Loading virtual tour preview...</div>
  }

  return (
    <div className="h-screen bg-black flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col h-48 md:h-full z-10">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-sm truncate max-w-[150px] md:max-w-none">{project?.building_name}</div>
            <div className="text-gray-400 text-xs truncate max-w-[150px] md:max-w-none">{project?.client_name}</div>
          </div>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="text-gray-400 hover:text-white p-1 transition-colors cursor-pointer"
            title="Back to Editor"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold px-2 mb-2">Select Room</div>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setCurrentRoom(room)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer block truncate ${
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

      {/* 360 Viewer Canvas */}
      <div className="flex-1 relative h-full">
        {currentRoom?.photo_url ? (
          <div ref={viewerRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950 p-6">
            <ShieldAlert size={40} className="text-gray-650 mb-2" />
            <p className="text-sm">No 360° photo has been uploaded for this room.</p>
            <p className="text-xs text-gray-650 mt-1">Please add an image file in the Projects editor.</p>
          </div>
        )}
        {currentRoom && (
          <div className="absolute bottom-4 left-4 bg-black/75 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-sm border border-gray-800 select-none pointer-events-none">
            {currentRoom.room_name}
          </div>
        )}
      </div>
    </div>
  )
}
