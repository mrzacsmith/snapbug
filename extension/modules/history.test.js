import { describe, it, expect, vi } from 'vitest'
import { createHistory } from './history.js'

describe('createHistory', () => {
  it('starts with empty actions', () => {
    const h = createHistory()
    expect(h.getActions()).toEqual([])
  })

  it('push adds an action', () => {
    const h = createHistory()
    h.push({ type: 'pen', color: 'red' })
    expect(h.getActions()).toHaveLength(1)
  })

  it('undo removes the last action', () => {
    const h = createHistory()
    h.push({ type: 'pen' })
    h.push({ type: 'arrow' })
    h.undo()
    expect(h.getActions()).toHaveLength(1)
    expect(h.getActions()[0].type).toBe('pen')
  })

  it('redo restores the last undone action', () => {
    const h = createHistory()
    h.push({ type: 'pen' })
    h.push({ type: 'arrow' })
    h.undo()
    h.redo()
    expect(h.getActions()).toHaveLength(2)
    expect(h.getActions()[1].type).toBe('arrow')
  })

  it('undo when empty is a no-op', () => {
    const h = createHistory()
    h.undo()
    expect(h.getActions()).toEqual([])
  })

  it('redo when redo stack is empty is a no-op', () => {
    const h = createHistory()
    h.push({ type: 'pen' })
    h.redo()
    expect(h.getActions()).toHaveLength(1)
  })

  it('push after undo clears redo stack', () => {
    const h = createHistory()
    h.push({ type: 'pen' })
    h.push({ type: 'arrow' })
    h.undo()
    h.push({ type: 'rect' })
    h.redo()
    // Redo should be empty, so still 2 actions
    expect(h.getActions()).toHaveLength(2)
    expect(h.getActions()[1].type).toBe('rect')
  })

  it('clear empties both stacks', () => {
    const h = createHistory()
    h.push({ type: 'pen' })
    h.push({ type: 'arrow' })
    h.undo()
    h.clear()
    expect(h.getActions()).toEqual([])
    h.redo()
    expect(h.getActions()).toEqual([])
  })

  it('calls onChange callback on push', () => {
    const cb = vi.fn()
    const h = createHistory(cb)
    h.push({ type: 'pen' })
    expect(cb).toHaveBeenCalledOnce()
  })

  it('calls onChange callback on undo', () => {
    const cb = vi.fn()
    const h = createHistory(cb)
    h.push({ type: 'pen' })
    cb.mockClear()
    h.undo()
    expect(cb).toHaveBeenCalledOnce()
  })

  it('calls onChange callback on redo', () => {
    const cb = vi.fn()
    const h = createHistory(cb)
    h.push({ type: 'pen' })
    h.undo()
    cb.mockClear()
    h.redo()
    expect(cb).toHaveBeenCalledOnce()
  })

  it('calls onChange callback on clear', () => {
    const cb = vi.fn()
    const h = createHistory(cb)
    h.push({ type: 'pen' })
    cb.mockClear()
    h.clear()
    expect(cb).toHaveBeenCalledOnce()
  })

  it('does not call onChange on no-op undo', () => {
    const cb = vi.fn()
    const h = createHistory(cb)
    h.undo()
    expect(cb).not.toHaveBeenCalled()
  })

  it('does not call onChange on no-op redo', () => {
    const cb = vi.fn()
    const h = createHistory(cb)
    h.redo()
    expect(cb).not.toHaveBeenCalled()
  })
})
