import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getJob, updateJob, getCrew, supabase } from '../lib/supabase'
import { downloadInvoice } from '../lib/invoice'
import { format } from 'date-fns'
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Phone, Mail, Truck, ClipboardList, CheckCircle2, FileText, Eye } from 'lucide-react'

const STATUSES = [
  { value:'new',         label:'New',         color:'#1D4ED8', bg:'#EFF6FF' },
  { value:'quoted',      label:'Quoted',       color:'#6D28D9', bg:'#F5F3FF' },
  { value:'scheduled',   label:'Scheduled',    color:'#059669', bg:'#F0FDF4' },
  { value:'in_progress', label:'In Progress',  color:'#D97706', bg:'#FFFBEB' },
  { value:'completed',   label:'Completed',    color:'#059669', bg:'#ECFDF5' },
  { value:'cancelled',   label:'Cancelled',    color:'#94A3B8', bg:'#F1F5F9' },
]
const APT = { studio:'Studio', '1br':'1 Bedroom', '2br':'2 Bedrooms', '3br':'3 Bedrooms', house:'House' }
const ROLE = { driver:'Driver', mover:'Mover', lead:'Lead' }
const AV_COLORS = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']

const card = { background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', padding:18 }
const sectionTitle = { fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]     = useState(null)
  const [crew, setCrew]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [notes, setNotes]     = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    Promise.all([getJob(id), getCrew()]).then(([j,c]) => {
      setJob(j); setNotes(j.notes??''); setCrew(c); setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const statusInfo = STATUSES.find(s => s.value === job?.status) ?? STATUSES[0]

  const changeStatus = async (status) => {
    setSaving(true)
    const updated = await updateJob(id, { status })
    setJob(j => ({...j, ...updated}))
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
      setJob(j => ({...j, assignments: j.assignments.filter(a => a.id !== assigned.id)}))
    } else {
      const { data } = await supabase.from('job_assignments').insert({ job_id:id, crew_member_id:memberId }).select('*, crew_member:crew_members(*)').single()
      setJob(j => ({...j, assignments: [...(j.assignments??[]), data]}))
    }
  }

  const isAssigned = (memberId) => job?.assignments?.some(a => a.crew_member_id === memberId)

  if (loading) return <div style={{padding:40, textAlign:'center', color:'#94A3B8', fontSize:14}}>Loading...</div>
  if (!job)    return <div style={{padding:40, textAlign:'center', color:'#94A3B8', fontSize:14}}>Job not found. <Link to="/jobs">← Back</Link></div>

  const labor   = (job.base_rate??0) * (job.estimated_hours??0)
  const total   = job.total_price ?? 0
  const deposit = job.deposit_paid ?? 0

  return (
    <div style={{padding:20, fontFamily:"'Inter',system-ui,sans-serif", maxWidth:1000}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <button onClick={() => navigate('/jobs')} style={{background:'white', border:'0.5px solid #E2E8F0', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0}}>
          <ArrowLeft size={16} color="#64748B" />
        </button>
        <div style={{flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <h1 style={{fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px'}}>{job.customer?.full_name}</h1>
            <span style={{fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20, background:statusInfo.bg, color:statusInfo.color}}>{statusInfo.label}</span>
          </div>
          <p style={{fontSize:12, color:'#94A3B8', margin:'3px 0 0'}}>Job created {format(new Date(job.created_at), 'MMMM d, yyyy')}</p>
        </div>
        {saving && <span style={{fontSize:12, color:'#94A3B8'}}>Saving...</span>}
      </div>

      {/* Layout: two columns on desktop */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:16}} className="job-detail-grid">

        {/* LEFT */}
        <div style={{display:'flex', flexDirection:'column', gap:14}}>

          {/* Move info */}
          <div style={card}>
            <h2 style={sectionTitle}><Truck size={14} color="#94A3B8"/>Move Details</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
              <div style={{background:'#F8FAFF', borderRadius:10, padding:12}}>
                <div style={{fontSize:10, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', marginBottom:4}}>From</div>
                <div style={{fontSize:13, fontWeight:600, color:'#0F172A'}}>{job.from_address}</div>
              </div>
              <div style={{background:'#F8FAFF', borderRadius:10, padding:12}}>
                <div style={{fontSize:10, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', marginBottom:4}}>To</div>
                <div style={{fontSize:13, fontWeight:600, color:'#0F172A'}}>{job.to_address}</div>
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10}}>
              {[
                ['Date', format(new Date(job.move_date), 'MMM d, yyyy')],
                ['Home Type', APT[job.apt_type]??job.apt_type],
                ['Distance', `${job.distance_miles} mi`],
                ['Crew', `${job.movers_count} movers · ${job.estimated_hours}hrs`],
              ].map(([label,val]) => (
                <div key={label} style={{background:'#F8FAFF', borderRadius:10, padding:'10px 12px'}}>
                  <div style={{fontSize:10, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', marginBottom:3}}>{label}</div>
                  <div style={{fontSize:12, fontWeight:600, color:'#0F172A'}}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div style={card}>
            <h2 style={sectionTitle}><ClipboardList size={14} color="#94A3B8"/>Update Status</h2>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => changeStatus(s.value)} disabled={saving}
                  style={{display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:job.status===s.value?700:500, border:`1.5px solid ${job.status===s.value?s.color:'#E2E8F0'}`, background:job.status===s.value?s.bg:'white', color:job.status===s.value?s.color:'#64748B', transition:'all 0.15s'}}>
                  {job.status===s.value && <CheckCircle2 size={12}/>}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crew */}
          <div style={card}>
            <h2 style={sectionTitle}><Users size={14} color="#94A3B8"/>Assign Crew</h2>
            {crew.length === 0 ? (
              <p style={{fontSize:13, color:'#94A3B8'}}>No active crew members. <Link to="/crew" style={{color:'#1D4ED8'}}>Add crew →</Link></p>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {crew.map((member,i) => {
                  const assigned = isAssigned(member.id)
                  const [avBg,avColor] = AV_COLORS[i%AV_COLORS.length].split(':')
                  const ini = member.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
                  return (
                    <div key={member.id} onClick={() => toggleCrew(member.id)}
                      style={{display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${assigned?'#1D4ED8':'#E2E8F0'}`, background:assigned?'#EFF6FF':'white', cursor:'pointer', transition:'all 0.15s'}}>
                      <div style={{width:32, height:32, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:avColor, flexShrink:0}}>{ini}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13, fontWeight:600, color:'#0F172A'}}>{member.full_name}</div>
                        <div style={{fontSize:11, color:'#94A3B8'}}>{ROLE[member.role]}</div>
                      </div>
                      {assigned && <CheckCircle2 size={16} color="#1D4ED8"/>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={card}>
            <h2 style={sectionTitle}>Notes</h2>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}
              placeholder="Elevator? Piano? Fragile items? Door code?"
              style={{width:'100%', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', background:'#F8FAFF'}}/>
            <button onClick={saveNotes}
              style={{marginTop:8, padding:'9px 20px', borderRadius:10, border:'none', background:noteSaved?'#059669':'#0F172A', color:'white', fontSize:13, fontWeight:600, cursor:'pointer'}}>
              {noteSaved ? '✓ Saved' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{display:'flex', flexDirection:'column', gap:14}}>

          {/* Customer */}
          <div style={card}>
            <h2 style={sectionTitle}><Users size={14} color="#94A3B8"/>Customer</h2>
            <div style={{fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:12}}>{job.customer?.full_name}</div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {job.customer?.phone && (
                <a href={`tel:${job.customer.phone}`} style={{display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#F0FDF4', borderRadius:10, textDecoration:'none', color:'#059669', fontSize:13, fontWeight:600}}>
                  <Phone size={13}/> {job.customer.phone}
                </a>
              )}
              {job.customer?.email && (
                <a href={`mailto:${job.customer.email}`} style={{display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#F8FAFF', borderRadius:10, textDecoration:'none', color:'#64748B', fontSize:13}}>
                  <Mail size={13}/> {job.customer.email}
                </a>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div style={card}>
            <h2 style={sectionTitle}><DollarSign size={14} color="#94A3B8"/>Pricing</h2>
            <div style={{display:'flex', flexDirection:'column', gap:8, fontSize:13}}>
              {[
                [`Labor (${job.movers_count} × ${job.estimated_hours}hrs)`, `$${labor.toLocaleString()}`],
                ['Travel fee', `$${job.travel_fee??0}`],
                ['Materials', `$${job.materials_fee??0}`],
              ].map(([k,v]) => (
                <div key={k} style={{display:'flex', justifyContent:'space-between', color:'#64748B'}}>
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{borderTop:'0.5px solid #E2E8F0', paddingTop:10, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:17, color:'#0F172A'}}>
                <span>Total</span>
                <span style={{color:'#1D4ED8'}}>${total.toLocaleString()}</span>
              </div>
              {deposit > 0 && (
                <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#059669', fontWeight:600}}>
                  <span>Deposit paid</span><span>${deposit.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={card}>
            <h2 style={sectionTitle}>Actions</h2>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              <button onClick={() => navigate(`/jobs/${id}/invoice`)}
                style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, color:'#374151', cursor:'pointer', fontWeight:500}}>
                <Eye size={14} color="#6366F1"/> Preview Invoice
              </button>
              <button onClick={() => downloadInvoice(job)}
                style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, color:'#374151', cursor:'pointer', fontWeight:500}}>
                <FileText size={14} color="#1D4ED8"/> Download Invoice PDF
              </button>
              {job.customer?.phone && (
                <a href={`tel:${job.customer.phone}`}
                  style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, color:'#374151', textDecoration:'none', fontWeight:500}}>
                  <Phone size={14} color="#059669"/> Call Customer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:768px){
          .job-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
