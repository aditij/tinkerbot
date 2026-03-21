import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET() {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: 'Generate one random, creative, specific startup idea. Return ONLY a JSON object like: {"title": "Short idea name", "description": "One sentence description"}. Be creative and specific — not generic. No explanation.',
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })

  return NextResponse.json(JSON.parse(match[0]))
}
