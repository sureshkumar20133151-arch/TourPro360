import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Trash2, Code } from 'lucide-react'

export default function HotspotEditor() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)

  // Hotspot Form state
  const [fromRoom, setFromRoom] = useState('')
  const [toRoom, setToRoom] = useState('')
  const [pitch, setPitch] = useState(0)
  const [yaw, setYaw] = useState(0)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const { data: roomData } = await supabase.from('rooms').select('*').eq('project_id', projectId).order('sort_order')
    const currentRooms = roomData || []
    setRooms(currentRooms)

    if (currentRooms.length > 0) {
      const { data: hotspotData } = await supabase
        .from('hotspots')
        .select('*')
        .in('from_room_id', currentRooms.map(r => r.id))
      setHotspots(hotspotData || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleAddHotspot = async () => {
    if (!fromRoom || !toRoom || fromRoom === toRoom) {
      alert('Please select valid From and To rooms.')
      return
    }
    setSaving(true)
    const toRoomName = rooms.find(r => r.id === toRoom)?.room_name
    const { error } = await supabase.from('hotspots').insert({
      from_room_id: fromRoom,
      to_room_id: toRoom,
      pitch: parseFloat(pitch) || 0,
      yaw: parseFloat(yaw) || 0,
      label: label || `Go to ${toRoomName}`
    })
    setSaving(false)
    if (!error) {
      setFromRoom('')
      setToRoom('')
      setPitch(0)
      setYaw(0)
      setLabel('')
      fetchData()
    } else {
      alert(error.message)
    }
  }

  const handleDeleteHotspot = async (hotspotId) => {
    if (!confirm('Delete this hotspot connection?')) return
    const { error } = await supabase.from('hotspots').delete().eq('id', hotspotId)
    if (!error) {
      fetchData()
    } else {
      alert(error.message)
    }
  }

  if (loading && rooms.length === 0) {
    return <div className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center text-sm">Loading project rooms...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(`/project/${projectId}/rooms`)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Rooms
      </button>

      <h1 className="text-xl font-bold text-white mb-6 font-display flex items-center gap-2">
        <Code className="text-orange-500" size={22} /> Hotspots Editor
      </h1>

      {rooms.length < 2 ? (
        <div className="border border-dashed border-gray-850 rounded-xl p-8 text-center text-gray-500 text-xs leading-relaxed">
          Staging room-to-room hotspots requires at least **2 rooms**. Please add more rooms first.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add Connection form (NO form tags) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <h3 className="text-white text-xs font-bold uppercase tracking-wider text-orange-400">Add Room Connection</h3>
            
            <div>
              <label className="text-gray-400 text-xs mb-1 block">From Room (Source)</label>
              <select
                value={fromRoom}
                onChange={e => setFromRoom(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="">Select room...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">To Room (Destination)</label>
              <select
                value={toRoom}
                onChange={e => setToRoom(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                disabled={!fromRoom}
              >
                <option value="">Select room...</option>
                {rooms.filter(r => r.id !== fromRoom).map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Pitch (-90 to 90)</label>
                <input
                  type="number"
                  min="-90"
                  max="90"
                  value={pitch}
                  onChange={e => setPitch(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Yaw (0 to 360)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={yaw}
                  onChange={e => setYaw(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Tooltip Label</label>
              <input
                type="text"
                placeholder="e.g. Go to Kitchen"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              onClick={handleAddHotspot}
              disabled={saving || !fromRoom || !toRoom}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-3 rounded-lg text-xs transition-colors cursor-pointer"
            >
              {saving ? 'Adding Connection...' : 'Add Connection'}
            </button>
          </div>

          {/* List of existing hotspots */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Staged Connections ({hotspots.length})</h3>
            {hotspots.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-6 border border-gray-850 rounded-xl">
                No connections defined yet.
              </div>
            ) : (
              <div className="space-y-2">
                {hotspots.map(h => {
                  const fromName = rooms.find(r => r.id === h.from_room_id)?.room_name || 'Unknown'
                  const toName = rooms.find(r => r.id === h.to_room_id)?.room_name || 'Unknown'
                  return (
                    <div key={h.id} className="bg-gray-900 border border-gray-850 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-white font-medium flex items-center gap-1">
                          <span className="text-orange-400">{fromName}</span>
                          <span className="text-gray-650">➔</span>
                          <span className="text-green-400">{toName}</span>
                        </div>
                        <div className="text-gray-500 text-[10px] font-mono mt-0.5">
                          pitch: {h.pitch}° | yaw: {h.yaw}°
                        </div>
                        {h.label && <div className="text-gray-400 italic text-[10px] mt-0.5">"{h.label}"</div>}
                      </div>
                      <button
                        onClick={() => handleDeleteHotspot(h.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
