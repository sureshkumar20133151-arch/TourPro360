import 'pannellum/build/pannellum.js'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Inject Pannellum CSS dynamically
if (!document.querySelector('link[href*="pannellum.css"]')) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
  document.head.appendChild(link)
}

// Inject Global Widget Styles (Glassmorphism, Grid, and Modal)
const style = document.createElement('style')
style.textContent = `
  /* Single Viewer Styles */
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
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tourpro-hotspot:hover {
    transform: scale(1.15) rotate(15deg);
  }
  .tourpro-hotspot::after {
    content: '➔';
    color: white;
    font-size: 16px;
    font-weight: bold;
  }
  .tourpro-room-label {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: rgba(15, 23, 42, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    pointer-events: none;
    backdrop-filter: blur(8px);
    z-index: 1000;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .tourpro-watermark {
    position: absolute;
    bottom: 16px;
    right: 16px;
    color: rgba(255,255,255,0.45);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 10px;
    pointer-events: none;
    z-index: 1000;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }
  .tourpro-menu-btn {
    position: absolute;
    top: 16px;
    left: 16px;
    background: rgba(15, 23, 42, 0.8);
    color: white;
    border: 1px solid rgba(255,255,255,0.08);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    cursor: pointer;
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all 0.2s;
    backdrop-filter: blur(8px);
  }
  .tourpro-menu-btn:hover {
    background: rgba(234, 88, 12, 0.95);
  }
  .tourpro-panel {
    position: absolute;
    top: 0;
    left: -240px;
    width: 220px;
    height: 100%;
    background: rgba(15, 23, 42, 0.95);
    border-right: 1px solid rgba(255,255,255,0.08);
    z-index: 1002;
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    padding: 16px 8px;
    box-sizing: border-box;
    backdrop-filter: blur(8px);
  }
  .tourpro-panel.open {
    left: 0;
  }
  .tourpro-panel-header {
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 16px;
    padding-left: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .tourpro-close-btn {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.5);
    font-size: 20px;
    cursor: pointer;
    padding: 0 8px;
  }
  .tourpro-close-btn:hover {
    color: white;
  }
  .tourpro-room-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    flex-grow: 1;
    width: 100%;
  }
  .tourpro-room-btn {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.7);
    text-align: left;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    transition: all 0.2s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tourpro-room-btn:hover {
    background: rgba(255,255,255,0.05);
    color: white;
  }
  .tourpro-room-btn.active {
    background: #ea580c;
    color: white;
    font-weight: 600;
  }

  /* Portfolio Grid Styles */
  .tourpro-portfolio-container {
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 24px;
    padding: 24px;
    color: #e2e8f0;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .tourpro-portfolio-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    border-b: 1px solid rgba(255,255,255,0.08);
    padding-bottom: 20px;
  }
  .tourpro-portfolio-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    object-cover: cover;
    background: #020617;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .tourpro-portfolio-title {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
  }
  .tourpro-portfolio-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
  }
  .tourpro-portfolio-search {
    background: #020617;
    border: 1px solid #334155;
    color: white;
    border-radius: 12px;
    padding: 10px 16px;
    font-size: 14px;
    outline: none;
    width: 100%;
    max-width: 300px;
    transition: border-color 0.2s;
  }
  .tourpro-portfolio-search:focus {
    border-color: #ea580c;
  }
  .tourpro-portfolio-filters {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .tourpro-filter-btn {
    background: #1e293b;
    border: 1px solid transparent;
    color: #94a3b8;
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .tourpro-filter-btn:hover {
    background: #334155;
    color: white;
  }
  .tourpro-filter-btn.active {
    background: #ea580c;
    color: white;
  }
  .tourpro-portfolio-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }
  .tourpro-portfolio-card {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s;
  }
  .tourpro-portfolio-card:hover {
    transform: translateY(-6px);
    border-color: rgba(234, 88, 12, 0.4);
  }
  .tourpro-portfolio-thumb-wrapper {
    position: relative;
    aspect-ratio: 16/9;
    overflow: hidden;
    background: #020617;
  }
  .tourpro-portfolio-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  .tourpro-portfolio-card:hover .tourpro-portfolio-thumb {
    transform: scale(1.08);
  }
  .tourpro-portfolio-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(15, 23, 42, 0.75);
    color: #fdba74;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .tourpro-portfolio-info {
    padding: 16px;
  }
  .tourpro-portfolio-card-title {
    font-size: 16px;
    font-weight: 700;
    color: white;
    margin: 0 0 6px 0;
  }
  .tourpro-portfolio-card-meta {
    font-size: 12px;
    color: #94a3b8;
  }

  /* Modal Styles */
  .tourpro-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(2, 6, 23, 0.85);
    backdrop-filter: blur(8px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .tourpro-modal-content {
    position: relative;
    width: 100%;
    max-width: 1200px;
    height: 85vh;
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
  .tourpro-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.75);
    color: white;
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 100001;
    transition: all 0.2s;
    line-height: 1;
    padding-bottom: 4px;
  }
  .tourpro-modal-close:hover {
    background: #ea580c;
    border-color: transparent;
  }
`
document.head.appendChild(style)

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Single Tour Loader Function
async function loadSingleTour(container, token) {
  // Clear previous content
  container.innerHTML = ''
  
  // Fetch project details
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('embed_token', token)
    .eq('is_live', true)
    .single()

  if (error || !project) {
    container.innerHTML = '<div style="color:#ef4444;padding:20px;text-align:center;font-family:sans-serif;font-size:14px;">Virtual tour offline or unavailable.</div>'
    return null
  }

  // Fetch rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')

  if (!rooms || rooms.length === 0) {
    container.innerHTML = '<div style="color:#94a3b8;padding:20px;text-align:center;font-family:sans-serif;font-size:14px;">No rooms configured.</div>'
    return null
  }

  // Fetch hotspots
  const roomIds = rooms.map(r => r.id)
  const { data: hotspots } = await supabase
    .from('hotspots')
    .select('*')
    .in('from_room_id', roomIds)

  const entryRoom = rooms.find(r => r.id === project.entry_room_id) || rooms[0]
  let currentViewer = null
  const expandedFloors = {
    'Ground Floor': true,
    'First Floor': true,
    'Other': true
  }

  // Configure Container styling for viewer
  container.style.position = 'relative'
  container.style.overflow = 'hidden'

  // Add Room Label
  const label = document.createElement('div')
  label.className = 'tourpro-room-label'
  label.textContent = entryRoom.room_name
  container.appendChild(label)

  // Add Watermark
  const watermark = document.createElement('div')
  watermark.className = 'tourpro-watermark'
  watermark.textContent = 'Powered by TourPro360'
  container.appendChild(watermark)

  // Add Menu Toggle Button
  const menuBtn = document.createElement('button')
  menuBtn.className = 'tourpro-menu-btn'
  menuBtn.textContent = '☰'
  container.appendChild(menuBtn)

  // Add Slide-out Panel
  const panel = document.createElement('div')
  panel.className = 'tourpro-panel'

  const panelHeader = document.createElement('div')
  panelHeader.className = 'tourpro-panel-header'
  panelHeader.textContent = 'Rooms'
  
  const closeBtn = document.createElement('button')
  closeBtn.className = 'tourpro-close-btn'
  closeBtn.innerHTML = '×'
  panelHeader.appendChild(closeBtn)
  panel.appendChild(panelHeader)

  const roomListContainer = document.createElement('div')
  roomListContainer.className = 'tourpro-room-list'
  panel.appendChild(roomListContainer)
  container.appendChild(panel)

  // Toggle events
  menuBtn.addEventListener('click', () => panel.classList.add('open'))
  closeBtn.addEventListener('click', () => panel.classList.remove('open'))

  function updateRoomListUI(activeRoom) {
    roomListContainer.innerHTML = ''
    
    // Group rooms by floor
    const groupedRooms = {}
    rooms.forEach(room => {
      let floor = 'Other'
      let displayName = room.room_name
      
      if (room.room_name.includes('Ground Floor - ')) {
        floor = 'Ground Floor'
        displayName = room.room_name.replace('Ground Floor - ', '')
      } else if (room.room_name.includes('First Floor - ')) {
        floor = 'First Floor'
        displayName = room.room_name.replace('First Floor - ', '')
      } else if (room.room_name.includes('Ground Floor')) {
        floor = 'Ground Floor'
      } else if (room.room_name.includes('First Floor')) {
        floor = 'First Floor'
      }
      
      if (!groupedRooms[floor]) {
        groupedRooms[floor] = []
      }
      groupedRooms[floor].push({ ...room, displayName })
    })

    const floorOrder = ['Ground Floor', 'First Floor', 'Other']
    const sortedFloors = floorOrder.filter(f => groupedRooms[f] && groupedRooms[f].length > 0)

    sortedFloors.forEach(floor => {
      // Create Floor Header toggle button
      const floorHeader = document.createElement('button')
      floorHeader.style.width = '100%'
      floorHeader.style.display = 'flex'
      floorHeader.style.alignItems = 'center'
      floorHeader.style.justifyContent = 'space-between'
      floorHeader.style.background = 'rgba(255,255,255,0.03)'
      floorHeader.style.border = '1px solid rgba(255,255,255,0.05)'
      floorHeader.style.color = '#e2e8f0'
      floorHeader.style.padding = '8px 12px'
      floorHeader.style.borderRadius = '8px'
      floorHeader.style.cursor = 'pointer'
      floorHeader.style.fontSize = '12px'
      floorHeader.style.fontWeight = '600'
      floorHeader.style.textAlign = 'left'
      floorHeader.style.marginTop = '6px'
      floorHeader.style.fontFamily = 'system-ui, -apple-system, sans-serif'
      
      const titleSpan = document.createElement('span')
      titleSpan.textContent = floor
      floorHeader.appendChild(titleSpan)
      
      const arrowSpan = document.createElement('span')
      arrowSpan.style.fontSize = '9px'
      arrowSpan.style.color = 'rgba(255,255,255,0.4)'
      arrowSpan.textContent = expandedFloors[floor] ? '▼' : '▶'
      floorHeader.appendChild(arrowSpan)
      
      roomListContainer.appendChild(floorHeader)
      
      // Create rooms container for this floor
      const floorRoomsContainer = document.createElement('div')
      floorRoomsContainer.style.display = expandedFloors[floor] ? 'flex' : 'none'
      floorRoomsContainer.style.flexDirection = 'column'
      floorRoomsContainer.style.gap = '4px'
      floorRoomsContainer.style.paddingLeft = '8px'
      floorRoomsContainer.style.marginTop = '4px'
      floorRoomsContainer.style.borderLeft = '1px solid rgba(255,255,255,0.05)'
      floorRoomsContainer.style.marginLeft = '8px'
      
      groupedRooms[floor].forEach(room => {
        const btn = document.createElement('button')
        btn.className = `tourpro-room-btn ${room.id === activeRoom.id ? 'active' : ''}`
        btn.textContent = room.displayName
        btn.style.width = '100%'
        btn.addEventListener('click', () => {
          panel.classList.remove('open')
          loadRoom(room)
        })
        floorRoomsContainer.appendChild(btn)
      })
      
      roomListContainer.appendChild(floorRoomsContainer)
      
      // Toggle logic
      floorHeader.addEventListener('click', () => {
        expandedFloors[floor] = !expandedFloors[floor]
        arrowSpan.textContent = expandedFloors[floor] ? '▼' : '▶'
        floorRoomsContainer.style.display = expandedFloors[floor] ? 'flex' : 'none'
      })
    })
  }

  function loadRoom(room) {
    let floor = 'Other'
    if (room.room_name.includes('Ground Floor')) {
      floor = 'Ground Floor'
    } else if (room.room_name.includes('First Floor')) {
      floor = 'First Floor'
    }
    expandedFloors[floor] = true

    if (currentViewer) {
      currentViewer.destroy()
    }

    const roomHotspots = (hotspots || [])
      .filter(h => h.from_room_id === room.id)
      .map(h => {
        const targetRoom = rooms.find(r => r.id === h.to_room_id)
        return {
          pitch: h.pitch,
          yaw: h.yaw,
          type: 'custom',
          text: h.label || `Go to ${targetRoom?.room_name}`,
          cssClass: 'tourpro-hotspot',
          clickHandlerFunc: () => loadRoom(targetRoom)
        }
      })

    currentViewer = window.pannellum.viewer(container, {
      type: 'equirectangular',
      panorama: room.photo_url,
      autoLoad: true,
      autoRotate: -2,
      compass: false,
      showFullscreenCtrl: true,
      showZoomCtrl: false,
      hotSpots: roomHotspots,
      hotSpotDebug: false
    })

    label.textContent = room.room_name
    updateRoomListUI(room)
  }

  loadRoom(entryRoom)

  // Return destructor
  return {
    destroy: () => {
      if (currentViewer) {
        currentViewer.destroy()
      }
    }
  }
}

