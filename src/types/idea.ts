export type IdeaStatus = 'new' | 'researching' | 'ready' | 'building'

export interface Idea {
  id: string
  created_at: string
  title: string
  description: string
  status: IdeaStatus
  market_scan: MarketScan | null
  differentiation: string | null
  mvp_spec: MvpSpec | null
  verdict: Verdict | null
  mockup_html: string | null
}

export interface MarketScan {
  solutions: Array<{ name: string; gap: string }>
}

export interface MvpSpec {
  stack: string[]
  core_features: string[]
  cut: string[]
}

export interface Verdict {
  decision: 'kill' | 'build'
  rationale: string
}
