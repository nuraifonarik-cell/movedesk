import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs, updateJob } from '../lib/supabase'
import { format } from 'date-fns'
import { Search, Plus, ChevronRight } from 'lucide-react'

const STATUSES = [
  { value: '', label: 'Все' },
  { value: 'new', label: 'Новые' },
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
const STATUS_LABELS = {
  new: 'Новый', quoted: 'Оценён', scheduled: 'Запланирован',
  in_progress: 'В пути', completed: 'Выполнен', cancelled: 'Отменён'
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
    return j.customer?.full_name?.toLowerCase().includes(q) ||
           j.from_address?.toLowerCase().includes(q) ||
           j.to_address?.toLowerCase().includes(q)
  })

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">Заявки</h1>
        <Link to="/estimate" className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={15} />
          <span className="hidden sm:inline">Новая заявка</span>
          <span className="sm:hidden">Новая</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, адресу..."
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
        />
      </div>

      {/* Filter tabs — horizontal scroll on mobile */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === s.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Заявок не найдено</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                  {job.customer?.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900">{job.customer?.full_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {job.from_address} → {job.to_address}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(job.move_date), 'MMM d, yyyy')} · {job.customer?.phone}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-1">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">${(job.total_price ?? 0).toLocaleString()}</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
