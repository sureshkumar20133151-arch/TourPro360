import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function UploadProgress() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const loadAndValidate = async () => {
      setLoading(true)
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('project_id', projectId)

      if (!roomData || roomData.length === 0) {
        alert('No rooms found for this project. Please add rooms first.')
        navigate(`/project/${projectId}/rooms`)
        return
      }

      const missing = roomData.filter(r => !r.photo_url)
      if (missing.length > 0) {
        alert(`${missing.length} room(s) are missing photos. Please upload them before finishing.`)
        navigate(`/project/${projectId}/rooms`)
        return
      }

      setRooms(roomData)
      setDone(true) // All rooms uploaded successfully via individual AddRoom pages
      setLoading(false)
    }
    loadAndValidate()
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center text-sm">
        Validating project status...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-12 flex flex-col justify-between">
      <div>
        <h1 className="text-xl font-bold text-white mb-6 font-display">Project Status</h1>
        
        <div className="space-y-3">
          {rooms.map(room => (
            <div key={room.id} className="flex items-center gap-3 bg-gray-900 border border-gray-850 rounded-xl px-4 py-3">
              <span className="text-green-500 font-bold text-lg">✓</span>
              <div className="flex-1">
                <span className="text-white text-sm font-semibold">{room.room_name}</span>
                <p className="text-[10px] text-gray-500 truncate">{room.photo_url}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {done && (
        <button
          onClick={() => navigate('/')}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl mt-6 transition-colors cursor-pointer text-sm"
        >
          ✓ All Staged - Back to Projects
        </button>
      )}
    </div>
  )
}
