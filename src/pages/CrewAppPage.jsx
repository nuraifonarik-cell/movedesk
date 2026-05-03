import { useEffect, useState } from 'react'
import { supabase, updateJob } from '../lib/supabase'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { MapPin, Clock, Users, Phone, ChevronDown, CheckCircle2, Truck, Package, LogOut } from 'lucide-react'

const STATUS_FLOW = [
  { value: 'scheduled',   label: 'Запланирован', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'in_progress', label: 'В пути / Работаем', color: '#D97706', bg: '#FFFBEB' },
  { value: 'completed',   label: 'Выполнен ✓',  color: '#059669', bg: '#ECFDF5' },
]

const APT = { studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedrooms', '3br': '3 Bedrooms', house: 'House' }

function dayLabel(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d))    return 'Сегодня'
  if (isTomorrow(d)) return 'Завтра'
  return format(d, 'EEE, MMM d')
}

export default function CrewAppPage() {
  const [user, setUser]       = useState(null)
  const [crew, setCrew]       = useState(null)   // crew_member record
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [notes, setNotes]     = useState({})
  const [saving, setSaving]   = useState({})

  // Auth
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [authErr, setAuthErr] = useState('')
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadCrewData(session.user)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadCrewData(session.user)
      else { setUser(null); setCrew(null); setJobs([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadCrewData(u) {
    setUser(u)
    // Find crew member by email
    const { data: crewMember } = await supabase
      .from('crew_members')
      .select('*')
      .eq('phone', u.user_metadata?.phone ?? '')
      .maybeSingle()

    // Fallback: just load all jobs assigned to any crew (for demo)
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 1)
    const to = new Date(today)
    to.setDate(today.getDate() + 7)

    let q = supabase
      .from('jobs')
      .select(`*, customer:customers(full_name, phone)`)
      .in('status', ['scheduled', 'in_progress'])
      .gte('move_date', from.toISOString().split('T')[0])
      .lte('move_date', to.toISOString().split('T')[0])
      .order('move_date', { ascending: true })

    if (crewMember) {
      // Filter by assignments
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('crew_member_id', crewMember.id)
      if (assignments?.length) {
        q = q.in('id', assignments.map(a => a.job_id))
      }
    }

    const { data: jobsData } = await q
    setCrew(crewMember)
    setJobs(jobsData ?? [])
    setLoading(false)
  }

  async function signIn(e) {
    e.preventDefault()
    setLogging(true); setAuthErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setAuthErr(error.message)
    setLogging(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function changeStatus(jobId, status) {
    setSaving(s => ({ ...s, [jobId]: true }))
    await updateJob(jobId, { status })
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j))
    setSaving(s => ({ ...s, [jobId]: false }))
  }

  async function saveNote(jobId) {
    setSaving(s => ({ ...s, [`note_${jobId}`]: true }))
    await updateJob(jobId, { notes: notes[jobId] })
    setTimeout(() => setSaving(s => ({ ...s, [`note_${jobId}`]: false })), 1000)
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!user && !loading) return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg, #1E3A8A 0%, #3B82F6 60%, #60A5FA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="32" height="32" fill="white" viewBox="0 0 16 16">
              <path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/>
            </svg>
          </div>
          <div style={{ color: 'white', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Move Go</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>Crew Portal</div>
        </div>

        <form onSubmit={signIn} style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Пароль</label>
            <input type="password" required value={pass} onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          {authErr && <div style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 13, padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>{authErr}</div>}
          <button type="submit" disabled={logging}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', color: 'white', fontSize: 15, fontWeight: 700, cursor: logging ? 'not-allowed' : 'pointer', opacity: logging ? 0.7 : 1 }}>
            {logging ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#9CA3AF' }}>Загрузка заданий...</div>
    </div>
  )

  const todayJobs = jobs.filter(j => isToday(parseISO(j.move_date)))
  const upcomingJobs = jobs.filter(j => !isToday(parseISO(j.move_date)))

  // ── Main crew view ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#F1F5F9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Move Go</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>Crew Portal</div>
            </div>
          </div>
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <LogOut size={14} color="white" />
            <span style={{ color: 'white', fontSize: 12 }}>Выйти</span>
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Сегодня', val: todayJobs.length, icon: '📅' },
            { label: 'Предстоит', val: upcomingJobs.length, icon: '🗓' },
            { label: 'Всего', val: jobs.length, icon: '📋' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>{s.val}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Jobs */}
      <div style={{ padding: '16px 16px 32px' }}>

        {jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#374151' }}>Нет заданий!</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>На ближайшие дни заданий нет</div>
          </div>
        )}

        {todayJobs.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              📅 Сегодня — {format(new Date(), 'MMMM d')}
            </div>
            {todayJobs.map(job => <JobCard key={job.id} job={job} expanded={expanded} setExpanded={setExpanded} notes={notes} setNotes={setNotes} saving={saving} changeStatus={changeStatus} saveNote={saveNote} />)}
          </>
        )}

        {upcomingJobs.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>
              🗓 Предстоящие
            </div>
            {upcomingJobs.map(job => <JobCard key={job.id} job={job} expanded={expanded} setExpanded={setExpanded} notes={notes} setNotes={setNotes} saving={saving} changeStatus={changeStatus} saveNote={saveNote} />)}
          </>
        )}
      </div>
    </div>
  )
}

