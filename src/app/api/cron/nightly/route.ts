import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  // Get all new ideas
  const { data: ideas } = await supabase
    .from('tinker_ideas')
    .select('id')
    .eq('status', 'new')

  if (!ideas || ideas.length === 0) {
    return NextResponse.json({ message: 'No new ideas to process' })
  }

  const results = []
  for (const idea of ideas) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idea.id }),
      })
      results.push({ id: idea.id, success: res.ok })
    } catch (e) {
      results.push({ id: idea.id, success: false, error: String(e) })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
