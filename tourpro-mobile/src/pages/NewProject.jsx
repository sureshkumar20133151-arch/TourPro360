import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const BUILDING_TYPES = ['Residential', 'Commercial', 'Villa', 'Apartment', 'Plot']

export default function NewProject() {
  const [form, setForm] = useState({
    client_name: '',
    building_name: '',
    city: '',
    building_type: 'Residential'
  })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!form.client_name || !form.building_name) {
      alert('Client Name and Building Name are required.')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('projects')
      .insert(form)
      .select()
      .single()
    if (!error && data) {
      navigate(`/project/${data.id}/rooms`)
    } else {
      alert(error?.message || 'Error creating project')
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 pb-12 text-white">
      {/* Back to Project List */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <h1 className="text-xl font-bold text-white mb-6 font-display">New Project</h1>
      
      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">Client Name *</label>
          <input
            placeholder="e.g. Rajan Builders"
            value={form.client_name}
            onChange={e => setForm({...form, client_name: e.target.value})}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">Building Name *</label>
          <input
            placeholder="e.g. Green Valley Villa"
            value={form.building_name}
            onChange={e => setForm({...form, building_name: e.target.value})}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">City</label>
          <input
            placeholder="e.g. Madurai"
            value={form.city}
            onChange={e => setForm({...form, city: e.target.value})}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">Building Type</label>
          <select
            value={form.building_type}
            onChange={e => setForm({...form, building_type: e.target.value})}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
          >
            {BUILDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl mt-6 transition-colors cursor-pointer text-sm"
        >
          {saving ? 'Creating...' : 'Create Project & Add Rooms →'}
        </button>
      </div>
    </div>
  )
}
