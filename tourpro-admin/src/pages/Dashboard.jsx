import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Building2, Eye, HardDrive, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    liveProjects: 0,
    totalRooms: 0,
    draftProjects: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      const { data: projects } = await supabase.from('projects').select('id, is_live')
      const { data: rooms } = await supabase.from('rooms').select('id')

      setStats({
        totalProjects: projects?.length || 0,
        liveProjects: projects?.filter(p => p.is_live).length || 0,
        totalRooms: rooms?.length || 0,
        draftProjects: projects?.filter(p => !p.is_live).length || 0
      })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total Projects', value: stats.totalProjects, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-900/20' },
    { label: 'Live Tours', value: stats.liveProjects, icon: Eye, color: 'text-green-400', bg: 'bg-green-900/20' },
    { label: 'Total Rooms', value: stats.totalRooms, icon: HardDrive, color: 'text-purple-400', bg: 'bg-purple-900/20' },
    { label: 'Drafts', value: stats.draftProjects, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-900/20' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6 font-display">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all`}>
            <card.icon className={`${card.color} mb-3`} size={24} />
            <div className="text-3xl font-bold text-white">{card.value}</div>
            <div className="text-gray-400 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
