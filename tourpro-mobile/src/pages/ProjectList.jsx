import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, MapPin } from 'lucide-react'

export default function ProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const fetchProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*, rooms(count)')
      .order('created_at', { ascending: false })
    if (!error) {
      setProjects(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const filtered = projects.filter(p =>
    p.client_name.toLowerCase().includes(search.toLowerCase()) ||
    p.building_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-display text-orange-500">TourPro360</h1>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">On-Site Capture</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
        <Search className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="text-gray-400 text-sm text-center py-12">Loading staged projects...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500 text-sm">
          No projects found. Tap the button below to add your first project.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(project => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}/rooms`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-white text-sm">{project.building_name}</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${project.is_live ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                    {project.is_live ? 'Live' : 'Draft'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs flex items-center gap-1">
                  <Building2 size={12} /> {project.client_name}
                </p>
                {project.city && (
                  <p className="text-gray-500 text-[10px] flex items-center gap-1">
                    <MapPin size={10} /> {project.city}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-orange-400">{project.rooms?.[0]?.count || 0}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Rooms</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB to create new project */}
      <button
        onClick={() => navigate('/new')}
        className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-50 cursor-pointer"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