function JobCard({ job, expanded, setExpanded, notes, setNotes, saving, changeStatus, saveNote }) {
  const isExpanded = expanded === job.id
  const statusInfo = STATUS_FLOW.find(s => s.value === job.status) ?? STATUS_FLOW[0]
  const APT = { studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedrooms', '3br': '3 Bedrooms', house: 'House' }

  return (
    <div style={{ background: 'white', borderRadius: 16, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Card header */}
      <div onClick={() => setExpanded(isExpanded ? null : job.id)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Status dot */}
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusInfo.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{job.customer?.full_name ?? '—'}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.from_address}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: statusInfo.color, background: statusInfo.bg, padding: '3px 8px', borderRadius: 20 }}>
            {statusInfo.label}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{dayLabel(job.move_date)}</div>
        </div>
        <ChevronDown size={16} color="#9CA3AF" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px' }}>
          {/* Route */}
          <div style={{ background: '#F8FAFF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={14} color="#3B82F6" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Откуда</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{job.from_address}</div>
              </div>
            </div>
            <div style={{ borderLeft: '2px dashed #BFDBFE', marginLeft: 13, height: 12, marginBottom: 10 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={14} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Куда</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{job.to_address}</div>
              </div>
            </div>
          </div>

          {/* Details row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { icon: <Clock size={13} />, label: 'Время', val: `${job.estimated_hours ?? '?'} ч` },
              { icon: <Users size={13} />, label: 'Бригада', val: `${job.movers_count ?? '?'} чел.` },
              { icon: <Package size={13} />, label: 'Тип', val: APT[job.apt_type] ?? '—' },
            ].map(d => (
              <div key={d.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: '#9CA3AF', marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{d.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{d.val}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF' }}>{d.label}</div>
              </div>
            ))}
          </div>

          {/* Call client */}
          {job.customer?.phone && (
            <a href={`tel:${job.customer.phone}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: '#F0FDF4', border: '1.5px solid #BBF7D0', textDecoration: 'none', marginBottom: 14 }}>
              <Phone size={16} color="#059669" />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#059669' }}>{job.customer.phone}</span>
            </a>
          )}

          {/* Google Maps */}
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.from_address)}`}
            target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: '#EFF6FF', border: '1.5px solid #BFDBFE', textDecoration: 'none', marginBottom: 14 }}>
            <MapPin size={16} color="#3B82F6" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#3B82F6' }}>Открыть в Google Maps</span>
          </a>

          {/* Status buttons */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Изменить статус:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STATUS_FLOW.map(s => (
                <button key={s.value}
                  onClick={() => changeStatus(job.id, s.value)}
                  disabled={saving[job.id]}
                  style={{
                    padding: '12px 16px', borderRadius: 12, border: `2px solid ${job.status === s.value ? s.color : '#E5E7EB'}`,
                    background: job.status === s.value ? s.bg : 'white',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    fontWeight: job.status === s.value ? 700 : 400, fontSize: 14,
                    color: job.status === s.value ? s.color : '#6B7280',
                    transition: 'all 0.15s'
                  }}>
                  {job.status === s.value && <CheckCircle2 size={16} color={s.color} />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Заметки бригады:</div>
            <textarea
              value={notes[job.id] ?? job.notes ?? ''}
              onChange={e => setNotes(n => ({ ...n, [job.id]: e.target.value }))}
              placeholder="Особые условия, проблемы, комментарии..."
              rows={3}
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={() => saveNote(job.id)}
              style={{ marginTop: 8, width: '100%', padding: '11px', borderRadius: 12, border: 'none', background: saving[`note_${job.id}`] ? '#059669' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saving[`note_${job.id}`] ? '✓ Сохранено' : 'Сохранить заметку'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
