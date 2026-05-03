import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCustomer, createJob, calcPrice } from '../lib/supabase'

const APT_TYPES = [
  { value: 'studio', label: 'Студия' },
  { value: '1br',    label: '1 спальня' },
  { value: '2br',    label: '2 спальни' },
  { value: '3br',    label: '3 спальни' },
  { value: 'house',  label: 'Дом' },
]

export default function EstimatePage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '', phone: '', email: '',
    from_address: '', to_address: '',
    move_date: '', apt_type: '1br',
    distance_miles: 10, movers_count: 3, notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const price = calcPrice({
    aptType: form.apt_type,
    moversCount: form.movers_count,
    distanceMiles: form.distance_miles,
  })

  const handleSubmit = async (status = 'quoted') => {
    if (!form.full_name || !form.phone || !form.from_address || !form.to_address || !form.move_date) {
      setError('Заполните обязательные поля'); return
    }
    setSaving(true); setError('')
    try {
      const customer = await createCustomer({ full_name: form.full_name, phone: form.phone, email: form.email })
      const job = await createJob({
        customer_id: customer.id,
        status,
        move_date: form.move_date,
        from_address: form.from_address,
        to_address: form.to_address,
        apt_type: form.apt_type,
        distance_miles: form.distance_miles,
        movers_count: form.movers_count,
        estimated_hours: price.hours,
        base_rate: price.rate,
        travel_fee: price.travelFee,
        materials_fee: price.materialsFee,
        total_price: price.total,
        notes: form.notes,
      })
      navigate(`/jobs/${job.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Расчёт цены / Новая заявка</h1>
        <p className="text-sm text-gray-500 mt-0.5">Заполните данные — цена рассчитается автоматически</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Form */}
        <div className="md:col-span-2 space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Клиент</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Имя *</label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="John Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Телефон *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="(917) 555-0100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="john@email.com" type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
              </div>
            </div>
          </div>

          {/* Move details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Детали переезда</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Откуда *</label>
                <input value={form.from_address} onChange={e => set('from_address', e.target.value)}
                  placeholder="123 Main St, Brooklyn"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Куда *</label>
                <input value={form.to_address} onChange={e => set('to_address', e.target.value)}
                  placeholder="456 Park Ave, Queens"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Дата переезда *</label>
                <input type="date" value={form.move_date} onChange={e => set('move_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Тип жилья</label>
                <select value={form.apt_type} onChange={e => set('apt_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
                  {APT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Расстояние (миль)</label>
                <input type="number" min="1" value={form.distance_miles}
                  onChange={e => set('distance_miles', +e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Количество грузчиков</label>
                <select value={form.movers_count} onChange={e => set('movers_count', +e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
                  <option value={2}>2 грузчика</option>
                  <option value={3}>3 грузчика</option>
                  <option value={4}>4 грузчика</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Примечания</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={3} placeholder="Лифт есть, пианино, хрупкие вещи..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Price sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-4 md:p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Расчёт стоимости</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Ставка ({form.movers_count} чел.)</span>
                <span>${price.rate}/ч</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Время (оценка)</span>
                <span>{price.hours} ч</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Труд</span>
                <span>${(price.rate * price.hours).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Транспорт</span>
                <span>${price.travelFee}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Материалы</span>
                <span>${price.materialsFee}</span>
              </div>
              <div className="border-t border-gray-200 pt-2.5 flex justify-between font-semibold text-gray-900 text-base">
                <span>Итого</span>
                <span className="text-brand-600">${price.total.toLocaleString()}</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="mt-5 space-y-2">
              <button
                onClick={() => handleSubmit('scheduled')} disabled={saving}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? 'Сохранение...' : 'Создать заявку'}
              </button>
              <button
                onClick={() => handleSubmit('quoted')} disabled={saving}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                Сохранить как оценку
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
