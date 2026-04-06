import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Idea } from '@/types/idea'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-500',
  researching: 'bg-amber-100 text-amber-600',
  ready: 'bg-emerald-100 text-emerald-700',
  building: 'bg-blue-100 text-blue-700',
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: idea } = await supabase
    .from('tinker_ideas')
    .select('*')
    .eq('id', id)
    .single()

  if (!idea) notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Tinker Agent 🐙</a>
          <span className="text-xs text-gray-300">
            {new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
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
              {idea.market_scan.solutions.map((s: any, i: number) => (
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
                { label: 'Core Features', items: idea.mvp_spec.core_features },
                { label: 'Stack', items: idea.mvp_spec.stack },
              ].map(({ label, items }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-semibold mb-2">{label}</p>
                  <ul className="space-y-1">
                    {items?.map((item: string, i: number) => (
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
    </main>
  )
}
