import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { TrendingUp, DollarSign, Briefcase, Users, Star } from 'lucide-react'

const card = { background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:20 }

function fmt(n) { return (n ?? 0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 }) }
function fmtD(n) { return '$' + fmt(n) }

export default function StatsPage() {
  const [jobs,      setJobs]      = useState([])
  const [crew,      setCrew]      = useState([])
  const [customers, setCustomers] = useState(0)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('jobs').select('id,status,move_date,total_price,actual_total,apt_type,movers_count,base_rate,estimated_hours,travel_fee,materials_fee').order('move_date'),
      supabase.from('crew_members').select('id,full_name,role_type,role').eq('is_active', true),
      supabase.from('customers').select('id', { count:'exact', head:true }),
    ]).then(([jobsRes, crewRes, custRes]) => {
      setJobs(jobsRes.data ?? [])
      setCrew(crewRes.data ?? [])
      setCustomers(custRes.count ?? 0)
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94A3B8',fontSize:14}}>Loading statistics...</div>

  const now       = new Date()
  const thisStart = startOfMonth(now)
  const thisEnd   = endOfMonth(now)
  const lastStart = startOfMonth(subMonths(now, 1))
  const lastEnd   = endOfMonth(subMonths(now, 1))

  const completed = jobs.filter(j => j.status === 'completed')

  const jobsThisMonth = completed.filter(j => { const d = parseISO(j.move_date); return d >= thisStart && d <= thisEnd })
  const jobsLastMonth = completed.filter(j => { const d = parseISO(j.move_date); return d >= lastStart && d <= lastEnd })

  const revenue = (arr) => arr.reduce((s, j) => s + parseFloat(j.actual_total ?? j.total_price ?? 0), 0)

  const revenueThis = revenue(jobsThisMonth)
  const revenueLast = revenue(jobsLastMonth)
  const revenueYTD  = revenue(completed.filter(j => parseISO(j.move_date).getFullYear() === now.getFullYear()))
  const avgJob      = completed.length ? revenue(completed) / completed.length : 0

  const growth = revenueLast > 0 ? ((revenueThis - revenueLast) / revenueLast * 100) : null

  // Last 6 months revenue chart data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d     = subMonths(now, 5 - i)
    const start = startOfMonth(d)
    const end   = endOfMonth(d)
    const rev   = revenue(completed.filter(j => { const m = parseISO(j.move_date); return m >= start && m <= end }))
    const count = completed.filter(j => { const m = parseISO(j.move_date); return m >= start && m <= end }).length
    return { label: format(d, 'MMM'), month: format(d, 'yyyy-MM'), rev, count }
  })
  const maxRev = Math.max(...months.map(m => m.rev), 1)

  // Jobs by status
  const byStatus = [
    { label:'Completed', count: completed.length,                                   color:'#059669', bg:'#D1FAE5' },
    { label:'Scheduled', count: jobs.filter(j=>j.status==='scheduled').length,      color:'#1D4ED8', bg:'#DBEAFE' },
    { label:'In Progress',count: jobs.filter(j=>j.status==='in_progress').length,   color:'#D97706', bg:'#FEF3C7' },
    { label:'New',        count: jobs.filter(j=>j.status==='new').length,            color:'#6366F1', bg:'#EDE9FE' },
    { label:'Cancelled',  count: jobs.filter(j=>j.status==='cancelled').length,      color:'#94A3B8', bg:'#F1F5F9' },
  ].filter(s => s.count > 0)

  // Jobs by apt type
  const APT = { studio:'Studio', '1br':'1 Bedroom', '2br':'2 Bedrooms', '3br':'3 Bedrooms', house:'House' }
  const byType = Object.entries(
    completed.reduce((acc, j) => { acc[j.apt_type] = (acc[j.apt_type]||0) + 1; return acc }, {})
  ).sort((a,b) => b[1]-a[1]).map(([k,v]) => ({ label: APT[k]??k, count:v }))
  const maxType = Math.max(...byType.map(t => t.count), 1)

  // Top crew by job count (from job_assignments would be better but we approximate from crew size)
  // Revenue per crew size
  const byCrewSize = [2,3,4].map(n => ({
    label: `${n} Movers`,
    count: completed.filter(j => j.movers_count === n).length,
    rev:   revenue(completed.filter(j => j.movers_count === n)),
  })).filter(x => x.count > 0)

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif", maxWidth:1000 }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0F172A', margin:'0 0 4px', letterSpacing:'-0.4px' }}>Analytics</h1>
        <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>Revenue & performance overview · {format(now, 'MMMM yyyy')}</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }} className="stats-grid-4">
        {[
          { icon: DollarSign, label:'This Month', value: fmtD(revenueThis), sub: growth !== null ? `${growth>=0?'+':''}${growth.toFixed(0)}% vs last month` : 'First month', color:'#1D4ED8', bg:'#EFF6FF', trend: growth },
          { icon: TrendingUp,  label:'Last Month',  value: fmtD(revenueLast), sub: `${jobsLastMonth.length} jobs completed`, color:'#6366F1', bg:'#EDE9FE', trend: null },
          { icon: Star,        label:'YTD Revenue',  value: fmtD(revenueYTD),  sub: `${completed.filter(j=>parseISO(j.move_date).getFullYear()===now.getFullYear()).length} jobs this year`, color:'#059669', bg:'#D1FAE5', trend: null },
          { icon: Briefcase,   label:'Avg Job Value', value: fmtD(avgJob),     sub: `${completed.length} total completed`, color:'#D97706', bg:'#FEF3C7', trend: null },
        ].map(({ icon:Icon, label, value, sub, color, bg, trend }) => (
          <div key={label} style={{ ...card, position:'relative', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={17} color={color}/>
              </div>
              {trend !== null && (
                <span style={{ fontSize:11, fontWeight:700, color: trend>=0?'#059669':'#DC2626', background: trend>=0?'#D1FAE5':'#FEE2E2', padding:'3px 8px', borderRadius:20 }}>
                  {trend>=0?'↑':'↓'} {Math.abs(trend).toFixed(0)}%
                </span>
              )}
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:'#0F172A', letterSpacing:'-0.5px' }}>{value}</div>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{label}</div>
            <div style={{ fontSize:11, color:'#64748B', marginTop:2, fontWeight:500 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }} className="stats-grid-3">
        {[
          { label:'Active Crew',    value: crew.length,     icon:'👷', color:'#1D4ED8' },
          { label:'Total Customers', value: customers,       icon:'👥', color:'#059669' },
          { label:'This Month Jobs', value: jobsThisMonth.length, icon:'📋', color:'#D97706' },
        ].map(s => (
          <div key={s.label} style={{ ...card, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#0F172A' }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#94A3B8', marginTop:1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }} className="stats-grid-main">

        {/* Revenue chart — last 6 months */}
        <div style={card}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 20px' }}>Revenue — Last 6 Months</h2>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:160 }}>
            {months.map(m => {
              const isThis = m.month === format(now, 'yyyy-MM')
              const h = m.rev > 0 ? Math.max((m.rev / maxRev) * 140, 8) : 4
              return (
                <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ fontSize:10, fontWeight:700, color: m.rev>0?'#0F172A':'#CBD5E1' }}>
                    {m.rev > 0 ? fmtD(m.rev) : ''}
                  </div>
                  <div style={{ width:'100%', position:'relative' }}>
                    <div style={{ height:h, borderRadius:'6px 6px 0 0', background: isThis ? 'linear-gradient(180deg,#6366F1,#1D4ED8)' : 'linear-gradient(180deg,#93C5FD,#BFDBFE)', transition:'height 0.3s', width:'100%' }}/>
                  </div>
                  <div style={{ fontSize:11, fontWeight: isThis?700:400, color: isThis?'#1D4ED8':'#94A3B8' }}>{m.label}</div>
                  {m.count > 0 && <div style={{ fontSize:10, color:'#CBD5E1' }}>{m.count} jobs</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Jobs by status */}
        <div style={card}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 16px' }}>Jobs by Status</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {byStatus.map(s => (
              <div key={s.label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{s.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.count}</span>
                </div>
                <div style={{ height:6, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(s.count/jobs.length*100).toFixed(0)}%`, background:s.color, borderRadius:4, transition:'width 0.4s' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }} className="stats-grid-2">

        {/* Jobs by home type */}
        <div style={card}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 16px' }}>Completed Jobs by Home Type</h2>
          {byType.length === 0
            ? <div style={{ textAlign:'center', color:'#94A3B8', fontSize:13, padding:'20px 0' }}>No data yet</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {byType.map(t => (
                  <div key={t.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{t.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#6366F1' }}>{t.count} jobs</span>
                    </div>
                    <div style={{ height:8, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(t.count/maxType*100).toFixed(0)}%`, background:'linear-gradient(90deg,#6366F1,#3B82F6)', borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Revenue by crew size */}
        <div style={card}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 16px' }}>Revenue by Crew Size</h2>
          {byCrewSize.length === 0
            ? <div style={{ textAlign:'center', color:'#94A3B8', fontSize:13, padding:'20px 0' }}>No data yet</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {byCrewSize.map(c => (
                  <div key={c.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#F8FAFF', borderRadius:12 }}>
                    <div style={{ fontSize:20 }}>👷</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{c.label}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>{c.count} jobs completed</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'#1D4ED8' }}>{fmtD(c.rev)}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>avg {fmtD(c.count ? c.rev/c.count : 0)}/job</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Recent completed jobs */}
      <div style={card}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 14px' }}>Recent Completed Jobs</h2>
        {completed.length === 0
          ? <div style={{ textAlign:'center', color:'#94A3B8', fontSize:13, padding:'20px 0' }}>No completed jobs yet</div>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid #F1F5F9' }}>
                    {['Date','Home','Crew','Hours','Revenue'].map(h => (
                      <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...completed].reverse().slice(0,8).map((j,i) => (
                    <tr key={j.id} style={{ borderBottom:'0.5px solid #F8FAFF', background: i%2===0?'white':'#FAFBFF' }}>
                      <td style={{ padding:'9px 10px', fontWeight:600, color:'#0F172A' }}>{format(parseISO(j.move_date),'MMM d, yyyy')}</td>
                      <td style={{ padding:'9px 10px', color:'#64748B' }}>{APT[j.apt_type]??j.apt_type}</td>
                      <td style={{ padding:'9px 10px', color:'#64748B' }}>{j.movers_count} movers</td>
                      <td style={{ padding:'9px 10px', color:'#64748B' }}>{j.estimated_hours}h</td>
                      <td style={{ padding:'9px 10px', fontWeight:700, color:'#059669' }}>{fmtD(j.actual_total ?? j.total_price ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <style>{`
        @media(max-width:768px){
          .stats-grid-4{grid-template-columns:1fr 1fr !important;}
          .stats-grid-3{grid-template-columns:1fr !important;}
          .stats-grid-main{grid-template-columns:1fr !important;}
          .stats-grid-2{grid-template-columns:1fr !important;}
        }
      `}</style>
    </div>
  )
}
