import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MessageSquare, Send, ChevronLeft, Phone, ExternalLink } from 'lucide-react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { useNavigate } from 'react-router-dom'

function timeLabel(iso) {
  const d = parseISO(iso)
  if (isToday(d))     return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

function normalizePhone(p = '') {
  return p.replace(/\D/g, '').slice(-10)
}

export default function MessagesPage() {
  const [convs,    setConvs]    = useState([])
  const [sel,      setSel]      = useState(null)
  const [msgs,     setMsgs]     = useState([])
  const [reply,    setReply]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const bottomRef  = useRef(null)
  const navigate   = useNavigate()

  const loadConvs = async () => {
    const { data } = await supabase
      .from('sms_messages')
      .select('*, customer:customers(id, full_name, phone)')
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const groups = {}
    data.forEach(m => {
      const key = m.customer_id
        ?? (m.direction === 'inbound' ? m.from_phone : m.to_phone)
      if (!groups[key]) {
        const phone = m.customer?.phone
          ?? (m.direction === 'inbound' ? m.from_phone : m.to_phone)
        groups[key] = {
          key,
          customer_id:   m.customer_id,
          customer_name: m.customer?.full_name ?? 'Unknown',
          phone,
          job_id:        m.job_id,
          last_body:     m.body,
          last_time:     m.created_at,
          unread:        0,
        }
      }
      if (m.direction === 'inbound' && !m.read) groups[key].unread++
    })

    setConvs(Object.values(groups))
    setLoading(false)
  }

  const openConv = async (conv) => {
    setSel(conv)
    setReply('')

    const query = supabase
      .from('sms_messages')
      .select('*')
      .order('created_at', { ascending: true })

    const { data } = conv.customer_id
      ? await query.eq('customer_id', conv.customer_id)
      : await query.eq('from_phone', conv.phone).eq('direction', 'inbound')

    setMsgs(data ?? [])

    // Mark as read
    if (conv.customer_id && conv.unread > 0) {
      await supabase
        .from('sms_messages')
        .update({ read: true })
        .eq('customer_id', conv.customer_id)
        .eq('direction', 'inbound')
        .eq('read', false)
      setConvs(cs => cs.map(c => c.key === conv.key ? { ...c, unread: 0 } : c))
    }
  }

  const sendReply = async () => {
    const text = reply.trim()
    if (!text || !sel || sending) return
    setSending(true)
    const toPhone = normalizePhone(sel.phone)
    if (!toPhone) { alert('No phone number'); setSending(false); return }

    const { error } = await supabase.functions.invoke('send-sms', {
      body: {
        to:          sel.phone,
        message:     text,
        customer_id: sel.customer_id ?? undefined,
        job_id:      sel.job_id ?? undefined,
      },
    })

    if (error) {
      alert('Failed to send: ' + (error?.message ?? ''))
    } else {
      const optimistic = {
        id:         crypto.randomUUID(),
        direction:  'outbound',
        body:       text,
        created_at: new Date().toISOString(),
        read:       true,
      }
      setMsgs(ms => [...ms, optimistic])
      setReply('')
      setConvs(cs => cs.map(c =>
        c.key === sel.key ? { ...c, last_body: text, last_time: optimistic.created_at } : c
      ))
    }
    setSending(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }
  }

  useEffect(() => { loadConvs() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // Real-time: new inbound message
  useEffect(() => {
    const channel = supabase
      .channel('sms_messages_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_messages' }, payload => {
        const m = payload.new
        if (m.direction !== 'inbound') return

        // Update conversations list
        loadConvs()

        // If this conv is open, append
        if (sel && (m.customer_id === sel.customer_id || m.from_phone === sel.phone)) {
          setMsgs(ms => [...ms, m])
          // Mark read immediately
          supabase.from('sms_messages').update({ read: true }).eq('id', m.id).then(() => {})
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sel])

  const inp = {
    flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 14px',
    fontSize: 14, outline: 'none', background: 'white', fontFamily: 'inherit', resize: 'none',
  }

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: "'Inter',system-ui,sans-serif", overflow: 'hidden' }}>

      {/* ── Conversation list ── */}
      <div style={{
        width: sel ? 0 : '100%', maxWidth: 340, flexShrink: 0,
        borderRight: '1px solid #E2E8F0', background: 'white',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'width 0.2s',
      }} className="conv-panel">

        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #F1F5F9' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>Messages</h1>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '3px 0 0' }}>
            SMS conversations with customers
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
          ) : convs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageSquare size={32} color="#CBD5E1" style={{ marginBottom: 12 }}/>
              <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>No messages yet</p>
              <p style={{ color: '#CBD5E1', fontSize: 12, margin: '6px 0 0' }}>
                Messages from customers will appear here
              </p>
            </div>
          ) : (
            convs.map(c => (
              <button key={c.key} onClick={() => openConv(c)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', border: 'none', background: sel?.key === c.key ? '#EFF6FF' : 'white',
                  borderBottom: '1px solid #F8FAFF', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: c.unread > 0 ? '#1D4ED8' : '#E2E8F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700,
                  color: c.unread > 0 ? 'white' : '#64748B',
                }}>
                  {c.customer_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: c.unread > 0 ? 700 : 600, color: '#0F172A' }}>
                      {c.customer_name}
                    </span>
                    <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, marginLeft: 8 }}>
                      {timeLabel(c.last_time)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: c.unread > 0 ? '#374151' : '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c.unread > 0 ? 600 : 400 }}>
                      {c.last_body}
                    </span>
                    {c.unread > 0 && (
                      <span style={{ background: '#1D4ED8', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}>
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat panel ── */}
      {sel ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFF' }}>

          {/* Chat header */}
          <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setSel(null)}
              style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={16} color="#374151"/>
            </button>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {sel.customer_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{sel.customer_name}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{sel.phone}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {sel.phone && (
                <a href={`tel:${sel.phone}`}
                  style={{ width: 34, height: 34, borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                  title="Call">
                  <Phone size={14} color="#059669"/>
                </a>
              )}
              {sel.job_id && (
                <button onClick={() => navigate(`/jobs/${sel.job_id}`)}
                  style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Open job">
                  <ExternalLink size={14} color="#1D4ED8"/>
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map(m => {
              const out = m.direction === 'outbound'
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '72%', padding: '10px 14px', borderRadius: out ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: out ? '#1D4ED8' : 'white',
                    color: out ? 'white' : '#0F172A',
                    fontSize: 13, lineHeight: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}>
                    <div>{m.body}</div>
                    <div style={{ fontSize: 10, color: out ? 'rgba(255,255,255,0.6)' : '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                      {format(parseISO(m.created_at), 'h:mm a')}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Reply box */}
          <div style={{ background: 'white', borderTop: '1px solid #E2E8F0', padding: '12px 18px', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              style={inp}
            />
            <button onClick={sendReply} disabled={!reply.trim() || sending}
              style={{
                width: 42, height: 42, borderRadius: 12, border: 'none', flexShrink: 0,
                background: reply.trim() && !sending ? '#1D4ED8' : '#E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: reply.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}>
              <Send size={16} color={reply.trim() && !sending ? 'white' : '#94A3B8'}/>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFF' }} className="hidden-mobile">
          <div style={{ textAlign: 'center' }}>
            <MessageSquare size={40} color="#CBD5E1" style={{ marginBottom: 12 }}/>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: 0 }}>Select a conversation</p>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .conv-panel { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}
