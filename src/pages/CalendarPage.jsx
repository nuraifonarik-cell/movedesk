import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns'

const STATUS = {
  new:         { dot:'#3B82F6', bg:'#DBEAFE', color:'#1E40AF', label:'New' },
  quoted:      { dot:'#7C3AED', bg:'#EDE9FE', color:'#5B21B6', label:'Quoted' },
  scheduled:   { dot:'#10B981', bg:'#D1FAE5', color:'#065F46', label:'Scheduled' },
  in_progress: { dot:'#F59E0B', bg:'#FEF3C7', color:'#92400E', label:'In Progress' },
  completed:   { dot:'#059669', bg:'#D1FAE5', color:'#065F46', label:'Completed' },
  cancelled:   { dot:'#94A3B8', bg:'#F1F5F9', color:'#64748B', label:'Cancelled' },
}
const APT = { studio:'Studio', '1br':'1 BR', '2br':'2 BR', '3br':'3 BR', house:'House' }

export default function CalendarPage() {
  const [current, setCurrent]   = useState(new Date())
  const [jobs, setJobs]         = useState([])
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

  const jobsForDay  = day => jobs.filter(j => isSameDay(parseISO(j.move_date), day))
  const selectedJobs = jobsForDay(selectedDay)

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>
            {format(current, 'MMMM yyyy')}
          </h1>
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

      {/* Split layout: calendar left, jobs list right */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>

        {/* ── Calendar ── */}
        <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden' }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'0.5px solid #E2E8F0', background:'#F8FAFF' }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} style={{ padding:'8px 4px', textAlign:'center', fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
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
                    minHeight: 72, padding:'6px 6px 4px',
                    borderRight: idx%7===6 ? 'none' : '0.5px solid #F1F5F9',
                    borderBottom:'0.5px solid #F1F5F9',
                    background: selected ? '#EFF6FF' : !inMonth ? '#FAFAFA' : 'white',
                    cursor:'pointer', transition:'background 0.1s',
                    outline: selected ? '2px solid #1D4ED8' : 'none',
                    outlineOffset: -2,
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F8FAFF' }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = !inMonth ? '#FAFAFA' : 'white' }}
                >
                  <div style={{
                    width:24, height:24, borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    marginBottom:3,
                    background: today ? '#1D4ED8' : 'transparent',
                    fontSize:12, fontWeight: today||selected ? 700 : 400,
                    color: today ? 'white' : inMonth ? '#374151' : '#CBD5E1'
                  }}>
                    {format(day,'d')}
                  </div>

                  {/* Job dots */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                    {dayJobs.slice(0,3).map(job => {
                      const s = STATUS[job.status] ?? STATUS.new
                      return (
                        <div key={job.id}
                          style={{ height:5, borderRadius:3, background:s.dot, flex:'1 0 auto', maxWidth:24, minWidth:8 }}
                          title={job.customer?.full_name}
                        />
                      )
                    })}
                    {dayJobs.length > 3 && (
                      <div style={{ fontSize:9, color:'#94A3B8', width:'100%', marginTop:1 }}>+{dayJobs.length-3}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Jobs for selected day ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>
                {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE')}
              </div>
              <div style={{ fontSize:12, color:'#94A3B8' }}>{format(selectedDay, 'MMMM d, yyyy')}</div>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:'#1D4ED8' }}>{selectedJobs.length} jobs</span>
          </div>

          {selectedJobs.length === 0 ? (
            <div style={{ background:'white', borderRadius:14, border:'0.5px dashed #E2E8F0', padding:'32px 20px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
              No jobs on this day
            </div>
          ) : (
            selectedJobs.map(job => {
              const s = STATUS[job.status] ?? STATUS.new
              return (
                <Link key={job.id} to={`/jobs/${job.id}`}
                  style={{ display:'block', textDecoration:'none', background:s.bg, borderRadius:14, padding:'14px 16px', border:`1px solid ${s.dot}33`, transition:'filter 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.filter='brightness(0.97)'}
                  onMouseLeave={e=>e.currentTarget.style.filter='none'}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{job.customer?.full_name}</div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'white', color:s.color, border:`1px solid ${s.dot}44` }}>
                      {s.label}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:'#64748B', marginBottom:3 }}>
                    📍 {job.from_address}
                  </div>
                  <div style={{ fontSize:11, color:'#64748B', marginBottom:6 }}>
                    🏁 {job.to_address}
                  </div>
                  <div style={{ display:'flex', gap:8, fontSize:11, color:s.color, fontWeight:600 }}>
                    <span>👥 {job.movers_count} movers</span>
                    <span>🏠 {APT[job.apt_type]??''}</span>
                    <span style={{ marginLeft:'auto', fontWeight:800, fontSize:13 }}>${(job.total_price??0).toLocaleString()}</span>
                  </div>
                </Link>
              )
            })
          )}

          {/* Legend */}
          <div style={{ background:'white', borderRadius:12, border:'0.5px solid #E2E8F0', padding:'12px 14px', marginTop:4 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Status Legend</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {Object.entries(STATUS).map(([key, s]) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#374151' }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:s.dot, flexShrink:0 }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
