import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { messages, ideaId } = await req.json()

  let ideaContext = 'No research available yet.'
  if (ideaId) {
    const { data: idea } = await supabase
      .from('tinker_ideas')
      .select('*')
      .eq('id', ideaId)
      .single()

    if (idea) {
      ideaContext = `Title: ${idea.title}
Description: ${idea.description || 'No description'}
Verdict: ${idea.verdict ? `${idea.verdict.decision.toUpperCase()} — ${idea.verdict.rationale}` : 'Not yet researched'}
Differentiation: ${idea.differentiation || 'Not yet researched'}
Market Scan: ${idea.market_scan ? idea.market_scan.solutions.map((s: any) => `${s.name}: ${s.gap}`).join('; ') : 'Not yet researched'}
MVP Stack: ${idea.mvp_spec ? idea.mvp_spec.stack.join(', ') : 'Not yet researched'}
Core Features: ${idea.mvp_spec ? idea.mvp_spec.core_features.join(', ') : 'Not yet researched'}`
    }
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a sharp product strategist helping the user think through a startup idea. Be concise and direct. Give actionable takes. Don't repeat the research back — build on it.

Here is the research brief:
${ideaContext}`,
    messages,
  })

  return NextResponse.json({ reply: response.content[0].type === 'text' ? response.content[0].text : '' })
}
