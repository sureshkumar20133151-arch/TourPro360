import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Code, Trash2, Edit, X, Globe, Copy, Check, ExternalLink } from 'lucide-react'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [showEmbedModal, setShowEmbedModal] = useState(null)
  const [copied, setCopied] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    logo_url: '',
    website: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*, projects(count)')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setClients(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleCreateClient = async () => {
    if (!newClient.name) {
      alert('Client Name is required.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('clients')
      .insert(newClient)

    setSubmitting(false)
    if (!error) {
      setShowCreateModal(false)
      setNewClient({ name: '', logo_url: '', website: '' })
      fetchClients()
    } else {
      alert(error.message || 'Error creating client')
    }
  }

  const handleUpdateClient = async () => {
    if (!editingClient.name) {
      alert('Client Name is required.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('clients')
      .update({
        name: editingClient.name,
        logo_url: editingClient.logo_url,
        website: editingClient.website
      })
      .eq('id', editingClient.id)

    setSubmitting(false)
    if (!error) {
      setEditingClient(null)
      fetchClients()
    } else {
      alert(error.message || 'Error updating client')
    }
  }

  const deleteClient = async (id) => {
    if (!confirm('Are you sure you want to delete this client? All of their projects will lose their client association.')) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) {
      fetchClients()
    } else {
      alert(error.message || 'Error deleting client')
    }
  }

  const copyWidgetCode = (token) => {
    const code = `<div id="tourpro-portfolio"\n  data-client-token="${token}"\n  style="width:100%;min-height:600px;">\n</div>\n<script src="https://tourpro360-widget.vercel.app/widget.js"></script>`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Clients</h1>
          <p className="text-gray-400 text-xs mt-1">Manage construction builders and their virtual tour portfolios.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer text-sm"
        >
          <Plus size={16} /> New Client
        </button>
      </div>

      <input
        placeholder="Search builders..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-6 focus:outline-none focus:border-orange-500 text-sm"
      />

      {loading ? (
        <div className="text-gray-400 text-sm">Loading clients...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
          No clients found. Get started by creating your first client profile.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(client => {
            const projectCount = client.projects?.[0]?.count || 0
            return (
              <div key={client.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex flex-col justify-between transition-all">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt={client.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-800 bg-gray-950 shrink-0"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-lg font-display shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold text-base truncate font-display">{client.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-md font-medium">
                          {projectCount} {projectCount === 1 ? 'Tour' : 'Tours'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {client.website && (
                    <a
                      href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-400 transition-colors mb-4 w-fit"
                    >
                      <Globe size={14} />
                      <span className="truncate max-w-[200px]">{client.website}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 mt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Manage Portfolios"
                    >
                      <Eye size={14} /> Open
                    </button>
                    <button
                      onClick={() => setShowEmbedModal(client)}
                      className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-blue-400 hover:text-blue-300 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Get Gallery Widget Code"
                    >
                      <Code size={14} /> Embed
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditingClient(client)}
                      className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                      title="Delete Client"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Client Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 font-display">New Client</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Client / Builder Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rajan Builders"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Logo Image URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://domain.com/logo.png"
                  value={newClient.logo_url}
                  onChange={e => setNewClient({ ...newClient, logo_url: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Website URL</label>
                <input
                  type="text"
                  placeholder="e.g. www.rajanbuilders.com"
                  value={newClient.website}
                  onChange={e => setNewClient({ ...newClient, website: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <button
                onClick={handleCreateClient}
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 mt-4 transition-colors cursor-pointer"
              >
                {submitting ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setEditingClient(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 font-display">Edit Client</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Client Name *</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Logo Image URL</label>
                <input
                  type="text"
                  value={editingClient.logo_url || ''}
                  onChange={e => setEditingClient({ ...editingClient, logo_url: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Website URL</label>
                <input
                  type="text"
                  value={editingClient.website || ''}
                  onChange={e => setEditingClient({ ...editingClient, website: e.target.value })}
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

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowEmbedModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-2 font-display">Portfolio Gallery Widget</h2>
            <p className="text-gray-400 text-xs mb-6">
              Embed this unified portfolio gallery on {showEmbedModal.name}'s website.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-850 bg-gray-900/50">
                  <span className="text-gray-400 text-xs font-semibold font-mono">Portfolio Embed Snippet</span>
                  <button
                    onClick={() => copyWidgetCode(showEmbedModal.embed_token)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="p-4 text-xs text-orange-400 font-mono overflow-x-auto whitespace-pre-wrap select-all bg-gray-950">
{`<div id="tourpro-portfolio"
  data-client-token="${showEmbedModal.embed_token}"
  style="width:100%;min-height:600px;">
</div>
<script src="https://tourpro360-widget.vercel.app/widget.js"></script>`}
                </pre>
              </div>

              <div className="bg-gray-850/50 border border-gray-800 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
                <h4 className="font-semibold text-gray-300 mb-1.5">Setup Instructions:</h4>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Copy the code block above.</li>
                  <li>Paste it into the HTML/Code editor of the client's website (e.g. WordPress Custom HTML, Wix Embed, Webflow Code embed).</li>
                  <li>All **Live** virtual tours associated with this client will display automatically in a responsive grid.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
