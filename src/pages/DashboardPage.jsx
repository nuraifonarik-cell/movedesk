import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs } from '../lib/supabase'
import { format } from 'date-fns'
import { TrendingUp, Calendar, DollarSign, Users } from 'lucide-react'

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
  const [jobs, setJobs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobs().then(data => { setJobs(data ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const totalRevenue  = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.total_price ?? 0), 0)
  const activeToday   = jobs.filter(j => j.status === 'in_progress').length
  const scheduled     = jobs.filter(j => j.status === 'scheduled').length
  const newLeads      = jobs.filter(j => j.status === 'new').length

  const stats = [
    { label: 'Новых заявок', value: newLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Выручка (всего)', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'В работе сегодня', value: activeToday, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Запланировано', value: scheduled, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <Link
          to="/estimate"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Новая заявка
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Последние заявки</h2>
          <Link to="/jobs" className="text-xs text-brand-600 hover:underline">Все заявки →</Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Загрузка...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Заявок пока нет. <Link to="/estimate" className="text-brand-600 hover:underline">Создать первую →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Клиент', 'Маршрут', 'Дата', 'Сумма', 'Статус'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.slice(0, 8).map(job => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {job.customer?.full_name ?? '—'}
                    </Link>
                    <div className="text-xs text-gray-400">{job.customer?.phone}</div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">
                    <div>{job.from_address}</div>
                    <div className="text-gray-400">→ {job.to_address}</div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {format(new Date(job.move_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {job.total_price ? `$${job.total_price.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
