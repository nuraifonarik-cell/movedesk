import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars — check your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ---- helpers ----

export const getJobs = async ({ status, from, to } = {}) => {
  let q = supabase
    .from('jobs')
    .select(`*, customer:customers(id, full_name, phone, email)`)
    .order('move_date', { ascending: true })

  if (status) q = q.eq('status', status)
  if (from)   q = q.gte('move_date', from)
  if (to)     q = q.lte('move_date', to)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const getJob = async (id) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`*, customer:customers(*), assignments:job_assignments(*, crew_member:crew_members(*))`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createJob = async (job) => {
  const { data, error } = await supabase.from('jobs').insert(job).select().single()
  if (error) throw error
  return data
}

export const updateJob = async (id, updates) => {
  const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*, jobs(id, status, move_date, total_price)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createCustomer = async (customer) => {
  const { data, error } = await supabase.from('customers').insert(customer).select().single()
  if (error) throw error
  return data
}

export const getCrew = async () => {
  const { data, error } = await supabase
    .from('crew_members')
    .select('*')
    .eq('is_active', true)
    .order('full_name')
  if (error) throw error
  return data
}

// ---- price calculator ----
export const calcPrice = ({ aptType, moversCount, distanceMiles }) => {
  const hours = { studio: 2, '1br': 4, '2br': 6, '3br': 8, house: 10 }[aptType] ?? 4
  const rate  = { 2: 120, 3: 165, 4: 210 }[moversCount] ?? 165
  const mats  = { studio: 40, '1br': 75, '2br': 110, '3br': 150, house: 200 }[aptType] ?? 75
  const travel = Math.round((distanceMiles ?? 0) * 2.5)
  const total  = rate * hours + travel + mats

  return { hours, rate, travelFee: travel, materialsFee: mats, total }
}
