import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getJob, getCrew, supabase } from '../lib/supabase'
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
const card = { background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:18 }
const sectionTitle = { fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }

// ── Helper search picker ─────────────────────────────────────────────────────
function HelperPicker({ members, assignedIds, busyMap, disabled, onToggle }) {
  const [search, setSearch] = useState('')
  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.phone?.includes(search)
  )
  const count = members.filter(m => assignedIds.includes(m.id)).length
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
        <HardHat size={13} color="#059669"/>
        <span style={{fontSize:12,fontWeight:700,color:'#059669'}}>Helpers</span>
        <span style={{fontSize:10,color:'#94A3B8'}}>({members.length})</span>
        {count > 0 && <span style={{fontSize:10,color:'#059669',background:'#D1FAE5',padding:'1px 8px',borderRadius:20,fontWeight:700}}>{count} selected</span>}
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone..."
        style={{width:'100%',border:'1px solid #E2E8F0',borderRadius:8,padding:'7px 12px',fontSize:13,outline:'none',fontFamily:'inherit',marginBottom:6,boxSizing:'border-box'}}/>
      <div style={{border:'1px solid #E2E8F0',borderRadius:10,overflow:'hidden',maxHeight:260,overflowY:'auto'}}>
        {filtered.length === 0
          ? <div style={{padding:14,textAlign:'center',color:'#94A3B8',fontSize:13}}>No helpers found</div>
          : filtered.map((m,i) => {
            const checked = assignedIds.includes(m.id)
            const busy = busyMap[m.id] && !checked
            return (
              <div key={m.id}
                onClick={() => !disabled && onToggle(m.id, checked)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                  borderBottom:i<filtered.length-1?'0.5px solid #F1F5F9':'none',
                  background:checked?'#F0FDF4':'white',
                  cursor:disabled?'not-allowed':'pointer',
                  opacity:disabled?0.6:1}}>
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

// ── Single-select crew card (foreman / driver) ───────────────────────────────
function CrewPicker({ members, assignedId, busyMap, disabled, color, bg, onSelect, label, icon: Icon }) {
  const [search, setSearch] = useState('')
  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.phone?.includes(search)
  )
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
        <Icon size={13} color={color}/>
        <span style={{fontSize:12,fontWeight:700,color}}>{label}</span>
        <span style={{fontSize:10,color:'#94A3B8'}}>({members.length})</span>
        {assignedId && <span style={{fontSize:10,color,background:bg,padding:'1px 8px',borderRadius:20,fontWeight:700}}>1 selected</span>}
      </div>
      {members.length > 5 && (
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`}
          style={{width:'100%',border:'1px solid #E2E8F0',borderRadius:8,padding:'7px 12px',fontSize:13,outline:'none',fontFamily:'inherit',marginBottom:6,boxSizing:'border-box'}}/>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:240,overflowY:'auto'}}>
        {filtered.map(m => {
          const selected = m.id === assignedId
          const busy = busyMap[m.id] && !selected
          return (
            <button key={m.id}
              disabled={disabled}
              onClick={() => onSelect(m.id, selected)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 14px', borderRadius:10, border:'none',
                background: selected ? bg : '#F8FAFF',
                outline: selected ? `2px solid ${color}` : '1px solid #E2E8F0',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                textAlign:'left', width:'100%',
                transition: 'opacity 0.15s', flexShrink: 0,
              }}>
              <div style={{width:28,height:28,borderRadius:'50%',background:selected?color:'#E2E8F0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:selected?'white':'#64748B',flexShrink:0}}>
                {m.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:selected?700:400,color:'#0F172A'}}>{m.full_name}</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>{m.phone}</div>
              </div>
              {selected && <span style={{fontSize:12,color,fontWeight:700}}>✓</span>}
              {busy && <span style={{fontSize:10,color:'#D97706'}}>⚠️</span>}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div style={{padding:14,textAlign:'center',color:'#94A3B8',fontSize:13}}>Not found</div>
        )}
      </div>
      {assignedId && busyMap[assignedId] && (
        <div style={{fontSize:11,color:'#D97706',marginTop:4}}>⚠️ Has another job this day</div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [job, setJob]       = useState(null)
  const [crew, setCrew]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [notes, setNotes]   = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved]   = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busyMap, setBusyMap] = useState({})
  const [payModal, setPayModal]   = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDesc, setPayDesc]     = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payLink, setPayLink]     = useState(null)

  // ── Single global operation lock using ref (immune to React re-renders) ────
  const opLock = useRef(false)
  const [opPending, setOpPending] = useState(false)  // UI indicator only

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadJob = useCallback(async () => {
    const [j, c] = await Promise.all([getJob(id), getCrew()])
    setJob(j)
    setNotes(j.notes ?? '')
    setCrew(c)
    setEditForm({
      full_name: j.customer?.full_name??'', phone: j.customer?.phone??'',
      email: j.customer?.email??'', from_address: j.from_address??'',
      to_address: j.to_address??'', move_date: j.move_date??'',
      apt_type: j.apt_type??'1br', distance_miles: j.distance_miles??10,
      movers_count: j.movers_count??3, notes: j.notes??'',
    })
    if (j.move_date) {
      const rangeStart = new Date(j.move_date)
      rangeStart.setDate(rangeStart.getDate() - 1)
      const rangeEnd = new Date(j.move_date)
      rangeEnd.setDate(rangeEnd.getDate() + 1)
      const { data: asgn } = await supabase
        .from('job_assignments')
        .select('crew_member_id, job:jobs(id,status,move_date)')
        .gte('job.move_date', rangeStart.toISOString().split('T')[0])
        .lte('job.move_date', rangeEnd.toISOString().split('T')[0])
      const map = {}
      asgn?.forEach(a => {
        if (a.job?.id !== id && a.job?.move_date === j.move_date &&
            ['scheduled','in_progress'].includes(a.job?.status))
          map[a.crew_member_id] = a.job
      })
      setBusyMap(map)
    }
    return j
  }, [id])

  useEffect(() => {
    loadJob().catch(console.error).finally(() => setLoading(false))
  }, [loadJob])

  // ── Core crew operation — DB first, then optimistic state update ─────────
  const doCrewOp = useCallback(async (fn) => {
    if (opLock.current) return
    opLock.current = true
    setOpPending(true)
    setError('')
    try {
      const updates = await fn()
      if (updates) setJob(j => ({ ...j, ...updates }))
    } catch (e) {
      console.error('crew op error:', e)
      setError('Failed: ' + (e?.message ?? 'Unknown error'))
    } finally {
      opLock.current = false
      setOpPending(false)
    }
  }, [])

  // ── Assign single-role (foreman / driver) ─────────────────────────────────
  const assignSingle = useCallback((memberId, isSelected, roleType) => {
    // Warning: busy on this day
    if (!isSelected && busyMap[memberId]) {
      if (!confirm(`⚠️ This person already has another job on ${job?.move_date}.\nAssign anyway?`)) return
    }

    doCrewOp(async () => {
      let assignments = [...(job?.assignments ?? [])]
      let newStatus = job?.status

      if (isSelected) {
        const row = assignments.find(a => a.crew_member_id === memberId)
        if (row) {
          await supabase.from('job_assignments').delete().eq('id', row.id)
          assignments = assignments.filter(a => a.id !== row.id)
        }
        if (roleType === 'foreman' && newStatus === 'scheduled') {
          await supabase.from('jobs').update({ status:'new' }).eq('id', id)
          newStatus = 'new'
        }
      } else {
        // Remove existing of same role first
        const sameRole = assignments.filter(a => {
          const m = crew.find(c => c.id === a.crew_member_id)
          return (m?.role_type ?? m?.role) === roleType ||
                 (roleType === 'foreman' && m?.role === 'lead')
        })
        for (const row of sameRole) {
          await supabase.from('job_assignments').delete().eq('id', row.id)
          assignments = assignments.filter(a => a.id !== row.id)
        }
        const { data: newRow } = await supabase.from('job_assignments')
          .insert({ job_id: id, crew_member_id: memberId })
          .select('id, crew_member_id').single()
        if (newRow) assignments = [...assignments, newRow]

        if (roleType === 'foreman' && newStatus === 'new') {
          await supabase.from('jobs').update({ status:'scheduled' }).eq('id', id)
          newStatus = 'scheduled'
          // Notify foreman by email (fire and forget)
          supabase.functions.invoke('notify-crew', { body: { job_id: id, crew_member_id: memberId } })
            .catch(e => console.error('notify-crew foreman:', e))
        }
      }

      return { assignments, status: newStatus }
    })
  }, [doCrewOp, job, crew, id, busyMap])

  // ── Toggle helper ─────────────────────────────────────────────────────────
  const toggleHelper = useCallback((memberId, isChecked) => {
    // Warning: busy on this day
    if (!isChecked && busyMap[memberId]) {
      if (!confirm(`⚠️ This helper already has another job on ${job?.move_date}.\nAssign anyway?`)) return
    }

    // Warning: exceeding movers_count
    if (!isChecked) {
      const getRoleKey = m => m.role_type ?? (m.role==='lead'?'foreman':'helper')
      const assignedNow = (job?.assignments ?? []).map(a => a.crew_member_id)
      const moverCount = crew.filter(m => {
        const role = getRoleKey(m)
        return (role === 'foreman' || role === 'helper') && assignedNow.includes(m.id)
      }).length
      if (moverCount >= (job?.movers_count ?? 0)) {
        if (!confirm(`Job is set for ${job?.movers_count} movers. You already have ${moverCount} assigned.\nAdd anyway?`)) return
      }
    }

    doCrewOp(async () => {
      let assignments = [...(job?.assignments ?? [])]

      if (isChecked) {
        const row = assignments.find(a => a.crew_member_id === memberId)
        if (row) {
          await supabase.from('job_assignments').delete().eq('id', row.id)
          assignments = assignments.filter(a => a.id !== row.id)
        }
      } else {
        const { data: newRow } = await supabase.from('job_assignments')
          .insert({ job_id: id, crew_member_id: memberId })
          .select('id, crew_member_id').single()
        if (newRow) assignments = [...assignments, newRow]
        // Notify helper by email (fire and forget)
        supabase.functions.invoke('notify-crew', { body: { job_id: id, crew_member_id: memberId } })
          .catch(e => console.error('notify-crew helper:', e))
      }

      return { assignments }
    })
  }, [doCrewOp, job, crew, id, busyMap])

  // ── Notes ─────────────────────────────────────────────────────────────────
  const saveNotes = async () => {
    setNoteSaving(true)
    try {
      await supabase.from('jobs').update({ notes }).eq('id', id)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } finally { setNoteSaving(false) }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const setEdit = (k, v) => setEditForm(f => ({...f, [k]: v}))

  const saveEdit = async () => {
    setEditSaving(true); setError('')
    try {
      const apt  = editForm.apt_type ?? '1br'
      const mov  = Number(editForm.movers_count ?? 3)
      const dis  = Number(editForm.distance_miles ?? 10)
      const hrs  = ({studio:2,'1br':4,'2br':6,'3br':8,house:10})[apt] ?? 4
      const rate = ({2:120,3:165,4:210})[mov] ?? 165
      const mats = ({studio:40,'1br':75,'2br':110,'3br':150,house:200})[apt] ?? 75
      const trav = Math.round(dis * 2.5)
      const total = rate * hrs + trav + mats

      const custId = job.customer?.id
      if (custId)
        await supabase.from('customers')
          .update({ full_name:editForm.full_name, phone:editForm.phone, email:editForm.email||null })
          .eq('id', custId)

      const { error: e } = await supabase.from('jobs').update({
        from_address: editForm.from_address, to_address: editForm.to_address,
        move_date: editForm.move_date, apt_type: apt,
        distance_miles: dis, movers_count: mov, notes: editForm.notes||null,
        estimated_hours: hrs, base_rate: rate,
        travel_fee: trav, materials_fee: mats, total_price: total,
      }).eq('id', id)
      if (e) throw e

      await loadJob()
      setEditMode(false)
    } catch (e) {
      setError('Failed to save: ' + (e?.message ?? ''))
    } finally { setEditSaving(false) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteJob = async () => {
    if (!confirm('Delete this job permanently?')) return
    setDeleting(true)
    try {
      await supabase.from('job_assignments').delete().eq('job_id', id)
      await supabase.from('contract_signatures').delete().eq('job_id', id)
      await supabase.from('jobs').delete().eq('id', id)
      navigate('/jobs')
    } catch (e) { setError('Delete failed: ' + (e?.message??'')); setDeleting(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const getRoleKey = m => m.role_type ?? (m.role==='lead'?'foreman':'helper')
  const foremans = crew.filter(m => getRoleKey(m) === 'foreman')
  const helpers  = crew.filter(m => getRoleKey(m) === 'helper')


  const assignedIds    = (job?.assignments ?? []).map(a => a.crew_member_id)
  const foremanId      = foremans.find(m => assignedIds.includes(m.id))?.id ?? ''
  const helperAssigned = assignedIds.filter(aid => helpers.some(h => h.id === aid))

  const statusInfo = STATUSES.find(s => s.value === job?.status) ?? STATUSES[0]
  const isLocked   = ['in_progress','completed','cancelled'].includes(job?.status)
  const labor      = (job?.base_rate??0) * (job?.estimated_hours??0)
  const deposit    = job?.deposit_amount ?? job?.deposit_paid ?? 0

  const inp = {width:'100%',border:'1px solid #E2E8F0',borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',background:'white',boxSizing:'border-box',fontFamily:'inherit'}

  const requestPayment = async () => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    setPayLoading(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('square-payment', {
        body: {
          job_id:         id,
          amount:         amt,
          description:    payDesc || `Moving Service — ${job.move_date}`,
          customer_email: job.customer?.email || '',
          customer_name:  job.customer?.full_name || '',
        },
      })
      if (fnErr) throw fnErr
      setPayLink(data.payment_link_url)
    } catch (e) {
      console.error('Payment error:', e)
      setError('Failed to create payment link: ' + (e?.message ?? 'Unknown error'))
    } finally {
      setPayLoading(false)
    }
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Loading...</div>
  if (!job)    return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Job not found. <Link to="/jobs">← Back</Link></div>

  return (
    <div style={{padding:20,fontFamily:"'Inter',system-ui,sans-serif",maxWidth:1000}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={()=>navigate('/jobs')} style={{background:'white',border:'0.5px solid #E2E8F0',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <ArrowLeft size={16} color="#64748B"/>
        </button>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <h1 style={{fontSize:20,fontWeight:800,color:'#0F172A',margin:0}}>{job.customer?.full_name}</h1>
            <span style={{fontSize:12,fontWeight:700,padding:'4px 12px',borderRadius:20,background:statusInfo.bg,color:statusInfo.color,border:`1px solid ${statusInfo.border}`}}>{statusInfo.label}</span>
          </div>
          <p style={{fontSize:12,color:'#94A3B8',margin:'3px 0 0'}}>
            {job.bl_number??`BL-${id?.slice(0,6).toUpperCase()}`} · {format(new Date(job.created_at),'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {error && (
        <div style={{background:'#FEF2F2',border:'1px solid #FECACA',color:'#DC2626',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          {error}<button onClick={()=>setError('')} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',fontWeight:700,fontSize:16,padding:0}}>✕</button>
        </div>
      )}

      {job.status !== 'completed' && (
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {['new','scheduled'].includes(job.status) && (
            <button onClick={()=>setEditMode(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:'1px solid #E2E8F0',background:'white',fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'}}>
              ✏️ Edit Job
            </button>
          )}
          <button onClick={deleteJob} disabled={deleting} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,border:'1px solid #FECACA',background:'#FEF2F2',fontSize:13,fontWeight:600,color:'#DC2626',cursor:deleting?'not-allowed':'pointer',opacity:deleting?0.7:1}}>
            {deleting?'Deleting...':'🗑 Delete Job'}
          </button>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16}} className="job-detail-grid">

        {/* ── LEFT ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Move Details */}
          <div style={card}>
            <h2 style={sectionTitle}><Truck size={14} color="#94A3B8"/>Move Details</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div style={{background:'#F8FAFF',borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>From</div>
                <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{job.from_address}</div>
              </div>
              <div style={{background:'#F8FAFF',borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>To</div>
                <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{job.to_address}</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              {[['Date',format(new Date(job.move_date),'MMM d, yyyy')],['Home',APT[job.apt_type]??job.apt_type],['Distance',`${job.distance_miles} mi`],['Crew',`${job.movers_count} movers`]].map(([label,val])=>(
                <div key={label} style={{background:'#F8FAFF',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'#94A3B8',fontWeight:700,textTransform:'uppercase',marginBottom:3}}>{label}</div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0F172A'}}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
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
          </div>

          {/* Assign Crew */}
          <div style={card}>
            <h2 style={sectionTitle}>
              <Users size={14} color="#94A3B8"/>
              {isLocked ? 'Assigned Crew' : 'Assign Crew'}
              {opPending && <span style={{fontSize:11,color:'#94A3B8',marginLeft:6,fontWeight:400}}>saving...</span>}
            </h2>

            {isLocked && (
              <div style={{padding:'10px 14px',background:'#F8FAFF',borderRadius:10,fontSize:12,color:'#64748B',marginBottom:12}}>
                🔒 {job.status==='in_progress'?'Job in progress — crew is locked':job.status==='completed'?'Job completed — crew is locked':'Job cancelled'}
              </div>
            )}

            {crew.length === 0
              ? <p style={{fontSize:13,color:'#94A3B8'}}>No active crew. <Link to="/crew" style={{color:'#1D4ED8'}}>Add crew →</Link></p>
              : (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  {foremans.length > 0 && (
                    <CrewPicker
                      members={foremans} assignedId={foremanId} busyMap={busyMap}
                      disabled={isLocked || opPending} color="#1D4ED8" bg="#EFF6FF"
                      label="Foreman" icon={UserCheck}
                      onSelect={(mid, isSel) => assignSingle(mid, isSel, 'foreman')}
                    />
                  )}
                  {helpers.length > 0 && (
                    <HelperPicker
                      members={helpers} assignedIds={helperAssigned} busyMap={busyMap}
                      disabled={isLocked || opPending}
                      onToggle={toggleHelper}
                    />
                  )}
                </div>
              )
            }
          </div>

          {/* Notes */}
          <div style={card}>
            <h2 style={sectionTitle}>Notes</h2>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}
              placeholder="Elevator? Piano? Fragile items? Door code?"
              style={{width:'100%',border:'0.5px solid #E2E8F0',borderRadius:10,padding:'10px 12px',fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',boxSizing:'border-box',background:'#F8FAFF'}}/>
            <button onClick={saveNotes} disabled={noteSaving}
              style={{marginTop:8,padding:'9px 20px',borderRadius:10,border:'none',background:noteSaved?'#059669':'#0F172A',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {noteSaved?'✓ Saved':noteSaving?'Saving...':'Save Notes'}
            </button>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Customer */}
          <div style={card}>
            <h2 style={sectionTitle}><Users size={14} color="#94A3B8"/>Customer</h2>
            <div style={{fontSize:15,fontWeight:700,color:'#0F172A',marginBottom:12}}>{job.customer?.full_name}</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {job.customer?.phone && <a href={`tel:${job.customer.phone}`} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'#F0FDF4',borderRadius:10,textDecoration:'none',color:'#059669',fontSize:13,fontWeight:600}}><Phone size={13}/> {job.customer.phone}</a>}
              {job.customer?.email && <a href={`mailto:${job.customer.email}`} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'#F8FAFF',borderRadius:10,textDecoration:'none',color:'#64748B',fontSize:13}}><Mail size={13}/> {job.customer.email}</a>}
            </div>
          </div>

          {/* Pricing */}
          <div style={card}>
            <h2 style={sectionTitle}><DollarSign size={14} color="#94A3B8"/>Pricing</h2>
            <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:13}}>
              {[[`Labor (${job.movers_count}×${job.estimated_hours}hrs @ $${job.base_rate}/hr)`,`$${labor.toLocaleString()}`],['Travel fee',`$${job.travel_fee??0}`],['Materials',`$${job.materials_fee??0}`]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',color:'#64748B'}}><span style={{fontSize:12}}>{k}</span><span style={{fontWeight:500}}>{v}</span></div>
              ))}
              <div style={{borderTop:'2px solid #0F172A',paddingTop:10,marginTop:4,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}>
                <span>Est. Total</span><span style={{color:'#1D4ED8'}}>${(job.total_price??0).toLocaleString()}</span>
              </div>
              {job.actual_total && <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,color:'#059669',marginTop:4}}><span>✅ Actual</span><span>${parseFloat(job.actual_total).toLocaleString()}</span></div>}
              {deposit>0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#059669',fontWeight:600}}><span>Deposit paid</span><span>−${deposit}</span></div>}
            </div>
          </div>

          {/* Actions */}
          <div style={card}>
            <h2 style={sectionTitle}>Actions</h2>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {job.status==='new' && <div style={{padding:'12px 14px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,fontSize:12,color:'#92400E',fontWeight:600}}>⚠️ Assign a foreman to schedule this job</div>}
              {['scheduled','in_progress'].includes(job.status) && (
                <div style={{padding:'12px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,fontSize:12,color:'#065F46'}}>
                  <div style={{fontWeight:700,marginBottom:2}}>📱 Foreman handles the contract</div>
                  <div>Foreman opens contract via Crew App on arrival</div>
                </div>
              )}
              {job.status==='completed' && (<>
                <div style={{padding:'10px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,fontSize:12,color:'#065F46',fontWeight:600}}>✅ Job completed by foreman</div>
                <button onClick={()=>{setPayAmount(String(job.total_price??''));setPayDesc(`Moving Service — ${job.move_date}`);setPayLink(null);setPayModal(true)}}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1D4ED8,#6366F1)',fontSize:13,color:'white',cursor:'pointer',fontWeight:700}}>
                  💳 Request Payment
                </button>
                <button onClick={()=>navigate(`/jobs/${id}/contract-print`)} style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderRadius:10,border:'1.5px solid #1D4ED8',background:'#EFF6FF',fontSize:13,color:'#1D4ED8',cursor:'pointer',fontWeight:700}}>🖨 Print / View Contract</button>
                <button onClick={()=>navigate(`/jobs/${id}/invoice`)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,border:'0.5px solid #E2E8F0',background:'white',fontSize:13,color:'#374151',cursor:'pointer',fontWeight:500}}><Eye size={14} color="#6366F1"/> Preview Invoice</button>
                <button onClick={()=>downloadInvoice(job)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,border:'0.5px solid #E2E8F0',background:'white',fontSize:13,color:'#374151',cursor:'pointer',fontWeight:500}}><FileText size={14} color="#1D4ED8"/> Download Invoice PDF</button>
              </>)}
              {job.customer?.phone && <a href={`tel:${job.customer.phone}`} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,border:'0.5px solid #E2E8F0',background:'white',fontSize:13,color:'#374151',textDecoration:'none',fontWeight:500}}><Phone size={14} color="#059669"/> Call Customer</a>}
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
            {error && <div style={{background:'#FEF2F2',color:'#DC2626',fontSize:12,padding:'10px 12px',borderRadius:10,marginBottom:12}}>{error}</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setEditMode(false);setError('')}} style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid #E2E8F0',background:'white',fontSize:14,fontWeight:600,cursor:'pointer',color:'#374151'}}>Cancel</button>
              <button onClick={saveEdit} disabled={editSaving} style={{flex:2,padding:'12px',borderRadius:12,border:'none',background:editSaving?'#94A3B8':'linear-gradient(135deg,#1D4ED8,#6366F1)',color:'white',fontSize:14,fontWeight:700,cursor:editSaving?'not-allowed':'pointer'}}>
                {editSaving?'Saving...':'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',padding:16}}>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:17,fontWeight:800,color:'#0F172A',margin:0}}>💳 Request Payment</h2>
              <button onClick={()=>{setPayModal(false);setPayLink(null);setError('')}} style={{background:'#F1F5F9',border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>

            {!payLink ? (<>
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748B',marginBottom:5}}>Amount ($)</label>
                <input type="number" min="1" step="0.01" value={payAmount} onChange={e=>setPayAmount(e.target.value)}
                  placeholder="0.00" style={{...inp,fontSize:20,fontWeight:700,color:'#0F172A',padding:'12px 14px'}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748B',marginBottom:5}}>Description</label>
                <input type="text" value={payDesc} onChange={e=>setPayDesc(e.target.value)}
                  placeholder="Moving Service" style={inp}/>
              </div>
              {job.customer?.email
                ? <div style={{padding:'10px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,fontSize:12,color:'#065F46',marginBottom:14}}>
                    📧 Link will be emailed to {job.customer.email}
                  </div>
                : <div style={{padding:'10px 14px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,fontSize:12,color:'#92400E',marginBottom:14}}>
                    ⚠️ No customer email — you'll copy the link manually
                  </div>
              }
              {error && <div style={{background:'#FEF2F2',color:'#DC2626',fontSize:12,padding:'10px 12px',borderRadius:10,marginBottom:12}}>{error}</div>}
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{setPayModal(false);setError('')}} style={{flex:1,padding:'12px',borderRadius:12,border:'1px solid #E2E8F0',background:'white',fontSize:14,fontWeight:600,cursor:'pointer',color:'#374151'}}>Cancel</button>
                <button onClick={requestPayment} disabled={payLoading||!payAmount}
                  style={{flex:2,padding:'12px',borderRadius:12,border:'none',background:payLoading||!payAmount?'#94A3B8':'linear-gradient(135deg,#1D4ED8,#6366F1)',color:'white',fontSize:14,fontWeight:700,cursor:payLoading||!payAmount?'not-allowed':'pointer'}}>
                  {payLoading ? 'Creating...' : 'Send Payment Link'}
                </button>
              </div>
            </>) : (<>
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontSize:15,fontWeight:700,color:'#0F172A',marginBottom:6}}>Payment link created!</div>
                {job.customer?.email && <div style={{fontSize:13,color:'#059669',marginBottom:16}}>Email sent to {job.customer.email}</div>}
                <div style={{background:'#F8FAFF',border:'1px solid #E2E8F0',borderRadius:10,padding:'12px 14px',marginBottom:16,wordBreak:'break-all',fontSize:12,color:'#1D4ED8',textAlign:'left'}}>
                  {payLink}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{
                    if(navigator.clipboard){navigator.clipboard.writeText(payLink).catch(()=>{})}
                    else{const t=document.createElement('textarea');t.value=payLink;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t)}
                  }} style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid #E2E8F0',background:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>📋 Copy Link</button>
                  <a href={payLink} target="_blank" rel="noreferrer" style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'#0F172A',color:'white',fontSize:13,fontWeight:600,cursor:'pointer',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>Open →</a>
                </div>
              </div>
              <button onClick={()=>{setPayModal(false);setPayLink(null)}} style={{width:'100%',marginTop:8,padding:'11px',borderRadius:10,border:'1px solid #E2E8F0',background:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>Close</button>
            </>)}
          </div>
        </div>
      )}

      <style>{`@media(max-width:768px){.job-detail-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  )
}
