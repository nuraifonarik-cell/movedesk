import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getJob, updateJob, getCrew, supabase } from '../lib/supabase'
import { downloadInvoice } from '../lib/invoice'
import { format } from 'date-fns'
import {
  ArrowLeft, MapPin, Calendar, Users, DollarSign,
  Phone, Mail, Truck, ClipboardList, CheckCircle2
} from 'lucide-react'

const STATUSES = [
  { value: 'new',         label: 'Новый',         color: 'bg-blue-100 text-blue-700' },
  { value: 'quoted',      label: 'Оценён',         color: 'bg-purple-100 text-purple-700' },
  { value: 'scheduled',   label: 'Запланирован',   color: 'bg-green-100 text-green-700' },
  { value: 'in_progress', label: 'В пути',         color: 'bg-amber-100 text-amber-700' },
  { value: 'completed',   label: 'Выполнен',       color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled',   label: 'Отменён',        color: 'bg-gray-100 text-gray-500' },
]

const APT_LABELS = { studio: 'Студия', '1br': '1 спальня', '2br': '2 спальни', '3br': '3 спальни', house: 'Дом' }

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [job, setJob]         = useState(null)
  const [crew, setCrew]       = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [notes, setNotes]     = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    Promise.all([getJob(id), getCrew()]).then(([j, c]) => {
      setJob(j)
      setNotes(j.notes ?? '')
      setCrew(c)
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [id])

  const statusInfo = STATUSES.find(s => s.value === job?.status) ?? STATUSES[0]

  const changeStatus = async (status) => {
    setSaving(true)
    const updated = await updateJob(id, { status })
    setJob(j => ({ ...j, ...updated }))
    setSaving(false)
  }

  const saveNotes = async () => {
    await updateJob(id, { notes })
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const toggleCrew = async (memberId) => {
    const assigned = job.assignments?.find(a => a.crew_member_id === memberId)
    if (assigned) {
      await supabase.from('job_assignments').delete().eq('id', assigned.id)
      setJob(j => ({ ...j, assignments: j.assignments.filter(a => a.id !== assigned.id) }))
    } else {
      const { data } = await supabase
        .from('job_assignments')
        .insert({ job_id: id, crew_member_id: memberId })
        .select('*, crew_member:crew_members(*)')
        .single()
      setJob(j => ({ ...j, assignments: [...(j.assignments ?? []), data] }))
    }
  }

  const isAssigned = (memberId) => job?.assignments?.some(a => a.crew_member_id === memberId)

  if (loading) return <div className="p-8 text-sm text-gray-400">Загрузка...</div>
  if (!job)    return <div className="p-8 text-sm text-gray-400">Заявка не найдена. <Link to="/jobs" className="text-brand-600">← Назад</Link></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/jobs')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{job.customer?.full_name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Заявка от {format(new Date(job.created_at), 'd MMM yyyy')}
          </p>
        </div>
        {saving && <span className="text-xs text-gray-400">Сохранение...</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="md:col-span-2 space-y-5">

          {/* Move info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck size={15} className="text-gray-400" /> Детали переезда
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2 flex gap-4">
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <MapPin size={11} /> Откуда
                  </div>
                  <div className="font-medium text-gray-900">{job.from_address}</div>
                </div>
                <div className="flex items-center text-gray-300 text-lg">→</div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <MapPin size={11} /> Куда
                  </div>
                  <div className="font-medium text-gray-900">{job.to_address}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar size={11} /> Дата</div>
                <div className="font-medium text-gray-900">{format(new Date(job.move_date), 'd MMMM yyyy')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Тип жилья</div>
                <div className="font-medium text-gray-900">{APT_LABELS[job.apt_type] ?? job.apt_type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Расстояние</div>
                <div className="font-medium text-gray-900">{job.distance_miles} миль</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Грузчики</div>
                <div className="font-medium text-gray-900">{job.movers_count} чел. × {job.estimated_hours} ч</div>
              </div>
            </div>
          </div>

          {/* Status timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList size={15} className="text-gray-400" /> Статус заявки
            </h2>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => changeStatus(s.value)}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    job.status === s.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {job.status === s.value && <CheckCircle2 size={13} />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crew assignment */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={15} className="text-gray-400" /> Назначить бригаду
            </h2>
            {crew.length === 0 ? (
              <p className="text-sm text-gray-400">Нет активных сотрудников. <Link to="/crew" className="text-brand-600">Добавить →</Link></p>
            ) : (
              <div className="space-y-2">
                {crew.map((member, i) => {
                  const assigned = isAssigned(member.id)
                  const colors = ['bg-blue-100 text-blue-700','bg-emerald-100 text-emerald-700',
                    'bg-amber-100 text-amber-700','bg-purple-100 text-purple-700','bg-rose-100 text-rose-700']
                  const initials = member.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
                  const roleLabels = { driver: 'Водитель', mover: 'Грузчик', lead: 'Старший' }
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleCrew(member.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        assigned ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${colors[i % colors.length]}`}>
                        {initials}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                        <div className="text-xs text-gray-500">{roleLabels[member.role]}</div>
                      </div>
                      {assigned && <CheckCircle2 size={16} className="text-brand-600" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Заметки</h2>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Лифт есть, пианино, хрупкие вещи, код домофона..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
            />
            <button
              onClick={saveNotes}
              className="mt-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              {noteSaved ? '✓ Сохранено' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Клиент</h2>
            <div className="space-y-3 text-sm">
              <div className="font-medium text-gray-900 text-base">{job.customer?.full_name}</div>
              <a href={`tel:${job.customer?.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-brand-600">
                <Phone size={13} /> {job.customer?.phone}
              </a>
              {job.customer?.email && (
                <a href={`mailto:${job.customer?.email}`} className="flex items-center gap-2 text-gray-600 hover:text-brand-600">
                  <Mail size={13} /> {job.customer?.email}
                </a>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={15} className="text-gray-400" /> Стоимость
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Труд ({job.movers_count} чел. × {job.estimated_hours}ч)</span>
                <span>${((job.base_rate ?? 0) * (job.estimated_hours ?? 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Транспорт</span>
                <span>${job.travel_fee ?? 0}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Материалы</span>
                <span>${job.materials_fee ?? 0}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
                <span>Итого</span>
                <span className="text-brand-600 text-lg">${(job.total_price ?? 0).toLocaleString()}</span>
              </div>
              {job.deposit_paid > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs">
                  <span>Оплачено (депозит)</span>
                  <span>${job.deposit_paid}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Действия</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/jobs/${id}/invoice`)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg border border-gray-200 transition-colors flex items-center gap-2"
              >
                <span>🧾</span> Просмотр инвойса
              </button>
              <button
                onClick={() => downloadInvoice(job)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg border border-gray-200 transition-colors flex items-center gap-2"
              >
                <span>📄</span> Скачать инвойс PDF
              </button>
              <button className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                💳 Принять оплату
              </button>
              <button className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                📱 Отправить SMS клиенту
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
