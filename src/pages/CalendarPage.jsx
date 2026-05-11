import { useEffect, useState } from 'react'
import { getJobs } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from 'date-fns'

const STATUS_COLORS = {
  new:'#1D4ED8:#EFF6FF', quoted:'#6D28D9:#F5F3FF', scheduled:'#059669:#F0FDF4',
  in_progress:'#D97706:#FFFBEB', completed:'#059669:#ECFDF5', cancelled:'#94A3B8:#F1F5F9'
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const [jobs, setJobs]       = useState([])

  useEffect(() => {
    const from = format(startOfMonth(current), 'yyyy-MM-dd')
    const to   = format(endOfMonth(current),   'yyyy-MM-dd')
    getJobs({ from, to }).then(d => setJobs(d??[]))
  }, [current])

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(current),     { weekStartsOn: 1 })
  })

  const jobsForDay = day => jobs.filter(j => isSameDay(new Date(j.move_date), day))

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>
            {format(current, 'MMMM yyyy')}
          </h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{jobs.length} jobs this month</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[['←', () => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))],
            ['Today', () => setCurrent(new Date())],
            ['→', () => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))]
          ].map(([label, fn]) => (
            <button key={label} onClick={fn}
              style={{ padding:'7px 14px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden' }}>
        {/* Day headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'0.5px solid #E2E8F0' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ padding:'10px 8px', textAlign:'center', fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
          ))}
        </div>
        {/* Days grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {days.map((day, idx) => {
            const dayJobs = jobsForDay(day)
            const inMonth = isSameMonth(day, current)
            const today   = isToday(day)
            return (
              <div key={idx} style={{ minHeight:80, padding:'6px 8px', borderRight: idx%7===6?'none':'0.5px solid #F1F5F9', borderBottom:'0.5px solid #F1F5F9', background: !inMonth?'#FAFAFA':'white' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4, background: today?'#1D4ED8':'transparent', fontSize:12, fontWeight:today?700:500, color:today?'white':inMonth?'#374151':'#CBD5E1' }}>
                  {format(day,'d')}
                </div>
                {dayJobs.slice(0,2).map(job => {
                  const [color, bg] = (STATUS_COLORS[job.status]??'#1D4ED8:#EFF6FF').split(':')
                  return (
                    <div key={job.id} style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:6, marginBottom:2, background:bg, color:color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                      title={`${job.customer?.full_name} — ${job.from_address}`}>
                      {job.customer?.full_name?.split(' ')[0]}
                    </div>
                  )
                })}
                {dayJobs.length > 2 && <div style={{ fontSize:10, color:'#94A3B8', padding:'1px 4px' }}>+{dayJobs.length-2} more</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
