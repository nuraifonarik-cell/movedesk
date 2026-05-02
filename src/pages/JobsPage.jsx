import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs, updateJob } from '../lib/supabase'
import { format } from 'date-fns'
import { Search } from 'lucide-react'

const STATUSES = [
  { value: '', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'quoted', label: 'Оценённые' },
  { value: 'scheduled', label: 'Запланированные' },
  { value: 'in_progress', label: 'В пути' },
  { value: 'completed', label: 'Выполненные' },
  { value: 'cancelled', label: 'Отменённые' },
]

const STATUS_COLORS = {
  new: 'bg-blue-50 text-blue-700',
  quoted: 'bg-purple-50 text-purple-700',
  scheduled: 'bg-green-50 text-green-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500'
}

export default function JobsPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    getJobs(filter ? { status: filter } : {})
      .then(data => setJobs(data ?? []))
      .finally(() => setLoading(false))
  }, [filter])

  const filtered = jobs.filter(j => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      j.customer?.full_name?.toLowerCase().includes(q) ||
      j.from_address?.toLowerCase().includes(q) ||
      j.to_address?.toLowerCase().includes(q)
    )
  })

  const changeStatus = async (id, status) => {
    await updateJob(id, { status })
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Заявки</h1>
        <Link to="/estimate" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Новая заявка
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, адресу..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">Заявок не найдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Клиент', 'Маршрут', 'Дата', 'Тип', 'Сумма', 'Статус', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-gray-900">{job.customer?.full_name}</div>
                    <div className="text-xs text-gray-400">{job.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600">
                    <div>{job.from_address}</div>
                    <div className="text-gray-400">→ {job.to_address}</div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700">{format(new Date(job.move_date), 'MMM d')}</td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs capitalize">{job.apt_type}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-900">
                    {job.total_price ? `$${job.total_price.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={job.status}
                      onChange={e => changeStatus(job.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[job.status]}`}
                    >
                      {STATUSES.filter(s => s.value).map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link to={`/jobs/${job.id}`} className="text-xs text-brand-600 hover:underline">Открыть →</Link>
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
