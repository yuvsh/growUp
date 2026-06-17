// Feeding screen tests (M3-5)
// Mocks: useChild, useWeights, useFeeding, react-router-dom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Feeding } from './Feeding'
import type { Child, WeightEntry, FeedingConfig } from '../../types/index'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode
    to: string
    className?: string
  }): React.JSX.Element => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

// ---- useChild ---------------------------------------------------------------

interface MockUseChildResult {
  child: Child | null
  loading: boolean
  error: Error | null
}

const mockUseChildState: MockUseChildResult = {
  child: null,
  loading: false,
  error: null,
}

vi.mock('../../lib/hooks/useChild', () => ({
  useChild: (): MockUseChildResult => mockUseChildState,
}))

// ---- useWeights -------------------------------------------------------------

interface MockUseWeightsResult {
  weights: WeightEntry[]
  loading: boolean
  error: Error | null
}

const mockUseWeightsState: MockUseWeightsResult = {
  weights: [],
  loading: false,
  error: null,
}

vi.mock('../../lib/hooks/WeightsProvider', () => ({
  useWeights: (): MockUseWeightsResult => mockUseWeightsState,
}))

// ---- useFeeding -------------------------------------------------------------

const mockSaveConfig = vi.fn().mockResolvedValue({})

interface MockUseFeedingResult {
  config: FeedingConfig | null
  loading: boolean
  error: Error | null
  saveConfig: typeof mockSaveConfig
}

const mockUseFeedingState: MockUseFeedingResult = {
  config: null,
  loading: false,
  error: null,
  saveConfig: mockSaveConfig,
}

