import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs } from '../lib/supabase'
import { format, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { Plus, MapPin, Users, AlertCircle, ChevronRight, Calendar } from 'lucide-react'

const APT = { studio:'Studio', '1br':'1 BR', '2br':'2 BR', '3br':'3 BR', house:'House' }
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '??'
const AV_COLORS = ['#DBEAFE:#1E40AF','#D1FAE5:#065F46','#FEF3C7:#92400E','#EDE9FE:#5B21B6','#FCE7F3:#9D174D','#FEE2E2:#991B1B']

const STATUS_CFG = {
  new:         { label:'New',         color:'#1E40AF', bg:'#DBEAFE', dot:'#3B82F6' },
  scheduled:   { label:'Scheduled',  color:'#065F46', bg:'#D1FAE5', dot:'#10B981' },
  in_progress: { label:'In Progress',color:'#92400E', bg:'#FEF3C7', dot:'#F59E0B' },
  completed:   { label:'Completed',  color:'#065F46', bg:'#D1FAE5', dot:'#059669' },
  cancelled:   { label:'Cancelled',  color:'#64748B', bg:'#F1F5F9', dot:'#94A3B8' },
}

function dayLabel(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d))    return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEE, MMM d')
}

// Solid background colors per status for cards
const CARD_COLORS = {
  new:         { cardBg:'#EFF6FF', headerBg:'#1D4ED8', routeBg:'rgba(255,255,255,0.6)', textColor:'#1E3A8A', dotColor:'#3B82F6' },
  quoted:      { cardBg:'#F5F3FF', headerBg:'#6D28D9', routeBg:'rgba(255,255,255,0.6)', textColor:'#3B0764', dotColor:'#7C3AED' },
  scheduled:   { cardBg:'#F0FDF4', headerBg:'#059669', routeBg:'rgba(255,255,255,0.6)', textColor:'#064E3B', dotColor:'#10B981' },
  in_progress: { cardBg:'#FFFBEB', headerBg:'#D97706', routeBg:'rgba(255,255,255,0.6)', textColor:'#78350F', dotColor:'#F59E0B' },
  completed:   { cardBg:'#ECFDF5', headerBg:'#059669', routeBg:'rgba(255,255,255,0.6)', textColor:'#064E3B', dotColor:'#059669' },
  cancelled:   { cardBg:'#F8FAFF', headerBg:'#94A3B8', routeBg:'rgba(255,255,255,0.6)', textColor:'#475569', dotColor:'#94A3B8' },
}