// Portfolio Gallery Loader Function
async function loadPortfolio(container, clientToken) {
  container.innerHTML = '<div style="color:#666;padding:20px;text-align:center;">Loading portfolio...</div>'

  // 1. Fetch client details
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('embed_token', clientToken)
    .single()

  if (clientErr || !client) {
    container.innerHTML = '<div style="color:#ef4444;padding:20px;text-align:center;">Portfolio unavailable or offline.</div>'
    return
  }

  // 2. Fetch projects with nested rooms
  const { data: projects, error: projectsErr } = await supabase
    .from('projects')
    .select(`
      id,
      building_name,
      building_type,
      city,
      embed_token,
      entry_room_id,
      rooms:rooms!rooms_project_id_fkey (
        id,
        photo_url
      )
    `)
    .eq('client_id', client.id)
    .eq('is_live', true)

  if (projectsErr || !projects || projects.length === 0) {
    container.innerHTML = `
      <div class="tourpro-portfolio-container">
        <div class="tourpro-portfolio-header">
          ${client.logo_url ? `<img src="${client.logo_url}" class="tourpro-portfolio-logo" />` : ''}
          <div class="tourpro-portfolio-title">${client.name}</div>
        </div>
        <div style="text-align:center;padding:40px;color:#94a3b8;">No projects published in this portfolio.</div>
      </div>
    `
    return
  }

  // Set up states
  let activeFilter = 'All'
  let searchQuery = ''

  function renderGrid() {
    const filtered = projects.filter(p => {
      const matchSearch = p.building_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchFilter = activeFilter === 'All' || p.building_type === activeFilter
      return matchSearch && matchFilter
    })

    const grid = container.querySelector('.tourpro-portfolio-grid')
    if (!grid) return

    grid.innerHTML = ''
    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#64748b;">No matching projects found.</div>'
      return
    }

    filtered.forEach(p => {
      // Find thumbnail
      const entryRoom = p.rooms.find(r => r.id === p.entry_room_id) || p.rooms[0]
      const thumbUrl = entryRoom ? entryRoom.photo_url : 'https://placehold.co/600x400/1e293b/94a3b8?text=Tour'

      const card = document.createElement('div')
      card.className = 'tourpro-portfolio-card'
      card.innerHTML = `
        <div class="tourpro-portfolio-thumb-wrapper">
          <img src="${thumbUrl}" class="tourpro-portfolio-thumb" alt="${p.building_name}" loading="lazy" />
          <span class="tourpro-portfolio-badge">${p.building_type}</span>
        </div>
        <div class="tourpro-portfolio-info">
          <h4 class="tourpro-portfolio-card-title">${p.building_name}</h4>
          <div class="tourpro-portfolio-card-meta">${p.city || ''}</div>
        </div>
      `
      
      card.addEventListener('click', () => openViewerModal(p.embed_token))
      grid.appendChild(card)
    })
  }

  // Render main container structure
  container.innerHTML = `
    <div class="tourpro-portfolio-container">
      <div class="tourpro-portfolio-header">
        ${client.logo_url ? `<img src="${client.logo_url}" class="tourpro-portfolio-logo" />` : ''}
        <div class="tourpro-portfolio-title">${client.name}</div>
      </div>
      <div class="tourpro-portfolio-controls">
        <input class="tourpro-portfolio-search" type="text" placeholder="Search projects..." />
        <div class="tourpro-portfolio-filters">
          <button class="tourpro-filter-btn active" data-filter="All">All</button>
          <button class="tourpro-filter-btn" data-filter="Villa">Villas</button>
          <button class="tourpro-filter-btn" data-filter="Apartment">Apartments</button>
          <button class="tourpro-filter-btn" data-filter="Residential">Residential</button>
          <button class="tourpro-filter-btn" data-filter="Commercial">Commercial</button>
        </div>
      </div>
      <div class="tourpro-portfolio-grid"></div>
    </div>
  `

  // Attach search event
  const searchInput = container.querySelector('.tourpro-portfolio-search')
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value
    renderGrid()
  })

  // Attach filter events
  const filterBtns = container.querySelectorAll('.tourpro-filter-btn')
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      activeFilter = btn.dataset.filter
      renderGrid()
    })
  })

  // First render
  renderGrid()
}