vi.mock('../../lib/hooks/useFeeding', () => ({
  useFeeding: (): MockUseFeedingResult => mockUseFeedingState,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fixtureChild: Child = {
  id: 'child-1',
  ownerId: 'user-1',
  name: 'Baby',
  sex: 'female',
  dateOfBirth: '2025-01-01',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

function makeWeightEntry(weightGrams: number, date = '2025-06-01'): WeightEntry {
  return {
    id: 'entry-1',
    childId: 'child-1',
    ownerId: 'user-1',
    weightGrams,
    dateMeasured: date,
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  }
}

function makeConfig(overrides: Partial<FeedingConfig> = {}): FeedingConfig {
  return {
    id: 'config-1',
    childId: 'child-1',
    ownerId: 'user-1',
    feedsPerDay: 8,
    useHighCalorie: false,
    kcalPerMl: 0.67,
    mlPerKgMin: 120,
    mlPerKgMax: 200,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderFeeding(): void {
  render(<Feeding />)
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('Feeding — with a latest weight present', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChildState.child = fixtureChild
    mockUseChildState.loading = false
    mockUseChildState.error = null

    // 5 kg = 5000 g
    mockUseWeightsState.weights = [makeWeightEntry(5000)]
    mockUseWeightsState.loading = false
    mockUseWeightsState.error = null

    mockUseFeedingState.config = makeConfig()
    mockUseFeedingState.loading = false
    mockUseFeedingState.error = null
    mockUseFeedingState.saveConfig = mockSaveConfig
  })

  it('prefills the weight input with the latest entry (5 kg)', () => {
    renderFeeding()
    const input = screen.getByLabelText("Baby's weight (kg)")
    expect(input).toHaveValue(5)
  })

  it('shows daily range for 5 kg (600–1000 ml/day)', () => {
    renderFeeding()
    // 5 kg × 120 = 600, 5 kg × 200 = 1000
    expect(screen.getByText(/600/)).toBeInTheDocument()
    expect(screen.getByText(/1000/)).toBeInTheDocument()
    expect(screen.getByText('ml per day')).toBeInTheDocument()
  })

  it('shows per-feed range for 8 feeds (75–125 ml)', () => {
    renderFeeding()
    // 600 / 8 = 75, 1000 / 8 = 125
    expect(screen.getByText(/75/)).toBeInTheDocument()
    expect(screen.getByText(/125/)).toBeInTheDocument()
  })

  it('shows the range note', () => {
    renderFeeding()
    expect(screen.getByText('Based on 120–200 ml per kg per day.')).toBeInTheDocument()
  })

  it('does NOT show the empty state', () => {
    renderFeeding()
    expect(
      screen.queryByText('Enter a weight to see feeding amounts'),
    ).not.toBeInTheDocument()
  })
})

describe('Feeding — no weight and empty field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChildState.child = fixtureChild
    mockUseChildState.loading = false
    mockUseChildState.error = null

    // No weight entries
    mockUseWeightsState.weights = []
    mockUseWeightsState.loading = false
    mockUseWeightsState.error = null

    mockUseFeedingState.config = makeConfig()
    mockUseFeedingState.loading = false
    mockUseFeedingState.error = null
    mockUseFeedingState.saveConfig = mockSaveConfig
  })

  it('shows the EmptyState title', () => {
    renderFeeding()
    expect(
      screen.getByRole('heading', { name: 'Enter a weight to see feeding amounts' }),
    ).toBeInTheDocument()
  })

  it('shows a CTA link to /growth', () => {
    renderFeeding()
    const link = screen.getByRole('link', { name: 'Add a weight' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/growth')
  })

  it('does NOT show results cards', () => {
    renderFeeding()
    expect(screen.queryByText('Daily amount')).not.toBeInTheDocument()
    expect(screen.queryByText('Per feed')).not.toBeInTheDocument()
  })
})

describe('Feeding — changing feeds via the stepper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChildState.child = fixtureChild
    mockUseChildState.loading = false
    mockUseChildState.error = null

    mockUseWeightsState.weights = [makeWeightEntry(5000)]
    mockUseWeightsState.loading = false
    mockUseWeightsState.error = null

    mockUseFeedingState.config = makeConfig({ feedsPerDay: 8 })
    mockUseFeedingState.loading = false
    mockUseFeedingState.error = null
    mockUseFeedingState.saveConfig = mockSaveConfig
  })

  it('clicking + on the stepper calls saveConfig with feedsPerDay 9', async () => {
    const user = userEvent.setup()
    renderFeeding()

    await user.click(screen.getByRole('button', { name: 'Increase feeds per day' }))

    expect(mockSaveConfig).toHaveBeenCalledTimes(1)
    expect(mockSaveConfig).toHaveBeenCalledWith({ feedsPerDay: 9 })
  })

  it('clicking − on the stepper calls saveConfig with feedsPerDay 7', async () => {
    const user = userEvent.setup()
    renderFeeding()

    await user.click(screen.getByRole('button', { name: 'Decrease feeds per day' }))

    expect(mockSaveConfig).toHaveBeenCalledTimes(1)
    expect(mockSaveConfig).toHaveBeenCalledWith({ feedsPerDay: 7 })
  })
})

describe('Feeding — enabling high-calorie shows panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChildState.child = fixtureChild
    mockUseChildState.loading = false
    mockUseChildState.error = null

    mockUseWeightsState.weights = [makeWeightEntry(5000)]
    mockUseWeightsState.loading = false
    mockUseWeightsState.error = null

    mockUseFeedingState.config = makeConfig({ useHighCalorie: true, kcalPerMl: 1.0 })
    mockUseFeedingState.loading = false
    mockUseFeedingState.error = null
    mockUseFeedingState.saveConfig = mockSaveConfig
  })

  it('renders the HighCaloriePanel toggle when weight is present', () => {
    renderFeeding()
    expect(
      screen.getByRole('checkbox', { name: 'High-calorie / special formula' }),
    ).toBeInTheDocument()
  })

  it('shows adjusted range output when enabled with valid kcal', () => {
    renderFeeding()
    // HighCaloriePanel shows "Adjusted daily amount" when enabled + valid kcal
    expect(screen.getByText('Adjusted daily amount')).toBeInTheDocument()
  })

  it('shows calorie target when enabled with valid kcal', () => {
    renderFeeding()
    expect(screen.getByText('Calorie target')).toBeInTheDocument()
  })
})