function JobCard({ job, i, big = false }) {
  const s  = STATUS_CFG[job.status] ?? STATUS_CFG.new
  const cc = CARD_COLORS[job.status] ?? CARD_COLORS.new
  const assigned = job.assignments?.length > 0
  const ini = initials(job.customer?.full_name)

  return (
    <Link to={`/jobs/${job.id}`}
      style={{
        display:'block', textDecoration:'none',
        background: cc.cardBg,
        borderRadius:16,
        border:`1px solid ${cc.dotColor}33`,
        overflow:'hidden',
        boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
        transition:'all 0.15s',
      }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)'; e.currentTarget.style.transform='translateY(-2px)'}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.transform='none'}}
    >
      {/* Colored header strip */}
      <div style={{background: cc.headerBg, padding: big ? '12px 16px' : '10px 14px', display:'flex', alignItems:'center', gap:10}}>
        <div style={{width: big?32:26, height: big?32:26, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: big?12:10, fontWeight:800, color:'white', flexShrink:0}}>
          {ini}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize: big?15:13, fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {job.customer?.full_name}
          </div>
          {big && <div style={{fontSize:11, color:'rgba(255,255,255,0.75)'}}>{job.customer?.phone}</div>}
        </div>
        <span style={{fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.25)', color:'white', flexShrink:0}}>
          {s.label}
        </span>
      </div>

      {/* Body */}
      <div style={{padding: big ? '12px 16px' : '10px 14px'}}>
        {/* Route */}
        <div style={{background: cc.routeBg, borderRadius:10, padding:'8px 10px', marginBottom:10, border:`1px solid ${cc.dotColor}22`}}>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color: cc.textColor, marginBottom:4, fontWeight:500}}>
            <MapPin size={11} color={cc.dotColor}/> <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{job.from_address}</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color: cc.textColor, opacity:0.75}}>
            <MapPin size={11} color={cc.dotColor}/> <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{job.to_address}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{display:'flex', alignItems:'center', gap:8, fontSize:11}}>
          <span style={{display:'flex', alignItems:'center', gap:4, color: cc.textColor, opacity:0.8}}>
            <Users size={11}/> {job.movers_count} movers · {APT[job.apt_type]??''}
          </span>
          {!assigned && (
            <span style={{display:'flex', alignItems:'center', gap:3, color:'#DC2626', fontWeight:700, background:'#FEE2E2', padding:'2px 8px', borderRadius:20, marginLeft:'auto'}}>
              <AlertCircle size={10}/> No crew
            </span>
          )}
          <span style={{marginLeft: assigned ? 'auto' : '0', display:'flex', alignItems:'center', gap:3, color: cc.textColor, opacity:0.7, fontSize:11}}>
            <Calendar size={10}/> {dayLabel(job.move_date)}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobs().then(data => { setJobs(data ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const today      = format(new Date(), 'yyyy-MM-dd')
  const in7days    = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const todayJobs    = jobs.filter(j => j.move_date === today && ['scheduled','in_progress'].includes(j.status))
  const needsAttention = jobs.filter(j => j.status === 'new')
  const upcomingJobs = jobs.filter(j => j.move_date > today && j.move_date <= in7days && ['scheduled'].includes(j.status))
  const monthRevenue = jobs
    .filter(j => j.status === 'completed' && j.move_date >= monthStart && j.move_date <= monthEnd)
    .reduce((s,j) => s + (j.actual_total ?? j.total_price ?? 0), 0)

  const stats = [
    { label:'New Leads',   value: needsAttention.length, color:'#1E40AF', bg:'#DBEAFE', dot:'#3B82F6' },
    { label:'Today',       value: todayJobs.length,      color:'#92400E', bg:'#FEF3C7', dot:'#F59E0B' },
    { label:'This Week',   value: upcomingJobs.length,   color:'#065F46', bg:'#D1FAE5', dot:'#10B981' },
    { label:'Revenue / mo',value:`$${monthRevenue.toLocaleString()}`, color:'#5B21B6', bg:'#EDE9FE', dot:'#7C3AED' },
  ]

  return (
    <div style={{padding:'20px', fontFamily:"'Inter',system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px'}}>Dashboard</h1>
          <p style={{fontSize:13, color:'#94A3B8', margin:'3px 0 0'}}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/estimate"
          style={{display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 3px 12px rgba(99,102,241,0.35)'}}>
          <Plus size={14}/> New Job
        </Link>
      </div>

      {/* Stats row */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24}}>
        {stats.map(s => (
          <div key={s.label} style={{background:'white', borderRadius:12, padding:'14px 16px', border:`0.5px solid ${s.dot}33`, borderTop:`3px solid ${s.dot}`}}>
            <div style={{fontSize:22, fontWeight:800, color:'#0F172A', letterSpacing:'-0.5px'}}>
              {loading ? '—' : s.value}
            </div>
            <div style={{fontSize:11, color:s.color, fontWeight:700, marginTop:3, textTransform:'uppercase', letterSpacing:'0.04em'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* TODAY block */}
      <div style={{marginBottom:24}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{width:8, height:8, borderRadius:'50%', background:'#F59E0B'}}/>
            <span style={{fontSize:15, fontWeight:800, color:'#0F172A'}}>Today</span>
            <span style={{fontSize:12, color:'#94A3B8'}}>{format(new Date(), 'MMMM d')}</span>
          </div>
          <span style={{fontSize:12, fontWeight:700, color:'#92400E', background:'#FEF3C7', padding:'3px 12px', borderRadius:20}}>
            {todayJobs.length} jobs
          </span>
        </div>

        {loading ? (
          <div style={{background:'white', borderRadius:14, padding:30, textAlign:'center', color:'#94A3B8', fontSize:13}}>Loading...</div>
        ) : todayJobs.length === 0 ? (
          <div style={{background:'white', borderRadius:14, padding:'28px 20px', textAlign:'center', border:'0.5px dashed #E2E8F0'}}>
            <div style={{fontSize:28, marginBottom:8}}>☀️</div>
            <div style={{fontSize:14, fontWeight:600, color:'#374151', marginBottom:4}}>No moves scheduled for today</div>
            <div style={{fontSize:12, color:'#94A3B8'}}>Enjoy the quiet — or <Link to="/estimate" style={{color:'#1D4ED8'}}>create a new job</Link></div>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12}}>
            {todayJobs.map((job, i) => <JobCard key={job.id} job={job} i={i} big={true}/>)}
          </div>
        )}
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div style={{marginBottom:24}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <AlertCircle size={15} color="#DC2626"/>
              <span style={{fontSize:15, fontWeight:800, color:'#0F172A'}}>Needs Attention</span>
              <span style={{fontSize:12, color:'#94A3B8'}}>assign crew & schedule</span>
            </div>
            <Link to="/jobs?status=new" style={{fontSize:12, color:'#1D4ED8', fontWeight:600, textDecoration:'none'}}>
              View all →
            </Link>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {needsAttention.slice(0, 4).map((job, i) => (
              <Link key={job.id} to={`/jobs/${job.id}`}
                style={{display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:12, padding:'12px 16px', border:'0.5px solid #FECACA', borderLeft:'4px solid #EF4444', textDecoration:'none', transition:'all 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#FEF2F2'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{width:32, height:32, borderRadius:'50%', background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#991B1B', flexShrink:0}}>
                  {initials(job.customer?.full_name)}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700, color:'#0F172A'}}>{job.customer?.full_name}</div>
                  <div style={{fontSize:11, color:'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {job.from_address} → {job.to_address}
                  </div>
                </div>
                <div style={{textAlign:'right', flexShrink:0}}>
                  <div style={{fontSize:12, fontWeight:700, color:'#DC2626'}}>No crew</div>
                  <div style={{fontSize:11, color:'#94A3B8'}}>{dayLabel(job.move_date)}</div>
                </div>
                <ChevronRight size={14} color="#CBD5E1"/>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming this week */}
      <div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{width:8, height:8, borderRadius:'50%', background:'#10B981'}}/>
            <span style={{fontSize:15, fontWeight:800, color:'#0F172A'}}>Upcoming This Week</span>
          </div>
          <Link to="/jobs" style={{fontSize:12, color:'#1D4ED8', fontWeight:600, textDecoration:'none'}}>View all →</Link>
        </div>

        {loading ? (
          <div style={{background:'white', borderRadius:14, padding:30, textAlign:'center', color:'#94A3B8', fontSize:13}}>Loading...</div>
        ) : upcomingJobs.length === 0 ? (
          <div style={{background:'white', borderRadius:14, padding:'20px', textAlign:'center', border:'0.5px dashed #E2E8F0', color:'#94A3B8', fontSize:13}}>
            No upcoming jobs this week
          </div>
        ) : (
          <div style={{background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden'}}>
            {upcomingJobs.map((job, i) => {
              const s = STATUS_CFG[job.status] ?? STATUS_CFG.scheduled
              const [avBg, avColor] = AV_COLORS[i % AV_COLORS.length].split(':')
              return (
                <Link key={job.id} to={`/jobs/${job.id}`}
                  style={{display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < upcomingJobs.length-1 ? '0.5px solid #F1F5F9':'none', textDecoration:'none', borderLeft:`4px solid ${s.dot}`, transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFF'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{width:30, height:30, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:avColor, flexShrink:0}}>
                    {initials(job.customer?.full_name)}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:600, color:'#0F172A'}}>{job.customer?.full_name}</div>
                    <div style={{fontSize:11, color:'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {job.from_address} → {job.to_address}
                    </div>
                  </div>
                  <div style={{textAlign:'right', flexShrink:0}}>
                    <div style={{fontSize:12, fontWeight:700, color:s.color}}>{dayLabel(job.move_date)}</div>
                    <div style={{fontSize:11, color:'#94A3B8'}}>{job.movers_count} movers · {APT[job.apt_type]??''}</div>
                  </div>
                  <ChevronRight size={14} color="#CBD5E1" style={{flexShrink:0}}/>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
