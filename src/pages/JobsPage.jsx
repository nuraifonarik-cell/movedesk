import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs, updateJob } from '../lib/supabase'
import { format } from 'date-fns'
import { Search, Plus, ChevronRight } from 'lucide-react'

const FILTERS = [
  { value:'', label:'All' }, { value:'new', label:'New' }, { value:'quoted', label:'Quoted' },
  { value:'scheduled', label:'Scheduled' }, { value:'in_progress', label:'In Progress' },
  { value:'completed', label:'Completed' }, { value:'cancelled', label:'Cancelled' },
]
const STATUS = {
  new:         { bg:'#EFF6FF', color:'#1D4ED8', label:'New' },
  quoted:      { bg:'#F5F3FF', color:'#6D28D9', label:'Quoted' },
  scheduled:   { bg:'#F0FDF4', color:'#059669', label:'Scheduled' },
  in_progress: { bg:'#FFFBEB', color:'#D97706', label:'In Progress' },
  completed:   { bg:'#ECFDF5', color:'#059669', label:'Completed' },
  cancelled:   { bg:'#F1F5F9', color:'#94A3B8', label:'Cancelled' },
}
const APT = { studio:'Studio', '1br':'1 BR', '2br':'2 BR', '3br':'3 BR', house:'House' }
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '??'
const AV_COLORS = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']

export default function JobsPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    getJobs(filter ? { status:filter } : {}).then(d => setJobs(d??[])).finally(()=>setLoading(false))
  }, [filter])

  const filtered = jobs.filter(j => {
    if (!search) return true
    const q = search.toLowerCase()
    return j.customer?.full_name?.toLowerCase().includes(q) || j.from_address?.toLowerCase().includes(q) || j.to_address?.toLowerCase().includes(q)
  })

  const changeStatus = async (id, status) => {
    await updateJob(id, { status })
    setJobs(prev => prev.map(j => j.id === id ? {...j, status} : j))
  }

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Jobs</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{filtered.length} jobs found</p>
        </div>
        <Link to="/estimate" style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 3px 12px rgba(99,102,241,0.35)' }}>
          <Plus size={14} /> New Job
        </Link>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, address..."
          style={{ width:'100%', border:'0.5px solid #E2E8F0', borderRadius:12, padding:'10px 12px 10px 36px', fontSize:13, outline:'none', background:'white', boxSizing:'border-box' }} />
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:2 }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={()=>setFilter(f.value)}
            style={{ flexShrink:0, padding:'6px 14px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background: filter===f.value ? 'linear-gradient(135deg,#1D4ED8,#6366F1)' : 'white', color: filter===f.value ? 'white' : '#64748B', boxShadow: filter===f.value ? '0 2px 8px rgba(99,102,241,0.35)' : '0 0 0 0.5px #E2E8F0' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14 }}>No jobs found</div>
        ) : filtered.map((job,i) => {
          const [avBg, avColor] = (AV_COLORS[i%AV_COLORS.length]).split(':')
          const s = STATUS[job.status] ?? STATUS.new
          return (
            <Link key={job.id} to={`/jobs/${job.id}`}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'0.5px solid #F8FAFF', textDecoration:'none' }}
              onMouseEnter={e=>e.currentTarget.style.background='#F8FAFF'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:avColor, flexShrink:0 }}>
                {initials(job.customer?.full_name)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{job.customer?.full_name}</span>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:s.bg, color:s.color, flexShrink:0 }}>{s.label}</span>
                </div>
                <div style={{ fontSize:11, color:'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {job.from_address} → {job.to_address}
                </div>
                <div style={{ fontSize:11, color:'#CBD5E1', marginTop:2 }}>
                  {format(new Date(job.move_date),'MMM d, yyyy')} · {APT[job.apt_type]} · {job.customer?.phone}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#0F172A' }}>${(job.total_price??0).toLocaleString()}</div>
              </div>
              <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink:0 }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
