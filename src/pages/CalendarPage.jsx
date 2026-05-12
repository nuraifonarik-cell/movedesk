import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns'

const STATUS = {
  new:         { dot:'#3B82F6', bg:'#DBEAFE', color:'#1E40AF', label:'New',         cardBg:'#EFF6FF', headerBg:'#1D4ED8' },
  scheduled:   { dot:'#10B981', bg:'#D1FAE5', color:'#065F46', label:'Scheduled',   cardBg:'#F0FDF4', headerBg:'#059669' },
  in_progress: { dot:'#F59E0B', bg:'#FEF3C7', color:'#92400E', label:'In Progress', cardBg:'#FFFBEB', headerBg:'#D97706' },
  completed:   { dot:'#059669', bg:'#D1FAE5', color:'#065F46', label:'Completed',   cardBg:'#ECFDF5', headerBg:'#059669' },
  cancelled:   { dot:'#94A3B8', bg:'#F1F5F9', color:'#64748B', label:'Cancelled',   cardBg:'#F8FAFF', headerBg:'#94A3B8' },
}
const APT = { studio:'Studio', '1br':'1 BR', '2br':'2 BR', '3br':'3 BR', house:'House' }
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '??'

export default function CalendarPage() {
  const [current, setCurrent]         = useState(new Date())
  const [jobs, setJobs]               = useState([])
  const [selectedDay, setSelectedDay] = useState(new Date())

  useEffect(() => {
    const from = format(startOfMonth(current), 'yyyy-MM-dd')
    const to   = format(endOfMonth(current),   'yyyy-MM-dd')
    getJobs({ from, to }).then(d => setJobs(d ?? []))
  }, [current])

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(current),     { weekStartsOn: 1 })
  })

  const jobsForDay   = day => jobs.filter(j => isSameDay(parseISO(j.move_date), day))
  const selectedJobs = jobsForDay(selectedDay)

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Calendar</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{jobs.length} jobs this month</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            ['←', () => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))],
            ['Today', () => { setCurrent(new Date()); setSelectedDay(new Date()) }],
            ['→', () => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn}
              style={{ padding:'7px 14px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout: jobs LEFT, calendar RIGHT */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16, alignItems:'start' }}>

        {/* ── LEFT: Jobs for selected day ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Selected day title */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'white', borderRadius:14, padding:'14px 18px', border:'0.5px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:'#0F172A' }}>
                {isToday(selectedDay) ? '📅 Today' : format(selectedDay, 'EEEE')}
              </div>
              <div style={{ fontSize:13, color:'#94A3B8', marginTop:2 }}>{format(selectedDay, 'MMMM d, yyyy')}</div>
            </div>
            <span style={{ fontSize:14, fontWeight:800, color: selectedJobs.length > 0 ? '#1D4ED8' : '#94A3B8', background: selectedJobs.length > 0 ? '#EFF6FF' : '#F8FAFF', padding:'4px 16px', borderRadius:20, border:'0.5px solid #E2E8F0' }}>
              {selectedJobs.length} {selectedJobs.length === 1 ? 'job' : 'jobs'}
            </span>
          </div>

          {/* Job cards */}
          {selectedJobs.length === 0 ? (
            <div style={{ background:'white', borderRadius:14, border:'0.5px dashed #E2E8F0', padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
              <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>No jobs on this day</div>
              <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>Click a date on the calendar to view jobs</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {selectedJobs.map(job => {
                const s = STATUS[job.status] ?? STATUS.new
                const ini = initials(job.customer?.full_name)
                return (
                  <Link key={job.id} to={`/jobs/${job.id}`}
                    style={{ display:'block', textDecoration:'none', background:s.cardBg, borderRadius:16, border:`1px solid ${s.dot}33`, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,0.12)'; e.currentTarget.style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform='none' }}>

                    {/* Colored header */}
                    <div style={{ background:s.headerBg, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'white', flexShrink:0 }}>
                        {ini}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:15, fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.customer?.full_name}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)' }}>{job.customer?.phone}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.25)', color:'white', flexShrink:0 }}>
                        {s.label}
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ padding:'12px 16px' }}>
                      <div style={{ background:'rgba(255,255,255,0.6)', borderRadius:10, padding:'8px 12px', marginBottom:10, border:`1px solid ${s.dot}22` }}>
                        <div style={{ fontSize:12, color:s.color, marginBottom:3, fontWeight:500 }}>📍 {job.from_address}</div>
                        <div style={{ fontSize:12, color:s.color, opacity:0.75 }}>🏁 {job.to_address}</div>
                      </div>
                      <div style={{ display:'flex', gap:10, fontSize:12, color:s.color, fontWeight:600 }}>
                        <span>👥 {job.movers_count} movers</span>
                        <span>🏠 {APT[job.apt_type] ?? ''}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Status legend */}
          <div style={{ background:'white', borderRadius:12, border:'0.5px solid #E2E8F0', padding:'12px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Legend</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px' }}>
              {Object.entries(STATUS).map(([key, s]) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151' }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:s.headerBg, flexShrink:0 }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Compact calendar ── */}
        <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden', position:'sticky', top:20 }}>

          {/* Month title */}
          <div style={{ padding:'12px 14px', borderBottom:'0.5px solid #E2E8F0', textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#0F172A' }}>{format(current, 'MMMM yyyy')}</div>
          </div>

          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'0.5px solid #E2E8F0' }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ padding:'6px 2px', textAlign:'center', fontSize:10, fontWeight:700, color:'#94A3B8' }}>{d}</div>
            ))}
          </div>

          {/* Day cells — compact */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {days.map((day, idx) => {
              const dayJobs  = jobsForDay(day)
              const inMonth  = isSameMonth(day, current)
              const today    = isToday(day)
              const selected = isSameDay(day, selectedDay)
              return (
                <div key={idx}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    padding:'4px 2px 6px',
                    textAlign:'center',
                    borderRight: idx%7===6 ? 'none' : '0.5px solid #F1F5F9',
                    borderBottom:'0.5px solid #F1F5F9',
                    background: selected ? '#EFF6FF' : !inMonth ? '#FAFAFA' : 'white',
                    cursor:'pointer',
                    outline: selected ? '2px solid #1D4ED8' : 'none',
                    outlineOffset: -2,
                    transition:'background 0.1s',
                    minHeight: 42,
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F8FAFF' }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = !inMonth ? '#FAFAFA' : 'white' }}
                >
                  {/* Day number */}
                  <div style={{
                    width:22, height:22, borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    margin:'0 auto 3px',
                    background: today ? '#1D4ED8' : 'transparent',
                    fontSize:11, fontWeight: today || selected ? 700 : 400,
                    color: today ? 'white' : inMonth ? '#374151' : '#CBD5E1'
                  }}>
                    {format(day, 'd')}
                  </div>

                  {/* Colored dots for jobs */}
                  {dayJobs.length > 0 && (
                    <div style={{ display:'flex', justifyContent:'center', gap:2, flexWrap:'wrap' }}>
                      {dayJobs.slice(0, 3).map(job => {
                        const s = STATUS[job.status] ?? STATUS.new
                        return <div key={job.id} style={{ width:6, height:6, borderRadius:'50%', background:s.dot }} />
                      })}
                      {dayJobs.length > 3 && <div style={{ fontSize:8, color:'#94A3B8', lineHeight:'6px' }}>+{dayJobs.length-3}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
