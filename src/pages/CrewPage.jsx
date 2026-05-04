import { useEffect, useState } from 'react'
import { getCrew } from '../lib/supabase'

const ROLE_LABELS = { driver: 'Driver', mover: 'Mover', lead: 'Lead' }
const ROLE_COLORS = { driver: 'bg-blue-50 text-blue-700', mover: 'bg-gray-100 text-gray-600', lead: 'bg-amber-50 text-amber-700' }
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700'
]

export default function CrewPage() {
  const [crew, setCrew]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCrew().then(d => { setCrew(d ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const initials = name => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Crew</h1>
        <span className="text-sm text-gray-400">{crew.length} members</span>
      </div>

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {crew.map((member, i) => (
            <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {initials(member.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{member.full_name}</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" title="Активен" />
              </div>
              <div className="text-xs text-gray-500">{member.phone}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
