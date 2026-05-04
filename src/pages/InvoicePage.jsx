import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob } from '../lib/supabase'
import { downloadInvoice } from '../lib/invoice'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { format } from 'date-fns'

const APT = { studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedrooms', '3br': '3 Bedrooms', house: 'House' }

export default function InvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJob(id).then(j => { setJob(j); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading...</div>
  if (!job)    return <div className="p-8 text-sm text-gray-400">Job not found</div>

  const customer = job.customer ?? {}
  const invoiceNum = `INV-${String(job.id ?? '').slice(0, 6).toUpperCase()}`
  const today = format(new Date(), 'MMMM d, yyyy')
  const moveDate = job.move_date ? format(new Date(job.move_date), 'MMMM d, yyyy') : '—'
  const labor = (job.base_rate ?? 0) * (job.estimated_hours ?? 0)
  const travel = job.travel_fee ?? 0
  const mats = job.materials_fee ?? 0
  const total = job.total_price ?? (labor + travel + mats)
  const deposit = job.deposit_paid ?? 0
  const due = total - deposit

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Toolbar */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center gap-3">
        <button onClick={() => navigate(`/jobs/${id}`)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={14} /> Назад
        </button>
        <button onClick={() => downloadInvoice(job)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Download size={14} /> Download PDF
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <Printer size={14} /> Print
        </button>
        <span className="text-xs text-gray-400 ml-auto">{invoiceNum}</span>
      </div>

      {/* Invoice preview */}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg width="18" height="18" fill="white" viewBox="0 0 16 16">
                    <path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/>
                  </svg>
                </div>
                <span className="text-white text-xl font-bold">Move Go</span>
              </div>
              <div className="text-blue-200 text-xs">Moving & Junk Removal · Seattle, WA</div>
              <div className="text-blue-200 text-xs mt-0.5">(206) 567-1499 · movegowa@gmail.com</div>
            </div>
            <div className="text-right">
              <div className="text-white text-2xl font-bold">INVOICE</div>
              <div className="text-blue-200 text-sm mt-1">{invoiceNum}</div>
              <div className="text-blue-200 text-xs mt-0.5">{today}</div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Bill to + Move details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Bill To</div>
              <div className="font-semibold text-gray-900">{customer.full_name ?? '—'}</div>
              <div className="text-sm text-gray-500 mt-1">{customer.phone}</div>
              <div className="text-sm text-gray-500">{customer.email}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Move Details</div>
              <div className="text-sm space-y-1">
                <div className="flex gap-2"><span className="text-gray-400 w-14">Date</span><span className="text-gray-800 font-medium">{moveDate}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-14">From</span><span className="text-gray-800 text-xs">{job.from_address}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-14">To</span><span className="text-gray-800 text-xs">{job.to_address}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-14">Type</span><span className="text-gray-800">{APT[job.apt_type]}</span></div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-4 py-2.5 rounded-tl-lg font-medium">Description</th>
                <th className="text-right px-4 py-2.5 font-medium">Qty</th>
                <th className="text-right px-4 py-2.5 font-medium">Rate</th>
                <th className="text-right px-4 py-2.5 rounded-tr-lg font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">Labor — {job.movers_count} Movers</div>
                  <div className="text-xs text-gray-400">{APT[job.apt_type]} · {job.estimated_hours} hrs estimated</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{job.estimated_hours} hrs</td>
                <td className="px-4 py-3 text-right text-gray-600">${job.base_rate}/hr</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">${labor.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">Travel Fee</div>
                  <div className="text-xs text-gray-400">{job.distance_miles} miles</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">1</td>
                <td className="px-4 py-3 text-right text-gray-600">${travel}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">${travel.toLocaleString()}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">Packing Materials</div>
                  <div className="text-xs text-gray-400">Boxes, tape, wrap</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">1</td>
                <td className="px-4 py-3 text-right text-gray-600">${mats}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">${mats.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>${(labor+travel+mats).toLocaleString()}</span>
              </div>
              {deposit > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Deposit Paid</span><span>-${deposit.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center bg-blue-600 text-white rounded-xl px-4 py-3 mt-2">
                <span className="font-semibold">Total Due</span>
                <span className="text-xl font-bold">${due.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="mt-6 bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Payment: </span>
            Due upon completion. Accepted: Cash · Credit/Debit Card (card rate applies)
          </div>

          {job.notes && (
            <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Notes: </span>{job.notes}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Move Go Moving & Junk Removal · Seattle, WA · (206) 567-1499 · movegowa@gmail.com
            <br/>Thank you for choosing Move Go!
          </div>
        </div>
      </div>
    </div>
  )
}
