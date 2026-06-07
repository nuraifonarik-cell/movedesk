import { useEffect, useState } from 'react'
import { supabase, updateJob } from '../lib/supabase'
import InstallPrompt from '../components/InstallPrompt'
import { useNavigate as useNav } from 'react-router-dom'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { MapPin, Clock, Users, Phone, ChevronDown, CheckCircle2, Truck, Package, LogOut } from 'lucide-react'

const STATUS_FLOW = [
  { value: 'scheduled',   label: 'Scheduled', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'in_progress', label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
  { value: 'completed',   label: 'Completed ✓',  color: '#059669', bg: '#ECFDF5' },
]

const APT = { studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedrooms', '3br': '3 Bedrooms', house: 'House' }

function dayLabel(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d))    return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
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
  const [showCompleted, setShowCompleted] = useState(false)

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
    // Find crew member by email (matches Supabase auth email)
    const { data: crewMember } = await supabase
      .from('crew_members')
      .select('*')
      .eq('email', u.email ?? '')
      .maybeSingle()

    // If no crew member linked — show nothing (not their jobs)
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 7)
    const to = new Date(today)
    to.setDate(today.getDate() + 30)

    let q = supabase
      .from('jobs')
      .select(`*, customer:customers(full_name, phone, email)`)
      .in('status', ['new', 'scheduled', 'in_progress', 'completed'])
      .gte('move_date', from.toISOString().split('T')[0])
      .lte('move_date', to.toISOString().split('T')[0])
      .order('move_date', { ascending: true })

    if (!crewMember) {
      // Not a crew member — show nothing
      setCrew(null)
      setJobs([])
      setLoading(false)
      return
    }

    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('job_id')
      .eq('crew_member_id', crewMember.id)

    if (!assignments?.length) {
      // Crew member exists but no jobs assigned yet — show nothing
      setCrew(crewMember)
      setJobs([])
      setLoading(false)
      return
    }

    // Only show assigned jobs
    q = q.in('id', assignments.map(a => a.job_id))
    const { data: jobsData } = await q
    setCrew(crewMember)
    const jobsData2 = jobsData ?? []
    setJobs(jobsData2)
    // Auto-expand the active (in_progress) job
    const active = jobsData2.find(j => j.status === 'in_progress')
    if (active) setExpanded(active.id)
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
            <input type="password" required value={pass} onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          {authErr && <div style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 13, padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>{authErr}</div>}
          <button type="submit" disabled={logging}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', color: 'white', fontSize: 15, fontWeight: 700, cursor: logging ? 'not-allowed' : 'pointer', opacity: logging ? 0.7 : 1 }}>
            {logging ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#9CA3AF' }}>Loading your jobs...</div>
    </div>
  )

  const activeJobs    = jobs.filter(j => j.status === 'in_progress')
  const todayJobs     = jobs.filter(j => isToday(parseISO(j.move_date)) && j.status !== 'in_progress' && j.status !== 'completed')
  const upcomingJobs  = jobs.filter(j => !isToday(parseISO(j.move_date)) && j.status !== 'completed')
  const completedJobs = jobs.filter(j => j.status === 'completed')

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
            <span style={{ color: 'white', fontSize: 12 }}>Sign Out</span>
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Today', val: todayJobs.length, icon: '📅' },
            { label: 'Upcoming', val: upcomingJobs.length, icon: '🗓' },
            { label: 'Total', val: jobs.length, icon: '📋' },
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
      <InstallPrompt />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ padding: '16px 16px 32px' }}>

        {jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#374151' }}>No jobs assigned</div>
            <div style={{ fontSize: 14, marginTop: 4, color: '#9CA3AF' }}>Contact your dispatcher</div>
          </div>
        )}

        {/* Active (in_progress) — top priority */}
        {activeJobs.length > 0 && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#D97706', animation:'pulse 1.5s infinite' }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'#D97706', textTransform:'uppercase', letterSpacing:'0.08em' }}>Active Now</span>
            </div>
            {activeJobs.map(job => <JobCard key={job.id} job={job} expanded={expanded} setExpanded={setExpanded} notes={notes} setNotes={setNotes} saving={saving} changeStatus={changeStatus} saveNote={saveNote} />)}
          </>
        )}

        {/* Today's scheduled */}
        {todayJobs.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em', margin: activeJobs.length ? '20px 0 10px' : '0 0 10px' }}>
              📅 Today — {format(new Date(), 'MMMM d')}
            </div>
            {todayJobs.map(job => <JobCard key={job.id} job={job} expanded={expanded} setExpanded={setExpanded} notes={notes} setNotes={setNotes} saving={saving} changeStatus={changeStatus} saveNote={saveNote} />)}
          </>
        )}

        {/* Upcoming */}
        {upcomingJobs.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>
              🗓 Upcoming
            </div>
            {upcomingJobs.map(job => <JobCard key={job.id} job={job} expanded={expanded} setExpanded={setExpanded} notes={notes} setNotes={setNotes} saving={saving} changeStatus={changeStatus} saveNote={saveNote} />)}
          </>
        )}

        {/* Completed — collapsed at bottom */}
        {completedJobs.length > 0 && (
          <>
            <button onClick={() => setShowCompleted(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%', margin:'20px 0 10px', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                ✅ Completed ({completedJobs.length})
              </span>
              <span style={{ fontSize:11, color:'#9CA3AF' }}>{showCompleted ? '▲ hide' : '▼ show'}</span>
            </button>
            {showCompleted && completedJobs.map(job => <JobCard key={job.id} job={job} expanded={expanded} setExpanded={setExpanded} notes={notes} setNotes={setNotes} saving={saving} changeStatus={changeStatus} saveNote={saveNote} />)}
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

  const [payModal, setPayModal]   = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payLink, setPayLink]     = useState(null)

  // Auto-save notes 1.5s after last change
  useEffect(() => {
    const current = notes[job.id]
    if (current === undefined || current === (job.notes ?? '')) return
    const timer = setTimeout(() => saveNote(job.id), 1500)
    return () => clearTimeout(timer)
  }, [notes[job.id]])

  const openPayModal = () => {
    setPayAmount(String(job.total_price ?? ''))
    setPayLink(null)
    setPayModal(true)
  }

  const requestPayment = async () => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    setPayLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('square-payment', {
        body: {
          job_id:         job.id,
          amount:         amt,
          description:    `Moving Service — ${job.move_date}`,
          customer_email: job.customer?.email ?? '',
          customer_name:  job.customer?.full_name ?? '',
        },
      })
      if (error) throw error
      setPayLink(data.payment_link_url)
    } catch (e) {
      alert('Payment error: ' + (e?.message ?? 'Unknown error'))
    } finally {
      setPayLoading(false)
    }
  }

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
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Pickup</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{job.from_address}</div>
              </div>
            </div>
            <div style={{ borderLeft: '2px dashed #BFDBFE', marginLeft: 13, height: 12, marginBottom: 10 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={14} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Dropoff</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{job.to_address}</div>
              </div>
            </div>
          </div>

          {/* Details row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { icon: <Clock size={13} />, label: 'Est. Time', val: `${job.estimated_hours ?? '?'} hrs` },
              { icon: <Users size={13} />, label: 'Crew', val: `${job.movers_count ?? '?'} movers` },
              { icon: <Package size={13} />, label: 'Type', val: APT[job.apt_type] ?? '—' },
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
            <span style={{ fontWeight: 700, fontSize: 14, color: '#3B82F6' }}>Open in Google Maps</span>
          </a>

          {/* Open Contract button — for foreman */}
          {job.status !== 'completed' && (
            <button
              onClick={() => window.location.href = `/jobs/${job.id}/contract?from=crew`}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontWeight:800, fontSize:15, cursor:'pointer', marginBottom:14, width:'100%', boxShadow:'0 4px 12px rgba(99,102,241,0.35)' }}>
              📋 Open Contract
            </button>
          )}

          {/* Payment button */}
          {['in_progress','completed'].includes(job.status) && (
            <button onClick={openPayModal}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#059669,#10B981)', color:'white', fontWeight:800, fontSize:15, cursor:'pointer', marginBottom:14, width:'100%', boxShadow:'0 4px 12px rgba(5,150,105,0.35)' }}>
              💳 Collect Payment
            </button>
          )}

          {job.status === 'completed' && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#ECFDF5', border:'1px solid #6EE7B7', borderRadius: 10, fontSize: 12, color: '#065F46', fontWeight:600 }}>
              ✅ Job completed
            </div>
          )}
          {job.status !== 'completed' && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#F8FAFF', borderRadius: 10, fontSize: 12, color: '#64748B' }}>
              📋 Status updates automatically when you fill the contract
            </div>
          )}

          {/* Payment Modal */}
          {payModal && (
            <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.5)' }}>
              <div style={{ background:'white', borderRadius:'20px 20px 0 0', padding:24, width:'100%', maxWidth:480, paddingBottom:36 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <h2 style={{ fontSize:18, fontWeight:800, color:'#0F172A', margin:0 }}>💳 Collect Payment</h2>
                  <button onClick={()=>{setPayModal(false);setPayLink(null)}} style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:18 }}>✕</button>
                </div>

                {!payLink ? (<>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Amount ($)</label>
                    <input type="number" min="1" step="0.01" value={payAmount} onChange={e=>setPayAmount(e.target.value)}
                      placeholder="0.00"
                      style={{ width:'100%', border:'2px solid #E2E8F0', borderRadius:12, padding:'14px', fontSize:24, fontWeight:800, color:'#0F172A', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
                  </div>
                  {job.customer?.email
                    ? <div style={{ padding:'10px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, fontSize:13, color:'#065F46', marginBottom:16 }}>
                        📧 Link will be emailed to {job.customer.email}
                      </div>
                    : <div style={{ padding:'10px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, fontSize:13, color:'#92400E', marginBottom:16 }}>
                        ⚠️ No customer email — copy the link manually
                      </div>
                  }
                  <button onClick={requestPayment} disabled={payLoading || !payAmount}
                    style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background:payLoading||!payAmount?'#94A3B8':'linear-gradient(135deg,#059669,#10B981)', color:'white', fontSize:16, fontWeight:800, cursor:payLoading||!payAmount?'not-allowed':'pointer' }}>
                    {payLoading ? 'Creating link...' : 'Send Payment Link →'}
                  </button>
                </>) : (<>
                  <div style={{ textAlign:'center', padding:'16px 0' }}>
                    <div style={{ fontSize:48, marginBottom:10 }}>✅</div>
                    <div style={{ fontSize:16, fontWeight:700, color:'#0F172A', marginBottom:4 }}>Payment link ready!</div>
                    {job.customer?.email && <div style={{ fontSize:13, color:'#059669', marginBottom:16 }}>Email sent to {job.customer.email}</div>}
                    <div style={{ background:'#F8FAFF', border:'1px solid #E2E8F0', borderRadius:10, padding:'12px', marginBottom:16, wordBreak:'break-all', fontSize:12, color:'#1D4ED8', textAlign:'left' }}>
                      {payLink}
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={()=>{
                        if(navigator.clipboard){navigator.clipboard.writeText(payLink).catch(()=>{})}
                        else{const t=document.createElement('textarea');t.value=payLink;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t)}
                      }}
                        style={{ flex:1, padding:'13px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'white', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                        📋 Copy
                      </button>
                      <a href={payLink} target="_blank" rel="noreferrer"
                        style={{ flex:1, padding:'13px', borderRadius:12, border:'none', background:'#0F172A', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        Open →
                      </a>
                    </div>
                  </div>
                  <button onClick={()=>{setPayModal(false);setPayLink(null)}}
                    style={{ width:'100%', marginTop:12, padding:'12px', borderRadius:12, border:'1px solid #E2E8F0', background:'white', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                    Done
                  </button>
                </>)}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Crew Notes:</div>
            <textarea
              value={notes[job.id] ?? job.notes ?? ''}
              onChange={e => setNotes(n => ({ ...n, [job.id]: e.target.value }))}
              placeholder="Special conditions, issues, comments..."
              rows={3}
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => saveNote(job.id)}
                style={{ flex:1, padding: '11px', borderRadius: 12, border: 'none', background: saving[`note_${job.id}`] ? '#059669' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {saving[`note_${job.id}`] ? '✓ Saved' : 'Save Note'}
              </button>
            </div>
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4, textAlign:'right' }}>Auto-saves after you stop typing</div>
          </div>
        </div>
      )}
    </div>
  )
}
