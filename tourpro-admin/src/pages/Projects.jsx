import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Code, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'

const BUILDING_TYPES = ['Residential', 'Commercial', 'Villa', 'Apartment', 'Plot']

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProject, setNewProject] = useState({
    client_id: '',
    building_name: '',
    city: '',
    building_type: 'Residential'
  })
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*, rooms:rooms!rooms_project_id_fkey(count)')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name')
    setClients(data || [])
    if (data && data.length > 0) {
      setNewProject(prev => ({ ...prev, client_id: data[0].id }))
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchClients()
  }, [])

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

  const handleCreateProject = async () => {
    if (!newProject.client_id || !newProject.building_name) {
      alert('Client and Building Name are required. Please select or create a client first.')
      return
    }
    const selectedClient = clients.find(c => c.id === newProject.client_id)
    if (!selectedClient) {
      alert('Selected client is invalid.')
      return
    }

    setCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        client_id: newProject.client_id,
        client_name: selectedClient.name,
        building_name: newProject.building_name,
        city: newProject.city,
        building_type: newProject.building_type
      })
      .select()
      .single()

    setCreating(false)
    if (!error && data) {
      setShowCreateModal(false)
      setNewProject({
        client_id: clients[0]?.id || '',
        building_name: '',
        city: '',
        building_type: 'Residential'
      })
      navigate(`/projects/${data.id}`)
    } else {
      alert(error?.message || 'Error creating project')
    }
  }

  const filtered = projects.filter(p =>
    p.client_name.toLowerCase().includes(search.toLowerCase()) ||
    p.building_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white font-display">Projects</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-gray-400 text-sm font-medium px-6 py-4">Client Name</th>
                  <th className="text-gray-400 text-sm font-medium px-6 py-4">Building Name</th>
                  <th className="text-gray-400 text-sm font-medium px-6 py-4">Type</th>
                  <th className="text-gray-400 text-sm font-medium px-6 py-4">Rooms</th>
                  <th className="text-gray-400 text-sm font-medium px-6 py-4">Status</th>
                  <th className="text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No projects found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(project => (
                    <tr key={project.id} className="border-b border-gray-800/50 hover:bg-gray-850 transition-colors">
                      <td className="px-6 py-4 text-white font-medium">{project.client_name}</td>
                      <td className="px-6 py-4 text-gray-300">{project.building_name}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{project.building_type}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{project.rooms?.[0]?.count || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${project.is_live ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-gray-800 text-gray-400 border border-gray-700/50'}`}>
                          {project.is_live ? 'Live' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => navigate(`/projects/${project.id}`)} className="text-gray-400 hover:text-white transition-colors cursor-pointer" title="View / Edit">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => navigate(`/embed/${project.id}`)} className="text-gray-400 hover:text-blue-400 transition-colors cursor-pointer" title="Embed Code">
                            <Code size={18} />
                          </button>
                          <button onClick={() => toggleLive(project)} className="text-gray-400 hover:text-green-400 transition-colors cursor-pointer" title="Toggle Live/Draft">
                            {project.is_live ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                          </button>
                          <button onClick={() => deleteProject(project.id)} className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Project Dialog Modal (NO form tag used) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 font-display">New Project</h2>
            <div className="space-y-4">
               <div>
                <label className="text-gray-400 text-sm mb-1 block">Client *</label>
                {clients.length === 0 ? (
                  <div className="text-yellow-500 text-xs py-1">
                    No clients found. Please go to the{' '}
                    <button
                      onClick={() => { setShowCreateModal(false); navigate('/clients') }}
                      className="underline text-orange-400 font-semibold cursor-pointer"
                    >
                      Clients Tab
                    </button>{' '}
                    to create a client first!
                  </div>
                ) : (
                  <select
                    value={newProject.client_id}
                    onChange={e => setNewProject({...newProject, client_id: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
                  >
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Building Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Green Valley Villa"
                  value={newProject.building_name}
                  onChange={e => setNewProject({...newProject, building_name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">City</label>
                <input
                  type="text"
                  placeholder="e.g. Madurai"
                  value={newProject.city}
                  onChange={e => setNewProject({...newProject, city: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Building Type</label>
                <select
                  value={newProject.building_type}
                  onChange={e => setNewProject({...newProject, building_type: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm"
                >
                  {BUILDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button
                onClick={handleCreateProject}
                disabled={creating}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 mt-4 transition-colors cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
