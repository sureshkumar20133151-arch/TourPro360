import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { uploadRoomPhoto } from '../lib/uploadPhoto'
import { Building2, Eye, Code, Trash2, ArrowLeft, Plus, Image, Star, Edit, Save, X } from 'lucide-react'

const BUILDING_TYPES = ['Residential', 'Commercial', 'Villa', 'Apartment', 'Plot']
const ROOM_PRESETS = [
  'Living Room', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Kitchen', 'Dining Room', 'Bathroom', 'Master Bathroom',
  'Balcony', 'Terrace', 'Parking', 'Pooja Room',
  'Study Room', 'Hall', 'Store Room', 'Entrance'
]

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [rooms, setRooms] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)

  // Edit Project Metadata state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [metadataForm, setMetadataForm] = useState({
    client_name: '',
    building_name: '',
    city: '',
    building_type: 'Residential'
  })

  // Add Room state
  const [showAddRoomModal, setShowAddRoomModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomFile, setNewRoomFile] = useState(null)
  const [uploadingRoom, setUploadingRoom] = useState(false)

  // Hotspot Form state
  const [fromRoom, setFromRoom] = useState('')
  const [toRoom, setToRoom] = useState('')
  const [pitch, setPitch] = useState(0)
  const [yaw, setYaw] = useState(0)
  const [hotspotLabel, setHotspotLabel] = useState('')
  const [addingHotspot, setAddingHotspot] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    // Fetch project
    const { data: proj, error: projErr } = await supabase.from('projects').select('*').eq('id', id).single()
    if (projErr || !proj) {
      alert('Project not found!')
      navigate('/projects')
      return
    }
    setProject(proj)
    setMetadataForm({
      client_name: proj.client_name,
      building_name: proj.building_name,
      city: proj.city || '',
      building_type: proj.building_type
    })

    // Fetch rooms
    const { data: roomData } = await supabase.from('rooms').select('*').eq('project_id', id).order('sort_order')
    const currentRooms = roomData || []
    setRooms(currentRooms)

    // Fetch hotspots
    if (currentRooms.length > 0) {
      const { data: hotspotData } = await supabase
        .from('hotspots')
        .select('*')
        .in('from_room_id', currentRooms.map(r => r.id))
      setHotspots(hotspotData || [])
    } else {
      setHotspots([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleSaveMetadata = async () => {
    const { error } = await supabase
      .from('projects')
      .update(metadataForm)
      .eq('id', id)
    if (!error) {
      setIsEditingMetadata(false)
      fetchData()
    } else {
      alert(error.message)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm('Are you absolutely sure you want to delete this project and all its rooms/hotspots? This cannot be undone.')) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) {
      navigate('/projects')
    } else {
      alert(error.message)
    }
  }

  const handleAddRoom = async () => {
    if (!newRoomName || !newRoomFile) {
      alert('Room name and 360° image file are required.')
      return
    }
    setUploadingRoom(true)
    try {
      // 1. Insert room to database to get ID
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          project_id: id,
          room_name: newRoomName,
          sort_order: rooms.length
        })
        .select()
        .single()

      if (roomErr || !room) throw roomErr || new Error('Could not create room row')

      // 2. Upload photo to bucket
      const photoUrl = await uploadRoomPhoto(id, room.id, newRoomFile)

      // 3. Update room with photo url
      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ photo_url: photoUrl })
        .eq('id', room.id)

      if (updateErr) throw updateErr

      // Reset state and refresh
      setNewRoomName('')
      setNewRoomFile(null)
      setShowAddRoomModal(false)
      fetchData()
    } catch (err) {
      alert('Error uploading room: ' + err.message)
    } finally {
      setUploadingRoom(false)
    }
  }

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Delete this room? This will also remove any hotspots connected to it.')) return
    const { error } = await supabase.from('rooms').delete().eq('id', roomId)
    if (!error) {
      fetchData()
    } else {
      alert(error.message)
    }
  }

  const handleUpdateRoomPhoto = async (roomId, file) => {
    if (!file) return
    setLoading(true)
    try {
      const photoUrl = await uploadRoomPhoto(id, roomId, file)
      const { error: updateErr } = await supabase
        .from('rooms')
        .update({ photo_url: photoUrl })
        .eq('id', roomId)

      if (updateErr) throw updateErr
      fetchData()
    } catch (err) {
      alert('Error updating room photo: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoomPhoto = async (room) => {
    if (!confirm(`Delete the 360 photo for "${room.room_name}"? The room itself will not be deleted.`)) return
    try {
      const filePath = `tours/${id}/${room.id}.jpg`
      const { error: storageErr } = await supabase.storage.from('tours').remove([filePath])
      if (storageErr) console.warn('Could not delete file from storage', storageErr)

      const { error: dbErr } = await supabase
        .from('rooms')
        .update({ photo_url: null })
        .eq('id', room.id)

      if (dbErr) throw dbErr

      fetchData()
    } catch (err) {
      alert('Error deleting photo: ' + err.message)
    }
  }

  const handleRenameRoom = async (room) => {
    const newName = prompt(`Enter new name for "${room.room_name}":`, room.room_name)
    if (!newName || newName.trim() === '' || newName === room.room_name) return
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ room_name: newName.trim() })
        .eq('id', room.id)

      if (error) throw error
      fetchData()
    } catch (err) {
      alert('Error renaming room: ' + err.message)
    }
  }

  const handleSetEntryRoom = async (roomId) => {
    const { error } = await supabase
      .from('projects')
      .update({ entry_room_id: roomId })
      .eq('id', id)
    if (!error) {
      fetchData()
    } else {
      alert(error.message)
    }
  }

  const handleAddHotspot = async () => {
    if (!fromRoom || !toRoom || fromRoom === toRoom) {
      alert('Please select valid From and To rooms.')
      return
    }
    setAddingHotspot(true)
    const toRoomName = rooms.find(r => r.id === toRoom)?.room_name
    const { error } = await supabase.from('hotspots').insert({
      from_room_id: fromRoom,
      to_room_id: toRoom,
      pitch: parseFloat(pitch) || 0,
      yaw: parseFloat(yaw) || 0,
      label: hotspotLabel || `Go to ${toRoomName}`
    })
    setAddingHotspot(false)
    if (!error) {
      setFromRoom('')
      setToRoom('')
      setPitch(0)
      setYaw(0)
      setHotspotLabel('')
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

  if (loading && !project) {
    return <div className="p-8 text-gray-400">Loading project details...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto pb-16">
      {/* Back link */}
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Projects
      </button>

      {/* Section A - Project Info Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
        {isEditingMetadata ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Edit Project Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block font-medium">Client Name</label>
                <input
                  type="text"
                  value={metadataForm.client_name}
                  onChange={e => setMetadataForm({ ...metadataForm, client_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block font-medium">Building Name</label>
                <input
                  type="text"
                  value={metadataForm.building_name}
                  onChange={e => setMetadataForm({ ...metadataForm, building_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block font-medium">City</label>
                <input
                  type="text"
                  value={metadataForm.city}
                  onChange={e => setMetadataForm({ ...metadataForm, city: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block font-medium">Building Type</label>
                <select
                  value={metadataForm.building_type}
                  onChange={e => setMetadataForm({ ...metadataForm, building_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-750 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
                >
                  {BUILDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setIsEditingMetadata(false)}
                className="bg-gray-800 hover:bg-gray-750 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMetadata}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white font-display">{project.building_name}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${project.is_live ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-gray-800 text-gray-400 border border-gray-750'}`}>
                  {project.is_live ? 'Live' : 'Draft'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-950/40 text-orange-400 border border-orange-900/30">
                  {project.building_type}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">Client: <span className="text-gray-300 font-medium">{project.client_name}</span> | City: <span className="text-gray-300 font-medium">{project.city || 'N/A'}</span></p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsEditingMetadata(true)}
                className="bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit size={16} /> Edit Info
              </button>
              <button
                onClick={() => navigate(`/preview/${id}`)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye size={16} /> Preview Tour
              </button>
              <button
                onClick={() => navigate(`/embed/${id}`)}
                className="bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Code size={16} /> Embed Code
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section B - Rooms Manager (2 cols on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
                <Building2 size={20} className="text-orange-400" /> Rooms Manager ({rooms.length})
              </h2>
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Room
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                <Image size={40} className="mb-2 text-gray-650" />
                <p className="text-sm">No rooms added yet.</p>
                <p className="text-xs text-gray-600 mt-1">Click Add Room or upload via the mobile app.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rooms.map(room => {
                  const isEntry = project.entry_room_id === room.id
                  return (
                    <div key={room.id} className="bg-gray-800/50 border border-gray-750 rounded-xl overflow-hidden hover:border-gray-700 transition-all flex flex-col justify-between">
                      <div className="relative h-36 bg-black group border-b border-gray-750/50">
                        {room.photo_url ? (
                          <img src={room.photo_url} alt={room.room_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center text-gray-650">
                            <Image size={24} className="mb-1" />
                            <span className="text-xs">No 360° Photo uploaded</span>
                          </div>
                        )}
                        {isEntry && room.photo_url && (
                          <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5 z-10">
                            <Star size={10} fill="white" /> Entry Room
                          </div>
                        )}
                        
                        {/* 360 Photo Edit & Delete Options */}
                        <div className="absolute top-2 right-2 flex gap-1 bg-black/75 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <label
                            htmlFor={`update-photo-${room.id}`}
                            className="text-gray-400 hover:text-white cursor-pointer p-1 rounded hover:bg-gray-800 transition-colors block"
                            title="Update 360 Photo"
                          >
                            <Edit size={14} />
                          </label>
                          <input
                            type="file"
                            accept="image/jpeg"
                            id={`update-photo-${room.id}`}
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleUpdateRoomPhoto(room.id, file)
                            }}
                          />
                          {room.photo_url && (
                            <button
                              onClick={() => handleDeleteRoomPhoto(room)}
                              className="text-gray-400 hover:text-red-400 cursor-pointer p-1 rounded hover:bg-gray-800 transition-colors"
                              title="Delete 360 Photo"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="font-semibold text-white text-sm truncate flex items-center justify-between gap-2">
                          <span className="truncate" title={room.room_name}>{room.room_name}</span>
                          <button
                            onClick={() => handleRenameRoom(room)}
                            className="text-gray-400 hover:text-white cursor-pointer transition-colors p-1"
                            title="Rename Room"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={() => handleSetEntryRoom(room.id)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer flex-1 text-center ${isEntry ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-gray-750 hover:bg-gray-700 text-gray-300'}`}
                            disabled={isEntry || !room.photo_url}
                            title={!room.photo_url ? "Must upload a 360 photo first" : ""}
                          >
                            {isEntry ? 'Default Entry' : 'Set as Entry'}
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 text-red-400 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Delete Room
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section C - Hotspots and connections manager (1 col) */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-display">
              <Code size={20} className="text-orange-400" /> Hotspot Connections
            </h2>

            {/* Hotspot Form (NO form tags) */}
            <div className="space-y-4 bg-gray-850 p-4 border border-gray-800 rounded-xl mb-6">
              <h3 className="text-white text-sm font-semibold mb-2">Add Connection Arrow</h3>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">From Room (Source)</label>
                <select
                  value={fromRoom}
                  onChange={e => setFromRoom(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
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
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                  disabled={!fromRoom}
                >
                  <option value="">Select room...</option>
                  {rooms.filter(r => r.id !== fromRoom).map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" title="Vertical position of arrow (-90 to 90)">Pitch (-90 to 90)</label>
                  <input
                    type="number"
                    min="-90"
                    max="90"
                    value={pitch}
                    onChange={e => setPitch(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block" title="Horizontal direction (0 to 360)">Yaw (0 to 360)</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={yaw}
                    onChange={e => setYaw(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Label / Tooltip text</label>
                <input
                  type="text"
                  placeholder="e.g. Go to Kitchen"
                  value={hotspotLabel}
                  onChange={e => setHotspotLabel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-550 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={handleAddHotspot}
                disabled={addingHotspot || !fromRoom || !toRoom}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                {addingHotspot ? 'Adding...' : 'Add Connection'}
              </button>
            </div>

            {/* Hotspots List */}
            <div className="space-y-3">
              <h3 className="text-white text-sm font-semibold">Active Connections ({hotspots.length})</h3>
              {hotspots.length === 0 ? (
                <div className="text-center text-xs text-gray-550 py-4 border border-gray-800 rounded-xl">
                  No hotspot connections defined yet.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {hotspots.map(h => {
                    const fromName = rooms.find(r => r.id === h.from_room_id)?.room_name || 'Unknown'
                    const toName = rooms.find(r => r.id === h.to_room_id)?.room_name || 'Unknown'
                    return (
                      <div key={h.id} className="bg-gray-800/35 border border-gray-800/80 rounded-xl p-3 flex items-center justify-between text-xs hover:border-gray-750 transition-colors">
                        <div className="space-y-1">
                          <div className="text-white font-medium flex items-center gap-1.5 flex-wrap">
                            <span className="text-orange-400">{fromName}</span>
                            <span className="text-gray-500">➔</span>
                            <span className="text-green-400">{toName}</span>
                          </div>
                          <div className="text-gray-400 font-mono text-[10px]">
                            pitch: {h.pitch}° | yaw: {h.yaw}°
                          </div>
                          {h.label && (
                            <div className="text-gray-400 italic">
                              "{h.label}"
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteHotspot(h.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer p-1"
                          title="Delete Connection"
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

          {/* Danger zone delete project */}
          <div className="bg-red-950/10 border border-red-900/35 rounded-2xl p-6">
            <h3 className="text-red-400 font-semibold text-sm font-display mb-2">Danger Zone</h3>
            <p className="text-xs text-gray-400 mb-4">Deleting this project will permanently remove the project metadata, all room images, and hotspots. This cannot be undone.</p>
            <button
              onClick={handleDeleteProject}
              className="w-full bg-red-900/40 hover:bg-red-900/70 border border-red-700/40 text-red-400 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Delete Entire Project
            </button>
          </div>
        </div>
      </div>

      {/* Add Room Modal (NO form tags) */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowAddRoomModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 font-display">Add Room</h2>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block font-medium">Room Name</label>
                <input
                  type="text"
                  placeholder="e.g. Living Room"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm mb-3"
                />
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-850 border border-gray-800 rounded-lg">
                  {ROOM_PRESETS.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setNewRoomName(preset)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                        newRoomName === preset
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-gray-750 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block font-medium">360° Photo File *</label>
                <input
                  type="file"
                  accept="image/jpeg"
                  onChange={e => setNewRoomFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-white file:cursor-pointer hover:file:bg-gray-750"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">Image must be a 2:1 equirectangular JPEG panoramic image.</span>
              </div>

              <button
                onClick={handleAddRoom}
                disabled={uploadingRoom || !newRoomName || !newRoomFile}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 mt-4 transition-colors cursor-pointer"
              >
                {uploadingRoom ? 'Uploading & Creating...' : 'Upload & Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
