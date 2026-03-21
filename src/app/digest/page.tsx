import { supabase } from '@/lib/supabase'
import type { Idea } from '@/types/idea'

export const revalidate = 0

export default async function DigestPage() {
  const { data: ideas } = await supabase
    .from('tinker_ideas')
    .select('*')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })

  const builds = (ideas || []).filter(i => i.verdict?.decision === 'build')
  const kills = (ideas || []).filter(i => i.verdict?.decision === 'kill')

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Research Digest</h1>
        <p className="text-gray-400 mb-8">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

        {builds.length > 0 && (
          <section className="mb-10">
            <h2 className="text-green-400 font-bold text-lg mb-4 uppercase tracking-wide">✓ Build These</h2>
            <div className="space-y-6">
              {builds.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
            </div>
          </section>
        )}

        {kills.length > 0 && (
          <section>
            <h2 className="text-red-400 font-bold text-lg mb-4 uppercase tracking-wide">✗ Kill These</h2>
            <div className="space-y-6">
              {kills.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
            </div>
          </section>
        )}

        {(ideas || []).length === 0 && (
          <p className="text-gray-500 text-center py-20">No researched ideas yet.</p>
        )}
      </div>
    </main>
  )
}

function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="font-bold text-lg mb-1">{idea.title}</h3>
      {idea.description && <p className="text-gray-400 text-sm mb-3">{idea.description}</p>}
      {idea.verdict && <p className="text-gray-300 italic mb-3">"{idea.verdict.rationale}"</p>}
      {idea.differentiation && (
        <p className="text-gray-400 text-sm"><span className="text-gray-500">Angle: </span>{idea.differentiation}</p>
      )}
    </div>
  )
}
