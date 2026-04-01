import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Simple in-memory rate limiter: 5 requests per IP per day
const rateLimiter = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 86_400_000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again tomorrow.' }, { status: 429 })
  }

  const { id } = await req.json()

  // Get idea
  const { data: idea, error } = await supabase
    .from('tinker_ideas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  // Mark as researching
  await supabase.from('tinker_ideas').update({ status: 'researching' }).eq('id', id)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a senior product and technical researcher.

Idea Title: ${idea.title}
Description: ${idea.description || 'No description provided'}

Produce a research brief with:
1. MARKET SCAN: 3 existing solutions and their gaps
2. DIFFERENTIATION: what angle makes this worth building
3. MVP SPEC: stack, core features, what to cut
4. KILL/BUILD verdict with one-sentence rationale

Return ONLY valid JSON in this exact format:
{
  "market_scan": {
    "solutions": [
      { "name": "Product Name", "gap": "what they're missing" },
      { "name": "Product Name", "gap": "what they're missing" },
      { "name": "Product Name", "gap": "what they're missing" }
    ]
  },
  "differentiation": "string explaining the unique angle",
  "mvp_spec": {
    "stack": ["tech1", "tech2"],
    "core_features": ["feature1", "feature2", "feature3"],
    "cut": ["thing to cut 1", "thing to cut 2"]
  },
  "verdict": {
    "decision": "build",
    "rationale": "one sentence reason"
  }
}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])

    await supabase
      .from('tinker_ideas')
      .update({
        status: 'ready',
        market_scan: parsed.market_scan,
        differentiation: parsed.differentiation,
        mvp_spec: parsed.mvp_spec,
        verdict: parsed.verdict,
      })
      .eq('id', id)

    await runDesignAgent(id, idea.title, idea.description, parsed)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Research agent error:', err)
    await supabase.from('tinker_ideas').update({ status: 'new' }).eq('id', id)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function runDesignAgent(id: string, title: string, description: string, research: any) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a UI designer. Create a simple HTML+CSS wireframe/mockup for this product idea.

Idea: ${title}
Description: ${description}
Core Features: ${research.mvp_spec?.core_features?.join(', ')}
Stack: ${research.mvp_spec?.stack?.join(', ')}

Generate a single self-contained HTML snippet (no <html>/<body> tags, just the inner content) showing a clean, minimal UI mockup using only inline styles.
Make it look like a real app screenshot. Use a light background. Keep it under 100 lines.
Return ONLY the HTML, no explanation.`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const html = raw.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim()
    await supabase.from('tinker_ideas').update({ mockup_html: html }).eq('id', id)
  } catch (e) {
    console.error('Design agent failed:', e)
  }
}
