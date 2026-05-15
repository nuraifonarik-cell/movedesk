import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getJob, getCrew, supabase, calcPrice } from '../lib/supabase'
import { downloadInvoice } from '../lib/invoice'
import { format } from 'date-fns'
import { ArrowLeft, Users, DollarSign, Phone, Mail, Truck, ClipboardList, CheckCircle2, FileText, Eye, UserCheck, HardHat } from 'lucide-react'

const STATUSES = [
  { value:'new',         label:'New',         color:'#1D4ED8', bg:'#EFF6FF', border:'#BFDBFE' },
  { value:'scheduled',   label:'Scheduled',   color:'#059669', bg:'#F0FDF4', border:'#BBF7D0' },
  { value:'in_progress', label:'In Progress', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  { value:'completed',   label:'Completed',   color:'#059669', bg:'#ECFDF5', border:'#6EE7B7' },
  { value:'cancelled',   label:'Cancelled',   color:'#94A3B8', bg:'#F1F5F9', border:'#CBD5E1' },
]
const APT = { studio:'Studio', '1br':'1 Bedroom', '2br':'2 Bedrooms', '3br':'3 Bedrooms', house:'House' }
const AV_COLORS = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']
const card = { background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:18 }
const sectionTitle = { fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }

function CrewButton({ member, assigned, busy, locked, color, bg, onToggle, index }) {
  const [avBg, avColor] = AV_COLORS[index % AV_COLORS.length].split(':')
  const ini = member.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
  return (
    <div>
      {busy && <div style={{fontSize:11, color:'#D97706', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'4px 10px', marginBottom:4}}>⚠️ {member.full_name} has another job this day</div>}
      <div onClick={() => !locked && onToggle(member.id)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, cursor:locked?'not-allowed':'pointer', border:`1.5px solid ${assigned?color:'#E2E8F0'}`, background:assigned?bg:locked?'#F8FAFF':'white', opacity:locked?0.65:1, transition:'all 0.15s', userSelect:'none' }}>
        <div style={{width:30, height:30, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:avColor, flexShrink:0}}>{ini}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:600, color:'#0F172A'}}>{member.full_name}</div>
          <div style={{fontSize:11, color:'#94A3B8'}}>{member.phone}</div>
        </div>
        {locked ? <span style={{fontSize:11, color:'#94A3B8'}}>wait...</span>
          : assigned ? <div style={{width:22, height:22, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><span style={{color:'white', fontSize:13, fontWeight:800}}>✓</span></div>
          : <div style={{width:22, height:22, borderRadius:'50%', border:`1.5px solid #E2E8F0`, flexShrink:0}}/>}
      </div>
    </div>
  )
}

