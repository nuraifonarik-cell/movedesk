import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs } from '../lib/supabase'
import { format } from 'date-fns'
import { TrendingUp, Calendar, DollarSign, Users, Plus, ChevronRight } from 'lucide-react'

const STATUS_LABELS = { new:'New', quoted:'Quoted', scheduled:'Scheduled', in_progress:'In Progress', completed:'Completed', cancelled:'Cancelled' }
const STATUS_COLORS = {
  new:         { bg:'#EFF6FF', color:'#1D4ED8' },
  quoted:      { bg:'#F5F3FF', color:'#6D28D9' },
  scheduled:   { bg:'#F0FDF4', color:'#059669' },
  in_progress: { bg:'#FFFBEB', color:'#D97706' },
  completed:   { bg:'#ECFDF5', color:'#059669' },
  cancelled:   { bg:'#F1F5F9', color:'#94A3B8' },
}
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '??'
const AV_COLORS = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']

export default function DashboardPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobs().then(data => { setJobs(data ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const revenue   = jobs.filter(j => j.status === 'completed').reduce((s,j) => s+(j.total_price??0), 0)
  const active    = jobs.filter(j => j.status === 'in_progress').length
  const scheduled = jobs.filter(j => j.status === 'scheduled').length
  const newLeads  = jobs.filter(j => j.status === 'new').length

  const stats = [
    { label:'New Leads',   value: loading?'—':newLeads,              sub:'this week',        icon:Users,       bg:'#EFF6FF', ic:'#1D4ED8' },
    { label:'Revenue',     value: loading?'—':`$${revenue.toLocaleString()}`, sub:'completed jobs', icon:DollarSign,  bg:'#ECFDF5', ic:'#059669' },
    { label:'Active Today',value: loading?'—':active,                sub:'crews working',    icon:TrendingUp,  bg:'#FFFBEB', ic:'#D97706' },
    { label:'Scheduled',   value: loading?'—':scheduled,             sub:'upcoming moves',   icon:Calendar,    bg:'#F5F3FF', ic:'#6D28D9' },
  ]

  return (
    <div style={{ padding: '20px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color:'#94A3B8', margin:'3px 0 0' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/estimate" style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 3px 12px rgba(99,102,241,0.35)' }}>
          <Plus size={14} /> New Job
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
        {stats.map(({ label, value, sub, icon:Icon, bg, ic }) => (
          <div key={label} style={{ background:'white', borderRadius:14, padding:'16px', border:'0.5px solid #E2E8F0' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</span>
              <div style={{ width:30, height:30, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={14} color={ic} />
              </div>
            </div>
            <div style={{ fontSize:26, fontWeight:800, color:'#0F172A', letterSpacing:'-0.5px' }}>{value}</div>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Jobs table */}
      <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'0.5px solid #F1F5F9' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>Recent Jobs</span>
          <Link to="/jobs" style={{ fontSize:12, color:'#6366F1', fontWeight:600, textDecoration:'none' }}>View all →</Link>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14 }}>Loading...</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding:40, textAlign:'center' }}>
            <div style={{ fontSize:14, color:'#94A3B8', marginBottom:10 }}>No jobs yet</div>
            <Link to="/estimate" style={{ fontSize:13, color:'#6366F1', fontWeight:600 }}>Create your first job →</Link>
          </div>
        ) : (
          <div>
            {jobs.slice(0,8).map((job,i) => {
              const [avBg, avColor] = (AV_COLORS[i % AV_COLORS.length]).split(':')
              const s = STATUS_COLORS[job.status] ?? STATUS_COLORS.new
              return (
                <Link key={job.id} to={`/jobs/${job.id}`}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderBottom:'0.5px solid #F8FAFF', textDecoration:'none', transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFF'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:avColor, flexShrink:0 }}>
                    {initials(job.customer?.full_name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{job.customer?.full_name}</span>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:s.bg, color:s.color, flexShrink:0 }}>{STATUS_LABELS[job.status]}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {job.from_address} → {job.to_address}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>${(job.total_price??0).toLocaleString()}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{format(new Date(job.move_date),'MMM d')}</div>
                  </div>
                  <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink:0 }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
