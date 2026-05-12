import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs } from '../lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { TrendingUp, Calendar, DollarSign, Users, Plus, ChevronRight, MapPin, Clock } from 'lucide-react'

const STATUS_CFG = {
  new:         { label:'New',         color:'#1E40AF', bg:'#DBEAFE', dot:'#3B82F6' },
  scheduled:   { label:'Scheduled',   color:'#065F46', bg:'#D1FAE5', dot:'#10B981' },
  in_progress: { label:'In Progress', color:'#92400E', bg:'#FEF3C7', dot:'#F59E0B' },
}

const APT = { studio:'Studio', '1br':'1 BR', '2br':'2 BR', '3br':'3 BR', house:'House' }
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '??'
const AV_COLORS = ['#DBEAFE:#1E40AF','#D1FAE5:#065F46','#FEF3C7:#92400E','#EDE9FE:#5B21B6','#FCE7F3:#9D174D']

export default function DashboardPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobs().then(data => { setJobs(data ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Revenue: current month completed jobs
  const monthStart = startOfMonth(new Date())
  const monthEnd   = endOfMonth(new Date())
  const monthRevenue = jobs
    .filter(j => j.status === 'completed' && j.move_date >= format(monthStart,'yyyy-MM-dd') && j.move_date <= format(monthEnd,'yyyy-MM-dd'))
    .reduce((s,j) => s + (j.actual_total ?? j.total_price ?? 0), 0)

  const newJobs      = jobs.filter(j => j.status === 'new')
  const scheduledJobs = jobs.filter(j => j.status === 'scheduled')
  const inProgressJobs = jobs.filter(j => j.status === 'in_progress')
  const scheduled    = scheduledJobs.length

  const stats = [
    { label:'New Leads',    value: newJobs.length,                  sub:'awaiting assignment',  icon:Users,      bg:'#DBEAFE', ic:'#1E40AF' },
    { label:'Revenue',      value:`$${monthRevenue.toLocaleString()}`, sub:'this month',          icon:DollarSign, bg:'#D1FAE5', ic:'#065F46' },
    { label:'In Progress',  value: inProgressJobs.length,           sub:'crews working now',    icon:TrendingUp, bg:'#FEF3C7', ic:'#D97706' },
    { label:'Scheduled',    value: scheduled,                       sub:'upcoming moves',       icon:Calendar,   bg:'#EDE9FE', ic:'#6D28D9' },
  ]

  const columns = [
    { key:'new',         label:'New',         jobs: newJobs,         color:'#1E40AF', bg:'#EFF6FF', dotColor:'#3B82F6', headerBg:'#DBEAFE' },
    { key:'scheduled',   label:'Scheduled',   jobs: scheduledJobs,   color:'#065F46', bg:'#F0FDF4', dotColor:'#10B981', headerBg:'#D1FAE5' },
    { key:'in_progress', label:'In Progress', jobs: inProgressJobs,  color:'#92400E', bg:'#FFFBEB', dotColor:'#F59E0B', headerBg:'#FEF3C7' },
  ]

  return (
    <div style={{ padding:'20px', fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Dashboard</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/estimate"
          style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 3px 12px rgba(99,102,241,0.35)' }}>
          <Plus size={14}/> New Job
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {stats.map(({ label, value, sub, icon:Icon, bg, ic }) => (
          <div key={label} style={{ background:'white', borderRadius:14, padding:16, border:'0.5px solid #E2E8F0' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</span>
              <div style={{ width:30, height:30, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={14} color={ic}/>
              </div>
            </div>
            <div style={{ fontSize:26, fontWeight:800, color:'#0F172A', letterSpacing:'-0.5px' }}>
              {loading ? '—' : value}
            </div>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Three columns */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }} className="kanban-grid">
        {columns.map(col => (
          <div key={col.key}>
            {/* Column header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:col.headerBg, borderRadius:'12px 12px 0 0', border:`0.5px solid ${col.dotColor}44` }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:col.dotColor }}/>
                <span style={{ fontSize:13, fontWeight:700, color:col.color }}>{col.label}</span>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:col.color, background:'white', borderRadius:20, padding:'2px 10px', border:`1px solid ${col.dotColor}33` }}>
                {loading ? '—' : col.jobs.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'8px', background:'#F8FAFF', borderRadius:'0 0 12px 12px', border:`0.5px solid ${col.dotColor}33`, borderTop:'none', minHeight:120 }}>
              {loading ? (
                <div style={{ padding:20, textAlign:'center', color:'#94A3B8', fontSize:12 }}>Loading...</div>
              ) : col.jobs.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', color:'#CBD5E1', fontSize:12 }}>No jobs</div>
              ) : (
                col.jobs.map((job, i) => {
                  const [avBg, avColor] = AV_COLORS[i % AV_COLORS.length].split(':')
                  return (
                    <Link key={job.id} to={`/jobs/${job.id}`}
                      style={{ display:'block', textDecoration:'none', background:'white', borderRadius:12, padding:'12px 14px', border:`0.5px solid ${col.dotColor}33`, transition:'all 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)'; e.currentTarget.style.transform='translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform='none' }}>

                      {/* Customer */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:avColor, flexShrink:0 }}>
                          {initials(job.customer?.full_name)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {job.customer?.full_name}
                          </div>
                          <div style={{ fontSize:11, color:'#94A3B8' }}>{job.customer?.phone}</div>
                        </div>
                      </div>

                      {/* Route */}
                      <div style={{ fontSize:11, color:'#64748B', marginBottom:4, display:'flex', alignItems:'flex-start', gap:4 }}>
                        <MapPin size={10} color="#94A3B8" style={{ flexShrink:0, marginTop:1 }}/>
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.from_address}</span>
                      </div>
                      <div style={{ fontSize:11, color:'#94A3B8', marginBottom:8, paddingLeft:14 }}>
                        → {job.to_address}
                      </div>

                      {/* Footer */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'0.5px solid #F1F5F9' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#94A3B8' }}>
                          <Calendar size={11}/>
                          {format(new Date(job.move_date), 'MMM d')}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#94A3B8' }}>
                          <Users size={11}/>
                          {job.movers_count} · {APT[job.apt_type] ?? ''}
                        </div>
                        <ChevronRight size={13} color="#CBD5E1"/>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media(max-width:768px) {
          .kanban-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
