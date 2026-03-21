'use client'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { supabase } from '@/lib/supabase'
import type { Idea } from '@/types/idea'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-500',
  researching: 'bg-amber-100 text-amber-600',
  ready: 'bg-emerald-100 text-emerald-700',
  building: 'bg-blue-100 text-blue-700',
}

// ─── Detail View ────────────────────────────────────────────────
function DetailView({
  idea, ideas, onSelect, onBack, runNow, runningId, deleteIdea, markBuilding,
}: {
  idea: Idea
  ideas: Idea[]
  onSelect: (i: Idea) => void
  onBack: () => void
  runNow: (id: string) => void
  runningId: string | null
  deleteIdea: (id: string) => void
  markBuilding: (id: string) => void
}) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => {
    try {
      const saved = localStorage.getItem(`chat_${idea.id}`)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [chatLoading, setChatLoading] = useState(false)

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return
    const text = chatInput.trim()
    setChatInput('')
    const newMessages = [...chatMessages, { role: 'user' as const, content: text }]
    setChatMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, ideaId: idea.id }),
      })
      const data = await res.json()
      const updated = [...newMessages, { role: 'assistant' as const, content: data.reply }]
      setChatMessages(updated)
      localStorage.setItem(`chat_${idea.id}`, JSON.stringify(updated))
    } catch {
      setChatMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (chatOpen) setTimeout(() => chatInputRef.current?.focus(), 100)
  }, [chatOpen])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm">My Ideas</span>
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xs font-medium">
            ← Back
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {ideas.map(i => (
            <div
              key={i.id}
              onClick={() => onSelect(i)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${i.id === idea.id ? 'bg-gray-100' : ''}`}
            >
              <p className="font-medium text-gray-800 text-sm truncate">{i.title}</p>
              {i.description && (
                <p className="text-gray-400 text-xs truncate mt-0.5">{i.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[i.status]}`}>
                  {i.status}
                </span>
                <span className="text-gray-300 text-xs">
                  {new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-10 py-10">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-5 text-sm text-gray-400">
              <span>
                {new Date(idea.created_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
              {idea.status === 'researching' && (
                <span className="text-amber-500 animate-pulse">🐙 Tentacling...</span>
              )}
            </div>

            {/* Tags */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${STATUS_COLORS[idea.status]}`}>
                {idea.status}
              </span>
              {idea.verdict && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${idea.verdict.decision === 'build' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {idea.verdict.decision}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{idea.title}</h1>
            {idea.description && (
              <p className="text-gray-500 text-base mb-8 leading-relaxed">{idea.description}</p>
            )}

            {/* Run now */}
            {idea.status === 'new' && (
              <button
                onClick={() => runNow(idea.id)}
                disabled={runningId === idea.id}
                className="mb-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
              >
                {runningId === idea.id ? 'Running...' : '✦ Run Research'}
              </button>
            )}

            {/* Verdict */}
            {idea.verdict && (
              <div className={`p-5 rounded-2xl mb-6 ${idea.verdict.decision === 'build' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-bold text-base mb-1 ${idea.verdict.decision === 'build' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {idea.verdict.decision === 'build' ? '✓ Build this' : '✗ Kill this'}
                </p>
                <p className="text-gray-600 text-sm">{idea.verdict.rationale}</p>
              </div>
            )}

            {/* Differentiation */}
            {idea.differentiation && (
              <div className="mb-7">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Differentiation</h3>
                <p className="text-gray-700 leading-relaxed">{idea.differentiation}</p>
              </div>
            )}

            {/* Market Scan */}
            {idea.market_scan?.solutions && (
              <div className="mb-7">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Market Scan</h3>
                <div className="space-y-2">
                  {idea.market_scan.solutions.map((s, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
                      <span className="font-semibold text-gray-800">{s.name}</span>
                      <span className="text-gray-500"> — {s.gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MVP Spec */}
            {idea.mvp_spec && (
              <div className="mb-7">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">MVP Spec</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Stack', items: idea.mvp_spec.stack },
                    { label: 'Core Features', items: idea.mvp_spec.core_features },
                  ].map(({ label, items }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs text-gray-400 font-semibold mb-2">{label}</p>
                      <ul className="space-y-1">
                        {items?.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mockup */}
            {idea.mockup_html && (
              <div className="mb-7">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">UI Mockup</h3>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div
                    className="overflow-auto max-h-96 p-4"
                    dangerouslySetInnerHTML={{ __html: idea.mockup_html.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim() }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm px-10 py-3 flex items-center justify-between shrink-0">
          <div>
            {idea.status === 'ready' && (
              <button
                onClick={() => markBuilding(idea.id)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Mark as Building →
              </button>
            )}
          </div>
          <button
            onClick={() => deleteIdea(idea.id)}
            className="text-sm text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>

        {/* Floating chat bubble */}
        <button
          onClick={() => setChatOpen(o => !o)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-all z-40"
        >
          {chatOpen ? '×' : '🐙'}
        </button>

        {/* Chat side panel */}
        <div className={`fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-30 transition-transform duration-300 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Ask the Agent 🐙</p>
              <p className="text-gray-400 text-xs truncate max-w-[220px]">{idea.title}</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {chatMessages.length === 0 && (
              <p className="text-gray-400 text-sm text-center pt-8">
                Ask anything — go-to-market, risks, pricing, what to build first...
              </p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm prose-gray max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-gray-100 flex items-center gap-2 px-4 py-3">
            <input
              ref={chatInputRef}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Home (Grid View) ────────────────────────────────────────────
export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selected, setSelected] = useState<Idea | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [diceLoading, setDiceLoading] = useState(false)

  useEffect(() => {
    fetchIdeas()
    const interval = setInterval(fetchIdeas, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selected) {
      const updated = ideas.find(i => i.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [ideas])

  async function fetchIdeas() {
    const { data } = await supabase
      .from('tinker_ideas')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setIdeas(data)
  }

  async function addIdea() {
    if (!title.trim()) return
    setAdding(true)
    await supabase.from('tinker_ideas').insert({
      title: title.trim(),
      description: description.trim(),
      status: 'new',
    })
    setTitle('')
    setDescription('')
    setShowModal(false)
    await fetchIdeas()
    setAdding(false)
  }

  async function runNow(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setRunningId(id)
    try {
      const res = await fetch('/api/agent/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Research failed')
      await fetchIdeas()
    } catch (err) {
      alert('Research failed: ' + (err as Error).message)
    } finally {
      setRunningId(null)
    }
  }

  async function deleteIdea(id: string) {
    await supabase.from('tinker_ideas').delete().eq('id', id)
    setSelected(null)
    fetchIdeas()
  }

  async function markBuilding(id: string) {
    await supabase.from('tinker_ideas').update({ status: 'building' }).eq('id', id)
    fetchIdeas()
  }

  if (selected) {
    const idea = ideas.find(i => i.id === selected.id) || selected
    return (
      <DetailView
        idea={idea}
        ideas={ideas}
        onSelect={setSelected}
        onBack={() => setSelected(null)}
        runNow={runNow}
        runningId={runningId}
        deleteIdea={deleteIdea}
        markBuilding={markBuilding}
      />
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2a3a 45%, #0a3d3d 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-white/80 hover:text-white font-medium text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all"
        >
          + New
        </button>
        <h1 className="text-lg font-bold text-white tracking-tight">🐙 Tinker Agent: 24/7 tinkering</h1>
        <div className="w-24" />
      </div>

      {/* Grid */}
      <div className="px-10 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {ideas.map(idea => (
            <div
              key={idea.id}
              onClick={() => setSelected(idea)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col p-5 relative group hover:-translate-y-1 hover:rotate-1"
              style={{ aspectRatio: '3/4' }}
            >
              <div className="flex items-start justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[idea.status]}`}>
                  {idea.status}
                </span>
                {idea.status === 'new' && (
                  <button
                    onClick={e => runNow(idea.id, e)}
                    disabled={runningId === idea.id}
                    className="opacity-0 group-hover:opacity-100 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg transition-all disabled:opacity-50"
                  >
                    {runningId === idea.id ? '...' : 'Run'}
                  </button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center px-1">
                <h2 className="text-lg font-semibold text-gray-800 text-center leading-snug">{idea.title}</h2>
              </div>

              <div className="text-center space-y-1">
                {idea.verdict && (
                  <p className={`text-xs font-bold uppercase tracking-wide ${idea.verdict.decision === 'build' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {idea.verdict.decision === 'build' ? '✓ Build' : '✗ Kill'}
                  </p>
                )}
                <p className="text-gray-300 text-xs">
                  {new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}

          <div
            onClick={() => setShowModal(true)}
            className="bg-white/30 hover:bg-white/50 border-2 border-dashed border-white/60 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:rotate-1 hover:shadow-xl"
            style={{ aspectRatio: '3/4' }}
          >
            <span className="text-white/60 text-4xl font-light">+</span>
          </div>
        </div>
      </div>

      {/* New Idea Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-800">New Idea</h2>
              <button
                type="button"
                onClick={async () => {
                  setDiceLoading(true)
                  try {
                    const res = await fetch('/api/random-idea')
                    const data = await res.json()
                    setTitle(data.title || '')
                    setDescription(data.description || '')
                  } catch {}
                  finally { setDiceLoading(false) }
                }}
                disabled={diceLoading}
                className="text-xl disabled:opacity-50 hover:scale-125 transition-transform"
                title="Random idea"
              >
                {diceLoading ? '⏳' : '🎲'}
              </button>
            </div>
            <input
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              placeholder="What's the idea?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIdea()}
            />
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-sm"
              placeholder="One-line description..."
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm">
                Cancel
              </button>
              <button
                onClick={addIdea}
                disabled={adding || !title.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {adding ? 'Adding...' : 'Add Idea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
