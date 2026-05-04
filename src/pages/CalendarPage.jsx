import { useEffect, useState } from 'react'
import { getJobs } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'

const STATUS_EVENT_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  quoted: 'bg-purple-100 text-purple-800',
  scheduled: 'bg-green-100 text-green-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const [jobs, setJobs]       = useState([])

  useEffect(() => {
    const from = format(startOfMonth(current), 'yyyy-MM-dd')
    const to   = format(endOfMonth(current), 'yyyy-MM-dd')
    getJobs({ from, to }).then(d => setJobs(d ?? []))
  }, [current])

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const jobsForDay = day => jobs.filter(j => isSameDay(new Date(j.move_date), day))

  const prev = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const next = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {format(current, 'LLLL yyyy', { locale: ru })}
        </h1>
        <div className="flex gap-2">
          <button onClick={prev} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">← Prev</button>
          <button onClick={() => setCurrent(new Date())} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">Today</button>
          <button onClick={next} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">Next →</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayJobs = jobsForDay(day)
            const inMonth = isSameMonth(day, current)
            const today   = isToday(day)
            return (
              <div
                key={idx}
                className={`min-h-[90px] p-2 border-b border-r border-gray-100 last:border-r-0 ${
                  !inMonth ? 'bg-gray-50' : ''
                } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1.5 ${
                  today ? 'bg-brand-600 text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayJobs.slice(0, 2).map(job => (
                    <div
                      key={job.id}
                      className={`text-xs px-1.5 py-0.5 rounded truncate ${STATUS_EVENT_COLORS[job.status]}`}
                      title={`${job.customer?.full_name} — ${job.from_address}`}
                    >
                      {job.customer?.full_name?.split(' ')[0]}
                    </div>
                  ))}
                  {dayJobs.length > 2 && (
                    <div className="text-xs text-gray-400 px-1">+{dayJobs.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
