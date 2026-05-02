import { useEffect, useState } from 'react'
import { getCustomers } from '../lib/supabase'
import { Search } from 'lucide-react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    getCustomers().then(d => { setCustomers(d ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
  })

  const initials = name => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'

  const COLORS = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-rose-100 text-rose-700']

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Клиенты</h1>
        <span className="text-sm text-gray-400">{customers.length} всего</span>
      </div>

      <div className="relative max-w-xs mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Имя, телефон, email..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">Клиентов не найдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Клиент', 'Телефон', 'Email', 'Заявки', 'Потрачено'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c, i) => {
                const total = c.jobs?.reduce((s, j) => s + (j.total_price ?? 0), 0) ?? 0
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${COLORS[i % COLORS.length]}`}>
                          {initials(c.full_name)}
                        </div>
                        <span className="font-medium text-gray-900">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{c.phone}</td>
                    <td className="px-5 py-3.5 text-gray-500">{c.email ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{c.jobs?.length ?? 0}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{total ? `$${total.toLocaleString()}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
