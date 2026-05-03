import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs } from '../lib/supabase'
import { format } from 'date-fns'
import { TrendingUp, Calendar, DollarSign, Users, Plus } from 'lucide-react'

const STATUS_LABELS = {
  new: 'Новый', quoted: 'Оценён', scheduled: 'Запланирован',
  in_progress: 'В пути', completed: 'Выполнен', cancelled: 'Отменён'
}
const STATUS_COLORS = {
  new: 'bg-blue-50 text-blue-700',
  quoted: 'bg-purple-50 text-purple-700',
  scheduled: 'bg-green-50 text-green-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500'
}

export default function DashboardPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobs().then(data => { setJobs(data ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const totalRevenue = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.total_price ?? 0), 0)
  const activeToday  = jobs.filter(j => j.status === 'in_progress').length
  const scheduled    = jobs.filter(j => j.status === 'scheduled').length
  const newLeads     = jobs.filter(j => j.status === 'new').length

  const stats = [
    { label: 'Новых',       value: newLeads,                        icon: Users,       color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Выручка',     value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'В работе',    value: activeToday,                     icon: TrendingUp,  color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Запланировано', value: scheduled,                     icon: Calendar,    color: 'text-purple-600',  bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <Link
          to="/estimate"
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Новая заявка</span>
          <span className="sm:hidden">Новая</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-semibold text-gray-900">{loading ? '—' : value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Последние заявки</h2>
          <Link to="/jobs" className="text-xs text-brand-600 hover:underline font-medium">Все →</Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Загрузка...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-sm mb-3">Заявок пока нет</div>
            <Link to="/estimate" className="text-sm text-brand-600 font-medium hover:underline">+ Создать первую заявку</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.slice(0, 8).map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                  {job.customer?.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{job.customer?.full_name}</span>
                    <span className={`hidden sm:inline-block flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {job.from_address} → {job.to_address}
                  </div>
                </div>
                {/* Right */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900">${(job.total_price ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{format(new Date(job.move_date), 'MMM d')}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
