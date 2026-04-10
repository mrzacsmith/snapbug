import { describe, it, expect } from 'vitest'
import { createToolbarState, COLORS, WIDTHS } from './toolbar.js'

describe('createToolbarState', () => {
  it('initializes with default tool, color, and width', () => {
    const state = createToolbarState()
    expect(state.getTool()).toBe('pen')
    expect(state.getColor()).toBe('#ff0000')
    expect(state.getWidth()).toBe(2)
  })

  it('changes tool', () => {
    const state = createToolbarState()
    state.setTool('arrow')
    expect(state.getTool()).toBe('arrow')
  })

  it('changes color', () => {
    const state = createToolbarState()
    state.setColor('#0066ff')
    expect(state.getColor()).toBe('#0066ff')
  })

  it('changes width', () => {
    const state = createToolbarState()
    state.setWidth(8)
    expect(state.getWidth()).toBe(8)
  })

  it('notifies on tool change', () => {
    const state = createToolbarState()
    let notified = null
    state.onChange((prop, val) => { notified = { prop, val } })
    state.setTool('rect')
    expect(notified).toEqual({ prop: 'tool', val: 'rect' })
  })

  it('notifies on color change', () => {
    const state = createToolbarState()
    let notified = null
    state.onChange((prop, val) => { notified = { prop, val } })
    state.setColor('#00cc44')
    expect(notified).toEqual({ prop: 'color', val: '#00cc44' })
  })

  it('notifies on width change', () => {
    const state = createToolbarState()
    let notified = null
    state.onChange((prop, val) => { notified = { prop, val } })
    state.setWidth(4)
    expect(notified).toEqual({ prop: 'width', val: 4 })
  })
})

describe('COLORS', () => {
  it('has 6 colors with red first', () => {
    expect(COLORS).toHaveLength(6)
    expect(COLORS[0].value).toBe('#ff0000')
  })
})

describe('WIDTHS', () => {
  it('has 3 widths: thin, medium, thick', () => {
    expect(WIDTHS).toHaveLength(3)
    expect(WIDTHS.map(w => w.value)).toEqual([2, 4, 8])
  })
})