function HelperPicker({ members, isAssigned, busyMap, isLocked, crewLocked, onToggle, assignedCount }) {
  const [search, setSearch] = useState('')
  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.phone?.includes(search)
  )
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
        <HardHat size={13} color="#059669"/>
        <span style={{fontSize:12,fontWeight:700,color:'#059669'}}>Helpers</span>
        {assignedCount > 0 && (
          <span style={{fontSize:10,color:'#059669',background:'#D1FAE5',padding:'1px 8px',borderRadius:20,fontWeight:700}}>
            {assignedCount} selected
          </span>
        )}
        {crewLocked && <span style={{fontSize:10,color:'#94A3B8',marginLeft:4}}>saving...</span>}
      </div>
      {members.length > 5 && (
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search helpers..."
          style={{width:'100%',border:'1px solid #E2E8F0',borderRadius:8,padding:'7px 12px',fontSize:13,outline:'none',fontFamily:'inherit',marginBottom:6,boxSizing:'border-box'}}/>
      )}
      <div style={{border:'1px solid #E2E8F0',borderRadius:10,overflow:'hidden',maxHeight:220,overflowY:'auto'}}>
        {filtered.length === 0
          ? <div style={{padding:14,textAlign:'center',color:'#94A3B8',fontSize:13}}>No helpers found</div>
          : filtered.map((m,i) => {
            const checked = isAssigned(m.id)
            const busy = busyMap[m.id] && !checked
            return (
              <div key={m.id} onClick={() => !isLocked && !crewLocked && onToggle(m.id)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:i<filtered.length-1?'0.5px solid #F1F5F9':'none',background:checked?'#F0FDF4':'white',cursor:isLocked||crewLocked?'not-allowed':'pointer',transition:'background 0.1s'}}>
                <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${checked?'#059669':'#CBD5E1'}`,background:checked?'#059669':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {checked && <span style={{color:'white',fontSize:12,fontWeight:800,lineHeight:1}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:13,fontWeight:checked?700:400,color:'#0F172A'}}>{m.full_name}</span>
                  <span style={{fontSize:11,color:'#94A3B8',marginLeft:8}}>{m.phone}</span>
                </div>
                {busy && <span style={{fontSize:10,color:'#D97706',flexShrink:0}}>⚠️ busy</span>}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]           = useState(null)
  const [crew, setCrew]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [notes, setNotes]       = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved]   = useState(false)
  const [crewLocked, setCrewLocked] = useState(false)
  const processingRef = useRef(false)  // hard lock against re-entry
  const [busyMap, setBusyMap]       = useState({})
  const [editMode, setEditMode]     = useState(false)
  const [editForm, setEditForm]     = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [renderKey, setRenderKey]   = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [j, c] = await Promise.all([getJob(id), getCrew()])
        setJob(j); setNotes(j.notes ?? ''); setCrew(c)
        setEditForm({ full_name:j.customer?.full_name??'', phone:j.customer?.phone??'', email:j.customer?.email??'', from_address:j.from_address??'', to_address:j.to_address??'', move_date:j.move_date??'', apt_type:j.apt_type??'1br', distance_miles:j.distance_miles??10, movers_count:j.movers_count??3, notes:j.notes??'' })
        if (j.move_date) {
          const { data: asgn } = await supabase.from('job_assignments').select('crew_member_id, job:jobs(id, status, move_date, customer:customers(full_name))')
          const map = {}
          asgn?.forEach(a => { if (a.job?.id !== id && a.job?.move_date === j.move_date && ['scheduled','in_progress'].includes(a.job?.status)) map[a.crew_member_id] = a.job })
          setBusyMap(map)
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const isAssigned = memberId => job?.assignments?.some(a => a.crew_member_id === memberId)
  const statusInfo = STATUSES.find(s => s.value === job?.status) ?? STATUSES[0]
  const isLocked = ['in_progress','completed','cancelled'].includes(job?.status)

  // assignCrew: handles single or swap operations atomically
  const assignCrew = async (removeId, addId, role) => {
    if (removeId === addId) return
    if (!removeId && !addId) return
    if (processingRef.current) return  // use ref not state for instant lock
    processingRef.current = true
    setCrewLocked(true); setError('')
    try {
      let assignments = [...(job.assignments ?? [])]

      // Remove old
      if (removeId) {
        const row = assignments.find(a => a.crew_member_id === removeId)
        if (row) {
          const { error: e } = await supabase.from('job_assignments').delete().eq('id', row.id)
          if (e) throw e
          assignments = assignments.filter(a => a.id !== row.id)
        }
      }

      // Add new
      if (addId) {
        const { data, error: e } = await supabase
          .from('job_assignments')
          .insert({ job_id: id, crew_member_id: addId })
          .select('*, crew_member:crew_members(*)')
          .single()
        if (e) throw e
        assignments = [...assignments, data]
      }

      // Update status
      const foremanLeft = assignments.some(a => {
        const m = crew.find(c => c.id === a.crew_member_id)
        return m?.role_type === 'foreman' || m?.role === 'lead'
      })
      let ns = job.status
      if (foremanLeft && job.status === 'new') {
        await supabase.from('jobs').update({ status: 'scheduled' }).eq('id', id)
        ns = 'scheduled'
      } else if (!foremanLeft && job.status === 'scheduled') {
        await supabase.from('jobs').update({ status: 'new' }).eq('id', id)
        ns = 'new'
      }

      setJob(j => ({ ...j, assignments, status: ns }))
    } catch (e) {
      setError('Crew update failed: ' + (e?.message ?? ''))
    } finally {
      processingRef.current = false
      setCrewLocked(false)
    }
  }

  // Simple toggle for helpers (checkbox)
  const toggleHelper = (memberId) => {
    const assigned = job.assignments?.find(a => a.crew_member_id === memberId)
    if (assigned) assignCrew(memberId, null, 'helper')
    else assignCrew(null, memberId, 'helper')
  }

  const saveNotes = async () => {
    setNoteSaving(true)
    try { await supabase.from('jobs').update({notes}).eq('id',id); setNoteSaved(true); setTimeout(()=>setNoteSaved(false),2000) }
    finally { setNoteSaving(false) }
  }

  const setEdit = (k,v) => setEditForm(f=>({...f,[k]:v}))

  const saveEdit = async () => {
    setEditSaving(true); setError('')
    try {
      // Calculate price inline — no external function dependency
      const apt  = editForm.apt_type ?? '1br'
      const mov  = Number(editForm.movers_count ?? 3)
      const dis  = Number(editForm.distance_miles ?? 10)
      const hrs  = ({studio:2,'1br':4,'2br':6,'3br':8,house:10})[apt] ?? 4
      const rate = ({2:120,3:165,4:210})[mov] ?? 165
      const mats = ({studio:40,'1br':75,'2br':110,'3br':150,house:200})[apt] ?? 75
      const trav = Math.round(dis * 2.5)
      const total = rate * hrs + trav + mats

      // Update customer — non-blocking, don't fail if customer update fails
      const custId = job.customer?.id ?? job.customer_id
      if (custId) {
        await supabase.from('customers')
          .update({full_name:editForm.full_name, phone:editForm.phone, email:editForm.email||null})
          .eq('id', custId)
          .then(({error}) => { if (error) console.warn('customer update:', error.message) })
      }

      // Update job — this is the important one
      console.log('saveEdit sending:', { apt, mov, dis, hrs, rate, mats, trav, total })
      const { error: e } = await supabase.from('jobs').update({
        from_address:    editForm.from_address,
        to_address:      editForm.to_address,
        move_date:       editForm.move_date,
        apt_type:        apt,
        distance_miles:  dis,
        movers_count:    mov,
        notes:           editForm.notes || null,
        estimated_hours: hrs,
        base_rate:       rate,
        travel_fee:      trav,
        materials_fee:   mats,
        total_price:     total,
      }).eq('id', id)

      if (e) throw e

      // Reload from DB to get fresh data including new total_price
      const fresh = await getJob(id)
      console.log('fresh job total_price:', fresh.total_price)
      setJob({...fresh})  // spread forces new object reference
      setNotes(fresh.notes ?? '')
      setRenderKey(k => k + 1)  // force re-render
      setEditMode(false)
    } catch (e) {
      console.error('saveEdit error:', e)
      setError('Failed to save: ' + (e?.message ?? 'Unknown error'))
    }
    finally { setEditSaving(false) }
  }

  const deleteJob = async () => {
    if (!confirm('Delete this job permanently? This cannot be undone.')) return
    setDeleting(true)
    try {
      await supabase.from('job_assignments').delete().eq('job_id',id)
      await supabase.from('contract_signatures').delete().eq('job_id',id)
      await supabase.from('jobs').delete().eq('id',id)
      navigate('/jobs')
    } catch (e) { setError('Delete failed: '+(e?.message??'')); setDeleting(false) }
  }

  const getRoleKey = m => m.role_type??(m.role==='lead'?'foreman':m.role==='driver'?'driver':'helper')
  const crewGroups = [
    {label:'Foreman',icon:UserCheck,color:'#1D4ED8',bg:'#EFF6FF',members:crew.filter(m=>getRoleKey(m)==='foreman')},
    {label:'Helpers', icon:HardHat, color:'#059669',bg:'#F0FDF4',members:crew.filter(m=>getRoleKey(m)==='helper')},
    {label:'Driver',  icon:Truck,   color:'#D97706',bg:'#FFFBEB',members:crew.filter(m=>getRoleKey(m)==='driver')},
  ].filter(g=>g.members.length>0)

  const labor   = (job?.base_rate??0)*(job?.estimated_hours??0)
  const deposit = job?.deposit_amount??job?.deposit_paid??0
  const inp = {width:'100%',border:'1px solid #E2E8F0',borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',background:'white',boxSizing:'border-box',fontFamily:'inherit'}



  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Loading...</div>
  if (!job)    return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Job not found. <Link to="/jobs">← Back</Link></div>

  return (
    <div key={renderKey} style={{padding:20,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:1000}}>

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={()=>navigate('/jobs')} style={{background:'white',border:'0.5px solid #E2E8F0',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <ArrowLeft size={16} color="#64748B"/>
        </button>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <h1 style={{fontSize:20,fontWeight:800,color:'#0F172A',margin:0,letterSpacing:'-0.4px'}}>{job.customer?.full_name}</h1>
            <span style={{fontSize:12,fontWeight:700,padding:'4px 12px',borderRadius:20,background:statusInfo.bg,color:statusInfo.color,border:`1px solid ${statusInfo.border}`}}>{statusInfo.label}</span>
          </div>
          <p style={{fontSize:12,color:'#94A3B8',margin:'3px 0 0'}}>{job.bl_number??`BL-${id?.slice(0,6).toUpperCase()}`} · {format(new Date(job.created_at),'MMMM d, yyyy')}</p>
        </div>
      </div>

      {error && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',color:'#DC2626',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>{error}<button onClick={()=>setError('')} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',fontWeight:700,fontSize:16,padding:0}}>✕</button></div>}

      {job.status!=='completed' && (
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {['new','scheduled'].includes(job.status) && <button onClick={()=>setEditMode(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:'1px solid #E2E8F0',background:'white',fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'}}>✏️ Edit Job</button>}
          <button onClick={deleteJob} disabled={deleting} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:'1px solid #FECACA',background:'#FEF2F2',fontSize:13,fontWeight:600,color:'#DC2626',cursor:deleting?'not-allowed':'pointer',opacity:deleting?0.7:1}}>{deleting?'Deleting...':'🗑 Delete Job'}</button>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16}} className="job-detail-grid">
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          <div style={card}>
            <h2 style={sectionTitle}><Truck size={14} color="#94A3B8"/>Move Details</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div style={{background:'#F8FAFF',borderRadius:10,padding:12}}><div style={{fontSize:10,color:'#94A3B8',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>From</div><div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{job.from_address}</div></div>
              <div style={{background:'#F8FAFF',borderRadius:10,padding:12}}><div style={{fontSize:10,color:'#94A3B8',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>To</div><div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{job.to_address}</div></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              {[['Date',format(new Date(job.move_date),'MMM d, yyyy')],['Home',APT[job.apt_type]??job.apt_type],['Distance',`${job.distance_miles} mi`],['Crew',`${job.movers_count} movers`]].map(([label,val])=>(
                <div key={label} style={{background:'#F8FAFF',borderRadius:10,padding:'10px 12px'}}><div style={{fontSize:10,color:'#94A3B8',fontWeight:700,textTransform:'uppercase',marginBottom:3}}>{label}</div><div style={{fontSize:12,fontWeight:700,color:'#0F172A'}}>{val}</div></div>
              ))}
            </div>
          </div>

          <div style={card}>
            <h2 style={sectionTitle}><ClipboardList size={14} color="#94A3B8"/>Job Status</h2>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:statusInfo.bg,borderRadius:12,border:`1.5px solid ${statusInfo.border}`}}>
              <CheckCircle2 size={18} color={statusInfo.color}/>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:statusInfo.color}}>{statusInfo.label}</div>
                <div style={{fontSize:11,color:'#64748B',marginTop:1}}>
                  {job.status==='new'&&'Assign foreman to schedule this job'}
                  {job.status==='scheduled'&&'Waiting for foreman to start on site'}
                  {job.status==='in_progress'&&'Foreman is working — contract in progress'}
                  {job.status==='completed'&&'Job completed and contract signed'}
                  {job.status==='cancelled'&&'This job has been cancelled'}
                </div>
              </div>
            </div>
            {['in_progress','completed'].includes(job.status)&&<div style={{fontSize:12,color:'#94A3B8',textAlign:'center',paddingTop:10}}>Status is controlled by foreman via Crew App</div>}
          </div>

          <div style={card}>
            <h2 style={sectionTitle}>
              <Users size={14} color="#94A3B8"/>
              {isLocked ? 'Assigned Crew' : 'Assign Crew'}
              {crewLocked && <span style={{fontSize:11,color:'#94A3B8',marginLeft:6}}>Saving...</span>}
            </h2>

            {isLocked && (
              <div style={{padding:'10px 14px',background:'#F8FAFF',borderRadius:10,fontSize:12,color:'#64748B',marginBottom:12}}>
                🔒 {job.status==='in_progress'?'Job in progress — crew is locked':job.status==='completed'?'Job completed — crew is locked':'Job cancelled'}
              </div>
            )}

            {crew.length === 0
              ? <p style={{fontSize:13,color:'#94A3B8'}}>No active crew. <Link to="/crew" style={{color:'#1D4ED8'}}>Add crew →</Link></p>
              : (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {/* FOREMAN — click buttons, no dropdown */}
                  {(() => {
                    const members = crew.filter(m => getRoleKey(m) === 'foreman')
                    if (!members.length) return null
                    const cur = job.assignments?.find(a => members.some(m => m.id === a.crew_member_id))
                    const curId = cur?.crew_member_id ?? ''
                    return (
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                          <UserCheck size={13} color="#1D4ED8"/>
                          <span style={{fontSize:12,fontWeight:700,color:'#1D4ED8'}}>Foreman</span>
                          {crewLocked && <span style={{fontSize:10,color:'#94A3B8'}}>saving...</span>}
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {members.map(m => {
                            const selected = m.id === curId
                            const busy = busyMap[m.id] && !selected
                            return (
                              <button key={m.id}
                                disabled={isLocked || crewLocked}
                                onClick={() => {
                                  if (isLocked || crewLocked) return
                                  // clicking selected foreman → remove; clicking other → swap
                                  if (selected) assignCrew(m.id, null, 'foreman')
                                  else assignCrew(curId || null, m.id, 'foreman')
                                }}
                                style={{
                                  display:'flex', alignItems:'center', gap:10,
                                  padding:'10px 14px', borderRadius:10, border:'none',
                                  background: selected ? '#EFF6FF' : '#F8FAFF',
                                  outline: selected ? '2px solid #1D4ED8' : '1px solid #E2E8F0',
                                  cursor: isLocked || crewLocked ? 'not-allowed' : 'pointer',
                                  opacity: crewLocked ? 0.6 : 1,
                                  textAlign:'left', width:'100%',
                                }}>
                                <div style={{width:28,height:28,borderRadius:'50%',background:selected?'#1D4ED8':'#E2E8F0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:selected?'white':'#64748B',flexShrink:0}}>
                                  {m.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                                </div>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:selected?700:400,color:'#0F172A'}}>{m.full_name}</div>
                                  <div style={{fontSize:11,color:'#94A3B8'}}>{m.phone}</div>
                                </div>
                                {selected && <span style={{fontSize:12,color:'#1D4ED8',fontWeight:700}}>✓</span>}
                                {busy && <span style={{fontSize:10,color:'#D97706'}}>⚠️</span>}
                              </button>
                            )
                          })}
                        </div>
                        {curId && busyMap[curId] && <div style={{fontSize:11,color:'#D97706',marginTop:4}}>⚠️ Has another job this day</div>}
                      </div>
                    )
                  })()}

                  {/* HELPERS — scrollable list with search */}
                  {(() => {
                    const members = crew.filter(m => getRoleKey(m) === 'helper')
                    if (!members.length) return null
                    const assignedHelpers = members.filter(m => isAssigned(m.id))
                    return (
                      <HelperPicker
                        members={members}
                        isAssigned={isAssigned}
                        busyMap={busyMap}
                        isLocked={isLocked}
                        crewLocked={crewLocked}
                        onToggle={toggleHelper}
                        assignedCount={assignedHelpers.length}
                      />
                    )
                  })()}

                  {/* DRIVER — click buttons */}
                  {(() => {
                    const members = crew.filter(m => getRoleKey(m) === 'driver')
                    if (!members.length) return null
                    const cur = job.assignments?.find(a => members.some(m => m.id === a.crew_member_id))
                    const curId = cur?.crew_member_id ?? ''
                    return (
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                          <Truck size={13} color="#D97706"/>
                          <span style={{fontSize:12,fontWeight:700,color:'#D97706'}}>Driver</span>
                          {crewLocked && <span style={{fontSize:10,color:'#94A3B8'}}>saving...</span>}
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {members.map(m => {
                            const selected = m.id === curId
                            return (
                              <button key={m.id}
                                disabled={isLocked || crewLocked}
                                onClick={() => {
                                  if (isLocked || crewLocked) return
                                  if (selected) assignCrew(m.id, null, 'driver')
                                  else assignCrew(curId || null, m.id, 'driver')
                                }}
                                style={{
                                  display:'flex', alignItems:'center', gap:10,
                                  padding:'10px 14px', borderRadius:10, border:'none',
                                  background: selected ? '#FFFBEB' : '#F8FAFF',
                                  outline: selected ? '2px solid #D97706' : '1px solid #E2E8F0',
                                  cursor: isLocked || crewLocked ? 'not-allowed' : 'pointer',
                                  opacity: crewLocked ? 0.6 : 1,
                                  textAlign:'left', width:'100%',
                                }}>
                                <div style={{width:28,height:28,borderRadius:'50%',background:selected?'#D97706':'#E2E8F0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:selected?'white':'#64748B',flexShrink:0}}>
                                  {m.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                                </div>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:selected?700:400,color:'#0F172A'}}>{m.full_name}</div>
                                  <div style={{fontSize:11,color:'#94A3B8'}}>{m.phone}</div>
                                </div>
                                {selected && <span style={{fontSize:12,color:'#D97706',fontWeight:700}}>✓</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            }
          </div>

          <div style={card}>
            <h2 style={sectionTitle}>Notes</h2>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="Elevator? Piano? Fragile items? Door code?" style={{width:'100%',border:'0.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box',background:'#F8FAFF'}}/>
            <button onClick={saveNotes} disabled={noteSaving} style={{marginTop:8,padding:'9px 20px',borderRadius:10,border:'none',background:noteSaved?'#059669':'#0F172A',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>{noteSaved?'✓ Saved':noteSaving?'Saving...':'Save Notes'}</button>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={card}>
            <h2 style={sectionTitle}><Users size={14} color="#94A3B8"/>Customer</h2>
            <div style={{fontSize:15,fontWeight:700,color:'#0F172A',marginBottom:12}}>{job.customer?.full_name}</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {job.customer?.phone&&<a href={`tel:${job.customer.phone}`} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'#F0FDF4',borderRadius:10,textDecoration:'none',color:'#059669',fontSize:13,fontWeight:600}}><Phone size={13}/> {job.customer.phone}</a>}
              {job.customer?.email&&<a href={`mailto:${job.customer.email}`} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'#F8FAFF',borderRadius:10,textDecoration:'none',color:'#64748B',fontSize:13}}><Mail size={13}/> {job.customer.email}</a>}
            </div>
          </div>

          <div style={card}>
            <h2 style={sectionTitle}><DollarSign size={14} color="#94A3B8"/>Pricing</h2>
            <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:13}}>
              {[[`Labor (${job.movers_count}×${job.estimated_hours}hrs @ $${job.base_rate}/hr)`,`$${labor.toLocaleString()}`],['Travel fee',`$${job.travel_fee??0}`],['Materials',`$${job.materials_fee??0}`]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',color:'#64748B'}}><span style={{fontSize:12}}>{k}</span><span style={{fontWeight:500}}>{v}</span></div>
              ))}
              <div style={{borderTop:'2px solid #0F172A',paddingTop:10,marginTop:4,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}>
                <span>Est. Total</span><span style={{color:'#1D4ED8'}}>${(job.total_price??0).toLocaleString()}</span>
              </div>
              {job.actual_total&&<div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,color:'#059669',marginTop:4}}><span>✅ Actual</span><span>${job.actual_total.toLocaleString()}</span></div>}
              {deposit>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#059669',fontWeight:600}}><span>Deposit paid</span><span>−${deposit}</span></div>}
            </div>
          </div>

          <div style={card}>
            <h2 style={sectionTitle}>Actions</h2>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {job.status==='new'&&<div style={{padding:'12px 14px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,fontSize:12,color:'#92400E',fontWeight:600}}>⚠️ Assign a foreman to schedule this job</div>}
              {['scheduled','in_progress'].includes(job.status)&&<div style={{padding:'12px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,fontSize:12,color:'#065F46'}}><div style={{fontWeight:700,marginBottom:2}}>📱 Foreman handles the contract</div><div>Foreman opens contract via Crew App on arrival</div></div>}
              {job.status==='completed'&&(<>
                <div style={{padding:'10px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,fontSize:12,color:'#065F46',fontWeight:600}}>✅ Job completed by foreman</div>
                <button onClick={()=>navigate(`/jobs/${id}/contract-print`)} style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderRadius:10,border:'1.5px solid #1D4ED8',background:'#EFF6FF',fontSize:13,color:'#1D4ED8',cursor:'pointer',fontWeight:700}}>🖨 Print / View Contract</button>
                <button onClick={()=>navigate(`/jobs/${id}/invoice`)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,border:'0.5px solid #E2E8F0',background:'white',fontSize:13,color:'#374151',cursor:'pointer',fontWeight:500}}><Eye size={14} color="#6366F1"/> Preview Invoice</button>
                <button onClick={()=>downloadInvoice(job)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,border:'0.5px solid #E2E8F0',background:'white',fontSize:13,color:'#374151',cursor:'pointer',fontWeight:500}}><FileText size={14} color="#1D4ED8"/> Download Invoice PDF</button>
              </>)}
              {job.customer?.phone&&<a href={`tel:${job.customer.phone}`} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,border:'0.5px solid #E2E8F0',background:'white',fontSize:13,color:'#374151',textDecoration:'none',fontWeight:500}}><Phone size={14} color="#059669"/> Call Customer</a>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',padding:16}}>
          <div style={{background:'white',borderRadius:16,padding:18,width:'100%',maxWidth:500,maxHeight:'92dvh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 style={{fontSize:17,fontWeight:800,color:'#0F172A',margin:0}}>Edit Job</h2>
              <button onClick={()=>{setEditMode(false);setError('')}} style={{background:'#F1F5F9',border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>

            {/* HOME TYPE + CREW SIZE — first so price reacts immediately */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748B',marginBottom:5}}>Home Type</label>
                <select value={editForm.apt_type??'1br'} onChange={e=>setEdit('apt_type',e.target.value)} style={inp}>
                  <option value="studio">Studio</option>
                  <option value="1br">1 Bedroom</option>
                  <option value="2br">2 Bedrooms</option>
                  <option value="3br">3 Bedrooms</option>
                  <option value="house">House</option>
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748B',marginBottom:5}}>Crew Size</label>
                <select value={editForm.movers_count??3} onChange={e=>setEdit('movers_count',+e.target.value)} style={inp}>
                  <option value={2}>2 Movers</option>
                  <option value={3}>3 Movers</option>
                  <option value={4}>4 Movers</option>
                </select>
              </div>
            </div>

            <div style={{marginBottom:8}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748B',marginBottom:4}}>Distance (miles)</label>
              <input type="number" min="1" value={editForm.distance_miles??10} onChange={e=>setEdit('distance_miles',+e.target.value)} style={inp}/>
            </div>



            {/* Other fields */}
            {[['Full Name','full_name','text','John Smith'],['Phone','phone','tel','(206) 555-0100'],['Email','email','email','john@email.com'],['From Address','from_address','text','123 Main St'],['To Address','to_address','text','456 Park Ave'],['Move Date','move_date','date','']].map(([label,key,type,ph])=>(
              <div key={key} style={{marginBottom:8}}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748B',marginBottom:4}}>{label}</label>
                <input type={type} value={editForm[key]??''} placeholder={ph} onChange={e=>setEdit(key,e.target.value)} style={inp}/>
              </div>
            ))}
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748B',marginBottom:5}}>Notes</label>
              <textarea value={editForm.notes??''} onChange={e=>setEdit('notes',e.target.value)} rows={2} placeholder="Elevator? Piano? Fragile items?" style={{...inp,resize:'none'}}/>
            </div>

            {error&&<div style={{background:'#FEF2F2',color:'#DC2626',fontSize:12,padding:'10px 12px',borderRadius:10,marginBottom:12}}>{error}</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setEditMode(false);setError('')}} style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid #E2E8F0',background:'white',fontSize:14,fontWeight:600,cursor:'pointer',color:'#374151'}}>Cancel</button>
              <button onClick={saveEdit} disabled={editSaving} style={{flex:2,padding:'12px',borderRadius:12,border:'none',background:editSaving?'#94A3B8':'linear-gradient(135deg,#1D4ED8,#6366F1)',color:'white',fontSize:14,fontWeight:700,cursor:editSaving?'not-allowed':'pointer'}}>{editSaving?'Saving...':'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media(max-width:768px){.job-detail-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  )
}
