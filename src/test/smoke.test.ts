// Smoke test — verifies the Vitest runner is wired up correctly.
describe('Vitest smoke test', () => {
  it('always passes', () => {
    expect(true).toBe(true)
  })

  it('basic arithmetic works', () => {
    expect(1 + 1).toBe(2)
  })
})
