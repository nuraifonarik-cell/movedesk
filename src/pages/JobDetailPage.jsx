import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getJob, updateJob, getCrew, supabase } from '../lib/supabase'
import { downloadInvoice } from '../lib/invoice'
import { format } from 'date-fns'
import { ArrowLeft, MapPin, Users, DollarSign, Phone, Mail, Truck, ClipboardList, CheckCircle2, FileText, Eye, UserCheck, HardHat } from 'lucide-react'

const STATUSES = [
  { value:'new',         label:'New',         color:'#1D4ED8', bg:'#EFF6FF', border:'#BFDBFE' },
  { value:'scheduled',   label:'Scheduled',   color:'#059669', bg:'#F0FDF4', border:'#BBF7D0' },
  { value:'in_progress', label:'In Progress', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  { value:'completed',   label:'Completed',   color:'#059669', bg:'#ECFDF5', border:'#6EE7B7' },
  { value:'cancelled',   label:'Cancelled',   color:'#94A3B8', bg:'#F1F5F9', border:'#CBD5E1' },
]
const APT = { studio:'Studio', '1br':'1 Bedroom', '2br':'2 Bedrooms', '3br':'3 Bedrooms', house:'House' }
const ROLE_LABELS = { driver:'Driver', mover:'Mover', lead:'Lead', foreman:'Foreman', helper:'Helper' }
const AV_COLORS = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']
const card = { background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:18 }
const sectionTitle = { fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]         = useState(null)
  const [crew, setCrew]       = useState([])
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)
  const [crewSaving, setCrewSaving]     = useState({})
  const [noteSaving, setNoteSaving]     = useState(false)
  const [noteSaved, setNoteSaved]       = useState(false)
  const [notes, setNotes]               = useState('')
  const [error, setError]               = useState('')

  useEffect(() => {
    Promise.all([getJob(id), getCrew()]).then(([j, c]) => {
      setJob(j); setNotes(j.notes ?? ''); setCrew(c); setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const statusInfo = STATUSES.find(s => s.value === job?.status) ?? STATUSES[0]

  // ── Fix: always wrap in try/finally so saving never stays true ──
  const changeStatus = async (status) => {
    if (statusSaving) return
    if (status === job?.status) return  // same status, do nothing
    setStatusSaving(true); setError('')
    try {
      const { data, error: err } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (err) throw err
      setJob(j => ({...j, status: data.status ?? status}))
    } catch (e) {
      setError('Status update failed: ' + (e?.message ?? 'Unknown error'))
    } finally {
      setStatusSaving(false)  // always unblocks
    }
  }

  const toggleCrew = async (memberId) => {
    if (crewSaving[memberId]) return
    setCrewSaving(s => ({...s, [memberId]: true}))
    try {
      const assigned = job.assignments?.find(a => a.crew_member_id === memberId)
      if (assigned) {
        await supabase.from('job_assignments').delete().eq('id', assigned.id)
        const newAssignments = job.assignments.filter(a => a.id !== assigned.id)
        setJob(j => ({...j, assignments: newAssignments}))
        // If no crew left and job was scheduled → back to new
        if (newAssignments.length === 0 && job.status === 'scheduled') {
          await supabase.from('jobs').update({ status:'new' }).eq('id', id)
          setJob(j => ({...j, status:'new'}))
        }
      } else {
        // Check if this is a foreman role
        const member = crew.find(c => c.id === memberId)
        const isForeman = (member?.role_type === 'foreman') || (member?.role === 'lead')
        const { data } = await supabase
          .from('job_assignments')
          .insert({ job_id: id, crew_member_id: memberId })
          .select('*, crew_member:crew_members(*)')
          .single()
        const newAssignments = [...(job.assignments ?? []), data]
        setJob(j => ({...j, assignments: newAssignments}))
        // Auto-schedule when foreman is assigned and job is new
        if (isForeman && job.status === 'new') {
          await supabase.from('jobs').update({ status:'scheduled' }).eq('id', id)
          setJob(j => ({...j, status:'scheduled'}))
        }
      }
    } catch (e) {
      setError('Failed to update crew: ' + e.message)
    } finally {
      setCrewSaving(s => ({...s, [memberId]: false}))
    }
  }

  const saveNotes = async () => {
    setNoteSaving(true)
    try {
      await updateJob(id, { notes })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } finally {
      setNoteSaving(false)
    }
  }

  const isAssigned = (memberId) => job?.assignments?.some(a => a.crew_member_id === memberId)

  // Group crew by role
  const foremans = crew.filter(m => (m.role_type ?? m.role) === 'foreman' || m.role === 'lead')
  const helpers  = crew.filter(m => (m.role_type ?? m.role) === 'helper' || m.role === 'mover')
  const drivers  = crew.filter(m => (m.role_type ?? m.role) === 'driver')

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94A3B8',fontSize:14}}>Loading...</div>
  if (!job)    return <div style={{padding:40,textAlign:'center',color:'#94A3B8',fontSize:14}}>Job not found. <Link to="/jobs">← Back</Link></div>

  const labor   = (job.base_rate ?? 0) * (job.estimated_hours ?? 0)
  const total   = job.actual_total ?? job.total_price ?? 0
  const deposit = job.deposit_amount ?? job.deposit_paid ?? 0

  return (
    <div style={{padding:20, fontFamily:"'Inter',system-ui,sans-serif", maxWidth:1000}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <button onClick={() => navigate('/jobs')}
          style={{background:'white', border:'0.5px solid #E2E8F0', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0}}>
          <ArrowLeft size={16} color="#64748B" />
        </button>
        <div style={{flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
            <h1 style={{fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px'}}>{job.customer?.full_name}</h1>
            <span style={{fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20, background:statusInfo.bg, color:statusInfo.color, border:`1px solid ${statusInfo.border}`}}>
              {statusInfo.label}
            </span>
          </div>
          <p style={{fontSize:12, color:'#94A3B8', margin:'3px 0 0'}}>
            {job.bl_number ?? `BL-${id?.slice(0,6).toUpperCase()}`} · Created {format(new Date(job.created_at), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {error && (
        <div style={{background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:13, padding:'10px 14px', borderRadius:10, marginBottom:16}}>
          {error} <button onClick={() => setError('')} style={{marginLeft:8, background:'none', border:'none', cursor:'pointer', color:'#DC2626', fontWeight:700}}>✕</button>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:16}} className="job-detail-grid">

        {/* LEFT */}
        <div style={{display:'flex', flexDirection:'column', gap:14}}>

          {/* Move Details */}
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
                ['Home', APT[job.apt_type] ?? job.apt_type],
                ['Distance', `${job.distance_miles} mi`],
                ['Crew Size', `${job.movers_count} movers`],
              ].map(([label, val]) => (
                <div key={label} style={{background:'#F8FAFF', borderRadius:10, padding:'10px 12px'}}>
                  <div style={{fontSize:10, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', marginBottom:3}}>{label}</div>
                  <div style={{fontSize:12, fontWeight:700, color:'#0F172A'}}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status — smart logic */}
          <div style={card}>
            <h2 style={sectionTitle}><ClipboardList size={14} color="#94A3B8"/>Job Status</h2>

            {/* Current status display */}
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'12px 16px', background: statusInfo.bg, borderRadius:12, border:`1.5px solid ${statusInfo.border}`}}>
              <CheckCircle2 size={18} color={statusInfo.color}/>
              <div>
                <div style={{fontSize:15, fontWeight:800, color:statusInfo.color}}>{statusInfo.label}</div>
                <div style={{fontSize:11, color:'#64748B', marginTop:1}}>
                  {job.status==='new' && 'Assign foreman to schedule this job'}
                  {job.status==='scheduled' && 'Waiting for foreman to start on site'}
                  {job.status==='in_progress' && 'Foreman is working — contract in progress'}
                  {job.status==='completed' && 'Job completed and contract signed'}
                  {job.status==='cancelled' && 'This job has been cancelled'}
                </div>
              </div>
            </div>

            {/* Dispatcher can only cancel (or un-cancel back to new) */}
            {job.status === 'scheduled' && (
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={statusSaving}
                style={{display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:'1.5px solid #FECACA', background:'#FEF2F2', color:'#DC2626', fontSize:13, fontWeight:700, cursor:'pointer', width:'100%', justifyContent:'center'}}>
                ✕ Cancel This Job
              </button>
            )}
            {job.status === 'new' && (
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={statusSaving}
                style={{display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:'1.5px solid #FECACA', background:'#FEF2F2', color:'#DC2626', fontSize:13, fontWeight:700, cursor:'pointer', width:'100%', justifyContent:'center'}}>
                ✕ Cancel This Job
              </button>
            )}
            {job.status === 'cancelled' && (
              <button
                onClick={() => changeStatus('new')}
                disabled={statusSaving}
                style={{display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:'1.5px solid #BFDBFE', background:'#EFF6FF', color:'#1D4ED8', fontSize:13, fontWeight:700, cursor:'pointer', width:'100%', justifyContent:'center'}}>
                ↩ Restore to New
              </button>
            )}
            {statusSaving && <div style={{fontSize:12, color:'#94A3B8', textAlign:'center', marginTop:8}}>Saving...</div>}
            {['in_progress','completed'].includes(job.status) && (
              <div style={{fontSize:12, color:'#94A3B8', textAlign:'center', padding:'8px 0'}}>
                Status is controlled by foreman via Crew App
              </div>
            )}
          </div>

          {/* Crew Assignment — dropdowns */}
          <div style={card}>
            <h2 style={sectionTitle}><Users size={14} color="#94A3B8"/>Assign Crew</h2>
            {crew.length === 0 ? (
              <p style={{fontSize:13, color:'#94A3B8'}}>No active crew. <Link to="/crew" style={{color:'#1D4ED8'}}>Add crew members →</Link></p>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {[
                  { label:'Foreman', icon: UserCheck, color:'#1D4ED8', bg:'#EFF6FF', members: foremans, single: true },
                  { label:'Helpers', icon: HardHat,  color:'#059669', bg:'#F0FDF4', members: helpers, single: false },
                  { label:'Driver',  icon: Truck,    color:'#D97706', bg:'#FFFBEB', members: drivers, single: true },
                ].map(group => (
                  <div key={group.label} style={{display:'flex', flexDirection:'column', gap:6}}>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <div style={{width:22, height:22, borderRadius:6, background:group.bg, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <group.icon size={12} color={group.color} />
                      </div>
                      <span style={{fontSize:12, fontWeight:700, color:group.color}}>{group.label}</span>
                      {group.members.length === 0 && <span style={{fontSize:11, color:'#94A3B8'}}>(none added yet)</span>}
                    </div>
                    {group.members.length > 0 && (
                      <select
                        multiple={!group.single}
                        size={group.single ? 1 : Math.min(group.members.length, 4)}
                        onChange={e => {
                          const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                          // Toggle each member
                          group.members.forEach(m => {
                            const shouldBeAssigned = selected.includes(m.id)
                            const isCurrentlyAssigned = isAssigned(m.id)
                            if (shouldBeAssigned !== isCurrentlyAssigned) toggleCrew(m.id)
                          })
                        }}
                        style={{
                          width:'100%', border:`1.5px solid ${group.color}33`,
                          borderRadius:10, padding:'4px',
                          fontSize:13, fontFamily:'inherit', outline:'none',
                          background: group.bg + '66'
                        }}
                      >
                        {group.single && <option value="">— Select {group.label} —</option>}
                        {group.members.map(m => (
                          <option key={m.id} value={m.id}
                            selected={isAssigned(m.id)}
                            style={{padding:'8px 10px', fontWeight: isAssigned(m.id) ? 700 : 400}}>
                            {isAssigned(m.id) ? '✓ ' : '  '}{m.full_name} {m.phone ? `· ${m.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {/* Show assigned names as chips */}
                    {(() => {
                      const assignedMembers = group.members.filter(m => isAssigned(m.id))
                      if (!assignedMembers.length) return null
                      return (
                        <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:2}}>
                          {assignedMembers.map(m => (
                            <span key={m.id} style={{display:'inline-flex', alignItems:'center', gap:5, background:group.bg, color:group.color, border:`1px solid ${group.color}44`, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700}}>
                              {m.full_name}
                              <button onClick={() => toggleCrew(m.id)}
                                style={{background:'none', border:'none', cursor:'pointer', color:group.color, fontSize:14, lineHeight:1, padding:0, display:'flex', alignItems:'center'}}>
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={card}>
            <h2 style={sectionTitle}>Notes</h2>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Elevator? Piano? Fragile items? Door code?"
              style={{width:'100%', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', background:'#F8FAFF'}} />
            <button onClick={saveNotes} disabled={noteSaving}
              style={{marginTop:8, padding:'9px 20px', borderRadius:10, border:'none', background:noteSaved?'#059669':'#0F172A', color:'white', fontSize:13, fontWeight:600, cursor:'pointer'}}>
              {noteSaved ? '✓ Saved' : noteSaving ? 'Saving...' : 'Save Notes'}
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
                <a href={`tel:${job.customer.phone}`}
                  style={{display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#F0FDF4', borderRadius:10, textDecoration:'none', color:'#059669', fontSize:13, fontWeight:600}}>
                  <Phone size={13}/> {job.customer.phone}
                </a>
              )}
              {job.customer?.email && (
                <a href={`mailto:${job.customer.email}`}
                  style={{display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#F8FAFF', borderRadius:10, textDecoration:'none', color:'#64748B', fontSize:13}}>
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
                ['Travel fee', `$${job.travel_fee ?? 0}`],
                ['Materials', `$${job.materials_fee ?? 0}`],
              ].map(([k, v]) => (
                <div key={k} style={{display:'flex', justifyContent:'space-between', color:'#64748B'}}>
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{borderTop:'0.5px solid #E2E8F0', paddingTop:10, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:17, color:'#0F172A'}}>
                <span>Est. Total</span>
                <span style={{color:'#1D4ED8'}}>${(job.total_price??0).toLocaleString()}</span>
              </div>
              {job.actual_total && (
                <div style={{display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:15, color:'#059669'}}>
                  <span>Actual Total</span>
                  <span>${job.actual_total.toLocaleString()}</span>
                </div>
              )}
              {deposit > 0 && (
                <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#059669', fontWeight:600}}>
                  <span>Deposit paid</span><span>−${deposit}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={card}>
            <h2 style={sectionTitle}>Actions</h2>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>

              {/* NEW: needs crew */}
              {job.status === 'new' && (
                <div style={{padding:'12px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, fontSize:12, color:'#92400E', fontWeight:600, display:'flex', alignItems:'center', gap:8}}>
                  ⚠️ Assign crew and change status to Scheduled
                </div>
              )}

              {/* Dispatcher: print contract after completion */}
              {job.status === 'completed' && (
                <>
                  <div style={{padding:'10px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, fontSize:12, color:'#065F46', fontWeight:600}}>
                    ✅ Job completed by foreman
                  </div>
                  <button onClick={() => navigate(`/jobs/${id}/contract-print`)}
                    style={{display:'flex', alignItems:'center', gap:8, padding:'11px 14px', borderRadius:10, border:'1.5px solid #1D4ED8', background:'#EFF6FF', fontSize:13, color:'#1D4ED8', cursor:'pointer', fontWeight:700}}>
                    🖨 Print / View Contract
                  </button>
                  <button onClick={() => navigate(`/jobs/${id}/invoice`)}
                    style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, color:'#374151', cursor:'pointer', fontWeight:500}}>
                    <Eye size={14} color="#6366F1"/> Preview Invoice
                  </button>
                  <button onClick={() => downloadInvoice(job)}
                    style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, color:'#374151', cursor:'pointer', fontWeight:500}}>
                    <FileText size={14} color="#1D4ED8"/> Download Invoice PDF
                  </button>
                </>
              )}

              {/* Scheduled: remind that foreman handles contract */}
              {['scheduled','in_progress'].includes(job.status) && (
                <div style={{padding:'12px 14px', background:'#F8FAFF', border:'1px solid #BFDBFE', borderRadius:10, fontSize:12, color:'#1E40AF'}}>
                  <div style={{fontWeight:700, marginBottom:2}}>📱 Foreman handles the contract</div>
                  <div style={{color:'#3B82F6'}}>Foreman opens contract via Crew App on arrival</div>
                </div>
              )}

              {/* Always: call customer */}
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
        @media(max-width:768px){ .job-detail-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
