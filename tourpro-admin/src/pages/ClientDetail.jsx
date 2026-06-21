import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Eye, Code, Trash2, ToggleLeft, ToggleRight, X, ArrowLeft, Globe, Edit, Copy, Check, ExternalLink } from 'lucide-react'

const BUILDING_TYPES = ['Residential', 'Commercial', 'Villa', 'Apartment', 'Plot']

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditClientModal, setShowEditClientModal] = useState(false)
  const [newProject, setNewProject] = useState({
    building_name: '',
    city: '',
    building_type: 'Residential'
  })
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editClientData, setEditClientData] = useState({
    name: '',
    logo_url: '',
    website: ''
  })

  const fetchData = async () => {
    setLoading(true)
    // Fetch client details
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (clientError || !clientData) {
      alert('Client not found')
      navigate('/clients')
      return
    }

    setClient(clientData)
    setEditClientData({
      name: clientData.name,
      logo_url: clientData.logo_url || '',
      website: clientData.website || ''
    })

    // Fetch projects belonging to this client
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, rooms:rooms!rooms_project_id_fkey(count)')
      .eq('client_id', id)
      .order('created_at', { ascending: false })

    setProjects(projectsData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleUpdateClient = async () => {
    if (!editClientData.name) {
      alert('Client Name is required.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('clients')
      .update({
        name: editClientData.name,
        logo_url: editClientData.logo_url,
        website: editClientData.website
      })
      .eq('id', id)

    setSubmitting(false)
    if (!error) {
      setShowEditClientModal(false)
      fetchData()
    } else {
      alert(error.message || 'Error updating client')
    }
  }

  const toggleLive = async (project) => {
    await supabase
      .from('projects')
      .update({ is_live: !project.is_live })
      .eq('id', project.id)
    fetchData()
  }

  const deleteProject = async (projectId) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    await supabase.from('projects').delete().eq('id', projectId)
    fetchData()
  }

  const handleCreateProject = async () => {
    if (!newProject.building_name) {
      alert('Building Name is required.')
      return
    }
    setCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...newProject,
        client_id: id,
        client_name: client.name // Sync client_name for fallback compatibility
      })
      .select()
      .single()

    setCreating(false)
    if (!error && data) {
      setShowCreateModal(false)
      setNewProject({
        building_name: '',
        city: '',
        building_type: 'Residential'
      })
      navigate(`/projects/${data.id}`)
    } else {
      alert(error?.message || 'Error creating project')
    }
  }

  const copyWidgetCode = () => {
    if (!client) return
    const code = `<div id="tourpro-portfolio"\n  data-client-token="${client.embed_token}"\n  style="width:100%;min-height:600px;">\n</div>\n<script src="https://tour.solodeveloper.pro/widget.js"></script>`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-8 text-gray-400">Loading client profile...</div>
    )
  }

  return (
    <div className="p-8 pb-16">
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors cursor-pointer text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back to Clients
      </button>

      {/* Client Header Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="w-16 h-16 rounded-xl object-cover border border-gray-800 bg-gray-950 shrink-0"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-2xl font-display shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
              {client.name}
              <button
                onClick={() => setShowEditClientModal(true)}
                className="text-gray-500 hover:text-white p-1 hover:bg-gray-850 rounded-lg transition-colors cursor-pointer"
                title="Edit Client Profile"
              >
                <Edit size={14} />
              </button>
            </h1>
            
            <div className="flex flex-wrap gap-4 mt-2">
              {client.website && (
                <a
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-400 transition-colors"
                >
                  <Globe size={14} />
                  <span>{client.website}</span>
                  <ExternalLink size={12} />
                </a>
              )}
              <span className="text-xs text-gray-500">
                Created: {new Date(client.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer text-sm"
        >
          <Plus size={16} /> New Virtual Tour
        </button>
      </div>

      {/* Grid Layout for details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column: Embed codes */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-2 font-display text-sm">Portfolio Widget Embed Code</h3>
            <p className="text-gray-400 text-xs mb-4">
              Add this widget to {client.name}'s site to show all their active virtual tours.
            </p>

            <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden mb-4">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-850 bg-gray-900/50">
                <span className="text-gray-500 text-xs font-semibold font-mono">Portfolio Embed Snippet</span>
                <button
                  onClick={copyWidgetCode}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 text-[10px] text-orange-400 font-mono overflow-x-auto whitespace-pre-wrap select-all bg-gray-950">
{`<div id="tourpro-portfolio"
  data-client-token="${client.embed_token}"
  style="width:100%;min-height:600px;">
</div>
<script src="https://tour.solodeveloper.pro/widget.js"></script>`}
              </pre>
            </div>

            <div className="bg-gray-850/30 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 leading-relaxed">
              When you add new virtual tours under this client and toggle them to <strong>Live</strong>, they will automatically appear in this portfolio on their website!
            </div>
          </div>
        </div>

        {/* Right Column: Projects list */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 font-display text-sm">Virtual Tours (Portfolio Items)</h3>

            {projects.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl text-gray-500 text-sm">
                No virtual tours created yet. Click "New Virtual Tour" to upload 360° panoramas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="font-medium pb-3 pr-4">Building Name</th>
                      <th className="font-medium pb-3 px-4">Type</th>
                      <th className="font-medium pb-3 px-4">Rooms</th>
                      <th className="font-medium pb-3 px-4">Status</th>
                      <th className="font-medium pb-3 pl-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(project => (
                      <tr key={project.id} className="border-b border-gray-800/40 hover:bg-gray-850/20 transition-colors">
                        <td className="py-3 pr-4 font-medium text-white">{project.building_name}</td>
                        <td className="py-3 px-4 text-gray-300">{project.building_type}</td>
                        <td className="py-3 px-4 text-gray-400">{project.rooms?.[0]?.count || 0}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${project.is_live ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-gray-800 text-gray-400 border border-gray-700/50'}`}>
                            {project.is_live ? 'Live' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 pl-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => navigate(`/projects/${project.id}`)} className="text-gray-400 hover:text-white transition-colors cursor-pointer" title="View / Edit Tour">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => navigate(`/embed/${project.id}`)} className="text-gray-400 hover:text-blue-400 transition-colors cursor-pointer" title="Single Embed Code">
                              <Code size={16} />
                            </button>
                            <button onClick={() => toggleLive(project)} className="text-gray-400 hover:text-green-400 transition-colors cursor-pointer" title="Toggle Live/Draft">
                              {project.is_live ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                            </button>
                            <button onClick={() => deleteProject(project.id)} className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer" title="Delete Tour">
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
        </div>
      </div>

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-4 font-display">New Project for {client.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Building / Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rajan Vista 2BHK Flat"
                  value={newProject.building_name}
                  onChange={e => setNewProject({ ...newProject, building_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">City</label>
                <input
                  type="text"
                  placeholder="e.g. Madurai"
                  value={newProject.city}
                  onChange={e => setNewProject({ ...newProject, city: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Building Type</label>
                <select
                  value={newProject.building_type}
                  onChange={e => setNewProject({ ...newProject, building_type: e.target.value })}
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
                {creating ? 'Creating...' : 'Create & Open Editor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Profile Modal */}
      {showEditClientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowEditClientModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 font-display">Edit Client Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Client Name *</label>
                <input
                  type="text"
                  value={editClientData.name}
                  onChange={e => setEditClientData({ ...editClientData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Logo Image URL</label>
                <input
                  type="text"
                  value={editClientData.logo_url}
                  onChange={e => setEditClientData({ ...editClientData, logo_url: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Website URL</label>
                <input
                  type="text"
                  value={editClientData.website}
                  onChange={e => setEditClientData({ ...editClientData, website: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <button
                onClick={handleUpdateClient}
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 mt-4 transition-colors cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
