import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, Image, Star, Edit, Trash2, ShieldAlert } from 'lucide-react'

export default function RoomManager() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single()
    if (!proj) {
      alert('Project not found!')
      navigate('/')
      return
    }
    setProject(proj)

    const { data: roomData } = await supabase.from('rooms').select('*').eq('project_id', projectId).order('sort_order')
    setRooms(roomData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Are you sure you want to delete this room? This will also remove any hotspots connected to it.')) return
    const { error } = await supabase.from('rooms').delete().eq('id', roomId)
    if (!error) {
      fetchData()
    } else {
      alert(error.message)
    }
  }

  const handleSetEntryRoom = async (roomId) => {
    const { error } = await supabase
      .from('projects')
      .update({ entry_room_id: roomId })
      .eq('id', projectId)
    if (!error) {
      fetchData()
    } else {
      alert(error.message)
    }
  }

  if (loading && !project) {
    return <div className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center text-sm">Loading rooms data...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24">
      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Projects
      </button>

      {/* Project Info Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-lg font-bold text-white font-display truncate">{project?.building_name}</h2>
        <p className="text-gray-400 text-xs mt-0.5 truncate">{project?.client_name}</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => navigate(`/project/${projectId}/hotspots`)}
            className="flex-1 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            Hotspots Editor
          </button>
          <button
            onClick={() => navigate(`/project/${projectId}/upload`)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            Verify & Finish
          </button>
        </div>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Rooms ({rooms.length})</h3>
        <button
          onClick={() => navigate(`/project/${projectId}/add-room`)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus size={14} /> Add Room
        </button>
      </div>

      {/* Rooms grid */}
      {rooms.length === 0 ? (
        <div className="border border-dashed border-gray-850 rounded-xl p-12 text-center text-gray-500 flex flex-col items-center justify-center">
          <Image size={32} className="mb-2 text-gray-650" />
          <p className="text-xs">No rooms added to this project yet.</p>
          <p className="text-[10px] text-gray-600 mt-1">Tap Add Room above to start capturing.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map(room => {
            const isEntry = project.entry_room_id === room.id
            return (
              <div key={room.id} className="bg-gray-900 border border-gray-850 rounded-xl overflow-hidden flex">
                <div className="w-24 h-24 shrink-0 bg-black relative">
                  {room.photo_url ? (
                    <img src={room.photo_url} alt={room.room_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Image size={18} />
                    </div>
                  )}
                  {isEntry && (
                    <div className="absolute top-1 left-1 bg-orange-500 text-white p-0.5 rounded-full" title="Entry Room">
                      <Star size={10} fill="white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div className="font-bold text-white text-sm truncate">{room.room_name}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSetEntryRoom(room.id)}
                      className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer flex-1 text-center ${isEntry ? 'bg-orange-500/20 text-orange-400 border border-orange-500/25' : 'bg-gray-800 text-gray-400 hover:bg-gray-750'}`}
                      disabled={isEntry}
                    >
                      {isEntry ? 'Default Entry' : 'Set Entry'}
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="bg-red-950/20 border border-red-900/20 text-red-400 p-1.5 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