// Modal management for 360° virtual tours
function openViewerModal(token) {
  // Create overlay
  const overlay = document.createElement('div')
  overlay.className = 'tourpro-modal-overlay'

  // Create content frame
  const content = document.createElement('div')
  content.className = 'tourpro-modal-content'

  // Create close button
  const closeBtn = document.createElement('button')
  closeBtn.className = 'tourpro-modal-close'
  closeBtn.innerHTML = '&times;'

  // Create viewer element
  const viewerContainer = document.createElement('div')
  viewerContainer.id = 'tourpro-modal-viewer'
  viewerContainer.style.width = '100%'
  viewerContainer.style.height = '100%'

  content.appendChild(closeBtn)
  content.appendChild(viewerContainer)
  overlay.appendChild(content)
  document.body.appendChild(overlay)

  let activeTourInstance = null

  // Load single tour inside the modal
  loadSingleTour(viewerContainer, token).then(instance => {
    activeTourInstance = instance
  })

  // Close functionality
  function closeModal() {
    if (activeTourInstance) {
      activeTourInstance.destroy()
    }
    overlay.remove()
  }

  closeBtn.addEventListener('click', closeModal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal()
    }
  })
}

// Main initialisation function
function init() {
  // Check for portfolio container
  const portfolioContainer = document.getElementById('tourpro-portfolio')
  if (portfolioContainer && portfolioContainer.dataset.clientToken) {
    loadPortfolio(portfolioContainer, portfolioContainer.dataset.clientToken)
  }

  // Check for single tour container
  const singleContainer = document.getElementById('tourpro-container') || document.getElementById('tour-container')
  if (singleContainer && singleContainer.dataset.token) {
    loadSingleTour(singleContainer, singleContainer.dataset.token)
  }
}

// Auto-run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
