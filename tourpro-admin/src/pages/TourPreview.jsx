import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Maximize2, ShieldAlert, MapPin, X, Info, HelpCircle, Plus } from 'lucide-react'

export default function TourPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [rooms, setRooms] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedFloors, setExpandedFloors] = useState({
    'Ground Floor': true,
    'First Floor': true,
    'Third Floor': true,
    'Other': true
  })
  const viewerRef = useRef(null)
  const pannellumRef = useRef(null)

  const [isVisualHotspotMode, setIsVisualHotspotMode] = useState(false)
  const [showAddVisualHotspotModal, setShowAddVisualHotspotModal] = useState(false)
  const [newHotspotCoords, setNewHotspotCoords] = useState({ pitch: 0, yaw: 0 })
  const [visualHotspotForm, setVisualHotspotForm] = useState({ type: 'scene', label: '', toRoom: '', infoText: '' })
  const [infoPopupContent, setInfoPopupContent] = useState(null)
  const [showMinimap, setShowMinimap] = useState(false)
  const [previewMode, setPreviewMode] = useState('tour') // 'tour' or 'walkthrough'

  const isVisualHotspotModeRef = useRef(isVisualHotspotMode)
  useEffect(() => {
    isVisualHotspotModeRef.current = isVisualHotspotMode
  }, [isVisualHotspotMode])

  const mouseDownPos = useRef({ x: 0, y: 0 })
  const handleViewerMouseDown = (e) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleViewerMouseUp = (e) => {
    if (!isVisualHotspotModeRef.current || !pannellumRef.current) return
    const deltaX = Math.abs(e.clientX - mouseDownPos.current.x)
    const deltaY = Math.abs(e.clientY - mouseDownPos.current.y)
    if (deltaX < 5 && deltaY < 5) {
      const coords = pannellumRef.current.mouseEventToCoords(e)
      if (coords) {
        const [clickedPitch, clickedYaw] = coords
        setNewHotspotCoords({ pitch: parseFloat(clickedPitch.toFixed(2)), yaw: parseFloat(clickedYaw.toFixed(2)) })
        const firstOtherRoom = rooms.find(r => r.id !== currentRoom.id)?.id || ''
        setVisualHotspotForm({ type: 'scene', label: '', toRoom: firstOtherRoom, infoText: '' })
        setShowAddVisualHotspotModal(true)
      }
    }
  }

  const handleSaveVisualHotspot = async () => {
    const insertData = {
      from_room_id: currentRoom.id,
      pitch: newHotspotCoords.pitch,
      yaw: newHotspotCoords.yaw,
      type: visualHotspotForm.type,
      label: visualHotspotForm.label || (visualHotspotForm.type === 'scene' ? `Go to ${rooms.find(r => r.id === visualHotspotForm.toRoom)?.room_name}` : 'Info')
    }
    
    if (visualHotspotForm.type === 'scene') {
      insertData.to_room_id = visualHotspotForm.toRoom
      insertData.info_text = null
    } else {
      insertData.to_room_id = null
      insertData.info_text = visualHotspotForm.infoText.trim()
    }

    const { error } = await supabase.from('hotspots').insert(insertData)
    if (!error) {
      setShowAddVisualHotspotModal(false)
      const { data } = await supabase.from('hotspots').select('*').in('from_room_id', rooms.map(r => r.id))
      setHotspots(data || [])
    } else {
      alert(error.message)
    }
  }

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

      const has360 = currentRooms.some(r => r.photo_url)
      const hasWalk = !!proj?.walkthrough_url
      if (hasWalk && !has360) {
        setPreviewMode('walkthrough')
      } else {
        setPreviewMode('tour')
      }

      const entry = currentRooms.find(r => r.id === proj.entry_room_id) || currentRooms[0]
      setCurrentRoom(entry)
      setLoading(false)
    }
    loadProject()
  }, [id])

  useEffect(() => {
    if (currentRoom) {
      let floor = 'Other'
      if (currentRoom.room_name.includes(' - ')) {
        floor = currentRoom.room_name.split(' - ')[0]
      } else if (currentRoom.room_name.includes('Ground Floor')) {
        floor = 'Ground Floor'
      } else if (currentRoom.room_name.includes('First Floor')) {
        floor = 'First Floor'
      }
      setExpandedFloors(prev => ({ ...prev, [floor]: true }))
    }
  }, [currentRoom])

  useEffect(() => {
    if (previewMode === 'walkthrough' || !currentRoom || !viewerRef.current) return

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
}, [currentRoom, hotspots, isVisualHotspotMode])

  const initViewer = () => {
    if (pannellumRef.current) {
      pannellumRef.current.destroy()
      pannellumRef.current = null
    }

    const roomHotspots = hotspots
      .filter(h => h.from_room_id === currentRoom.id)
      .map(h => {
        if (h.type === 'info') {
          return {
            pitch: h.pitch,
            yaw: h.yaw,
            type: 'custom',
            text: h.label || 'Info',
            cssClass: 'tour-info-hotspot',
            clickHandlerFunc: () => setInfoPopupContent(h.info_text)
          }
        } else {
          const targetRoom = rooms.find(r => r.id === h.to_room_id)
          return {
            pitch: h.pitch,
            yaw: h.yaw,
            type: 'custom',
            text: h.label || `Go to ${targetRoom?.room_name}`,
            cssClass: 'tour-hotspot',
            clickHandlerFunc: () => {
              if (targetRoom) setCurrentRoom(targetRoom)
            }
          }
        }
      })

    const autoRotateSpeed = project?.auto_rotate ? (project?.auto_rotate_speed ?? -2.0) : 0
    const showCompass = project?.show_compass ?? false

    if (viewerRef.current && window.pannellum) {
      const viewer = window.pannellum.viewer(viewerRef.current, {
        type: 'equirectangular',
        panorama: currentRoom.photo_url,
        autoLoad: true,
        autoRotate: isVisualHotspotMode ? 0 : autoRotateSpeed,
        compass: showCompass,
        showFullscreenCtrl: true,
        showZoomCtrl: false,
        hotSpots: roomHotspots,
      })
      pannellumRef.current = viewer

      const canvasEl = viewerRef.current.querySelector('.pnlm-render-container')
      if (canvasEl) {
        canvasEl.addEventListener('mousedown', handleViewerMouseDown)
        canvasEl.addEventListener('mouseup', handleViewerMouseUp)
      }
    }
  }

  if (loading) {
    return <div className="h-screen bg-black flex items-center justify-center text-gray-400">Loading virtual tour preview...</div>
  }

  // Group rooms by floor
  const groupedRooms = {}
  rooms.forEach(room => {
    if (room.room_name.includes('(Corner)') || room.room_name.includes('(End)')) {
      return
    }
    let floor = 'Other'
    let displayName = room.room_name
    
    if (room.room_name.includes(' - ')) {
      const parts = room.room_name.split(' - ')
      floor = parts[0]
      displayName = parts[1]
    } else if (room.room_name.includes('Ground Floor')) {
      floor = 'Ground Floor'
    } else if (room.room_name.includes('First Floor')) {
      floor = 'First Floor'
    }
    
    if (!groupedRooms[floor]) {
      groupedRooms[floor] = []
      if (expandedFloors[floor] === undefined) {
        expandedFloors[floor] = true
      }
    }
    groupedRooms[floor].push({ ...room, displayName })
  })

  const floorOrder = ['Ground Floor', 'First Floor', 'Third Floor', 'Other']
  const uniqueFloors = Object.keys(groupedRooms)
  const sortedFloors = uniqueFloors.sort((a, b) => {
    let idxA = floorOrder.indexOf(a)
    let idxB = floorOrder.indexOf(b)
    if (idxA === -1) idxA = 999
    if (idxB === -1) idxB = 999
    return idxA - idxB
  }).filter(f => groupedRooms[f].length > 0)

  return (
    <div className="h-screen bg-black flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col h-auto md:h-full z-10">
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

        {/* Visual Hotspot Editor Toggle - Hidden in Walkthrough */}
        {previewMode === 'tour' ? (
          <div className="p-3 border-b border-gray-800/80 bg-gray-950/20">
            <button
              onClick={() => setIsVisualHotspotMode(!isVisualHotspotMode)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                isVisualHotspotMode
                  ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 animate-pulse'
                  : 'bg-gray-800 border-gray-750 text-gray-300 hover:bg-gray-750 hover:text-white'
              }`}
            >
              <span>{isVisualHotspotMode ? 'Stop Visual Editing' : 'Add Hotspots Visually'}</span>
            </button>
            {isVisualHotspotMode && (
              <p className="text-[10px] text-orange-400 mt-2 text-center leading-normal">
                Click anywhere on the 360° screen to place a new hotspot at that point.
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 border-b border-gray-800 bg-gray-950/30 text-center">
            <span className="text-[11px] text-orange-400 font-medium">3D Walkthrough Mode Active</span>
            <p className="text-[10px] text-gray-500 mt-1">Navigate using keyboard / mouse controls inside the viewer canvas.</p>
          </div>
        )}

        {/* Mobile Room Selector Dropdown */}
        {previewMode === 'tour' && (
          <div className="block md:hidden px-3 pb-3 pt-3">
            <div className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Select Room</div>
            <select
              value={currentRoom?.id || ''}
              onChange={(e) => {
                const room = rooms.find(r => r.id === e.target.value);
                if (room) setCurrentRoom(room);
              }}
              className="w-full bg-gray-800 border border-gray-750 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-orange-500 cursor-pointer font-semibold"
            >
              {sortedFloors.map(floor => (
                <optgroup key={floor} label={floor} className="bg-gray-900 text-gray-400 font-sans font-bold">
                  {groupedRooms[floor].map(room => (
                    <option key={room.id} value={room.id} className="bg-gray-850 text-white font-medium">
                      {room.displayName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {/* Desktop Room List Accordion */}
        {previewMode === 'tour' ? (
          <div className="hidden md:flex flex-col flex-1 overflow-y-auto p-2 space-y-3">
            <div className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold px-2 mb-1">Select Floor</div>
            {sortedFloors.map(floor => (
              <div key={floor} className="space-y-1">
                <button
                  onClick={() => setExpandedFloors(prev => ({ ...prev, [floor]: !prev[floor] }))}
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800/40 hover:bg-gray-800/80 rounded-lg text-gray-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer select-none"
                >
                  <span>{floor}</span>
                  <span className="text-[9px] text-gray-500">{expandedFloors[floor] ? '▼' : '▶'}</span>
                </button>
                {expandedFloors[floor] && (
                  <div className="pl-1 pt-1 space-y-1 border-l border-gray-800 ml-2">
                    {groupedRooms[floor].map(room => (
                      <button
                        key={room.id}
                        onClick={() => setCurrentRoom(room)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer block truncate ${
                          currentRoom?.id === room.id
                            ? 'bg-orange-500 text-white font-semibold'
                            : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
                        }`}
                      >
                        {room.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="hidden md:flex flex-col flex-1 items-center justify-center p-6 text-center text-gray-500">
            <div className="text-xs uppercase tracking-widest font-bold text-orange-400/80 mb-2">3D Walkthrough View</div>
            <p className="text-[11px] leading-relaxed text-gray-400 max-w-[200px]">
              Use standard Orbit, Pan, and Zoom controls to explore the digital twin space.
            </p>
          </div>
        )}
      </div>

      {/* 360 Viewer Canvas */}
      <div className="flex-1 relative min-h-0 md:h-full bg-black">
        {/* Toggle Mode Tab Bar overlay */}
        {project?.walkthrough_url && rooms.some(r => r.photo_url) && (
          <div className="absolute top-4 left-4 z-30 bg-gray-900/90 border border-gray-800 rounded-xl p-1 shadow-lg backdrop-blur-md flex gap-1 select-none">
            <button
              onClick={() => setPreviewMode('tour')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                previewMode === 'tour'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              360° Virtual Tour
            </button>
            <button
              onClick={() => setPreviewMode('walkthrough')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                previewMode === 'walkthrough'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              3D Walkthrough
            </button>
          </div>
        )}

        {previewMode === 'walkthrough' ? (
          <iframe
            src={`/playcanvas-viewer.html?content=${encodeURIComponent(project.walkthrough_url)}&noui&v=1${project.walkthrough_rotation ? `&sceneRotation=${encodeURIComponent(project.walkthrough_rotation)}` : ''}${project.walkthrough_cam_position ? `&cameraPosition=${encodeURIComponent(project.walkthrough_cam_position)}` : ''}${project.walkthrough_cam_lookat ? `&cameraLookAt=${encodeURIComponent(project.walkthrough_cam_lookat)}` : ''}`}
            className="w-full h-full border-0 relative z-10"
            title="3D Walkthrough"
            allow="xr-spatial-tracking; clipboard-write; gamepad"
          />
        ) : currentRoom?.photo_url ? (
          <div ref={viewerRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950 p-6">
            <ShieldAlert size={40} className="text-gray-650 mb-2" />
            <p className="text-sm">No 360° photo has been uploaded for this room.</p>
            <p className="text-xs text-gray-650 mt-1">Please add an image file in the Projects editor.</p>
          </div>
        )}
        {previewMode === 'tour' && currentRoom && (
          <div className="absolute bottom-4 left-4 bg-black/75 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-sm border border-gray-800 select-none pointer-events-none z-20">
            {currentRoom.room_name}
          </div>
        )}

        {/* Floor Plan Minimap Overlay - Hidden in Walkthrough */}
        {previewMode === 'tour' && project?.floorplan_url && (
          <div className="absolute top-4 right-4 z-25">
            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className="bg-gray-900/90 hover:bg-orange-500 text-white p-3 rounded-xl border border-gray-800 backdrop-blur-md shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs"
            >
              <MapPin size={16} />
              <span>{showMinimap ? 'Hide Map' : 'Show Map'}</span>
            </button>
            
            {showMinimap && (
              <div className="absolute right-0 top-14 w-80 bg-gray-950/90 border border-gray-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-3 border-b border-gray-850 pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Floor Plan Minimap</span>
                  <span className="text-[10px] text-orange-400 font-semibold bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-900/30">
                    {rooms.find(r => r.id === currentRoom?.id)?.room_name.split(' - ').pop() || currentRoom?.room_name}
                  </span>
                </div>
                <div className="relative border border-gray-850 rounded-xl bg-black/60 p-2 overflow-hidden flex items-center justify-center">
                  <div className="relative inline-block">
                    <img
                      src={project.floorplan_url}
                      alt="Minimap"
                      className="max-h-48 w-auto object-contain rounded-lg select-none"
                    />
                    {rooms.filter(r => r.floorplan_x !== null && r.floorplan_y !== null && !r.room_name.includes('(Corner)') && !r.room_name.includes('(End)')).map(r => {
                      const isCurrent = r.id === currentRoom?.id
                      return (
                        <button
                          key={r.id}
                          style={{ left: `${r.floorplan_x}%`, top: `${r.floorplan_y}%` }}
                          onClick={() => {
                            if (r.photo_url) {
                              setCurrentRoom(r)
                            } else {
                              alert(`No photo uploaded for ${r.room_name}`)
                            }
                          }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center cursor-pointer transition-all shadow-md ${
                            isCurrent ? 'bg-orange-500 scale-125 z-10 animate-pulse shadow-orange-500/50' : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                          title={r.room_name}
                        >
                          <span className="sr-only">{r.room_name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Popup Overlay */}
        {infoPopupContent && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-950/90 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setInfoPopupContent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer bg-gray-900 p-1.5 rounded-lg border border-gray-850 transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-900/30 text-blue-400">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-base font-display">Feature Details</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{currentRoom?.room_name}</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line bg-gray-900/40 p-4 border border-gray-850 rounded-xl">
                {infoPopupContent}
              </p>
            </div>
          </div>
        )}

        {/* Visual Hotspot Creator Modal */}
        {showAddVisualHotspotModal && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in duration-150">
              <button
                onClick={() => setShowAddVisualHotspotModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold text-white mb-4 font-display flex items-center gap-2">
                <Plus size={18} className="text-orange-500" /> Create Hotspot Visually
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-gray-850 p-2 border border-gray-800 rounded-xl text-center text-xs text-gray-400 font-mono">
                  <div>pitch: {newHotspotCoords.pitch}°</div>
                  <div>yaw: {newHotspotCoords.yaw}°</div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block font-medium">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setVisualHotspotForm({ ...visualHotspotForm, type: 'scene' })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${visualHotspotForm.type === 'scene' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-800 border-gray-750 text-gray-400'}`}
                    >
                      Link to Room
                    </button>
                    <button
                      onClick={() => setVisualHotspotForm({ ...visualHotspotForm, type: 'info' })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${visualHotspotForm.type === 'info' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-800 border-gray-750 text-gray-400'}`}
                    >
                      Info Popup
                    </button>
                  </div>
                </div>

                {visualHotspotForm.type === 'scene' ? (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block font-medium">Target Room (Destination)</label>
                    <select
                      value={visualHotspotForm.toRoom}
                      onChange={e => setVisualHotspotForm({ ...visualHotspotForm, toRoom: e.target.value })}
                      className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    >
                      {rooms.filter(r => r.id !== currentRoom.id).map(r => (
                        <option key={r.id} value={r.id}>{r.room_name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block font-medium">Info Text (Popup content)</label>
                    <textarea
                      placeholder="e.g. Premium Italian marble flooring."
                      value={visualHotspotForm.infoText}
                      onChange={e => setVisualHotspotForm({ ...visualHotspotForm, infoText: e.target.value })}
                      className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-orange-500 h-20 resize-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-xs mb-1 block font-medium">Label / Tooltip text</label>
                  <input
                    type="text"
                    placeholder={visualHotspotForm.type === 'scene' ? 'e.g. Go to Kitchen' : 'e.g. View Flooring Details'}
                    value={visualHotspotForm.label}
                    onChange={e => setVisualHotspotForm({ ...visualHotspotForm, label: e.target.value })}
                    className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  onClick={handleSaveVisualHotspot}
                  disabled={visualHotspotForm.type === 'scene' ? !visualHotspotForm.toRoom : !visualHotspotForm.infoText.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 mt-2 transition-colors cursor-pointer text-xs"
                >
                  Create Hotspot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
