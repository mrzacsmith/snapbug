import { describe, it, expect, vi } from 'vitest'
import { createAnnotator } from './canvas-annotator.js'

function makeMockCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
    canvas: { width: 800, height: 600 },
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineWidth: 2,
    strokeStyle: '#ff0000',
    fillStyle: '#ff0000',
    lineCap: 'round',
    lineJoin: 'round',
    font: '16px sans-serif',
    globalAlpha: 1,
  }
}

describe('createAnnotator', () => {
  it('initializes with empty actions array', () => {
    const annotator = createAnnotator()
    expect(annotator.getActions()).toEqual([])
  })

  it('adds a pen action', () => {
    const annotator = createAnnotator()
    annotator.addAction({
      type: 'pen',
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 15 }],
      color: '#ff0000',
      width: 2,
    })
    expect(annotator.getActions()).toHaveLength(1)
    expect(annotator.getActions()[0].type).toBe('pen')
  })

  it('adds an arrow action', () => {
    const annotator = createAnnotator()
    annotator.addAction({
      type: 'arrow',
      startX: 10, startY: 10,
      endX: 100, endY: 100,
      color: '#0066ff',
      width: 4,
    })
    expect(annotator.getActions()).toHaveLength(1)
    expect(annotator.getActions()[0].type).toBe('arrow')
  })

  it('adds a rectangle action', () => {
    const annotator = createAnnotator()
    annotator.addAction({
      type: 'rect',
      x: 50, y: 50,
      w: 200, h: 100,
      color: '#00cc44',
      width: 2,
    })
    expect(annotator.getActions()).toHaveLength(1)
    expect(annotator.getActions()[0].type).toBe('rect')
  })

  it('adds a text action', () => {
    const annotator = createAnnotator()
    annotator.addAction({
      type: 'text',
      x: 100, y: 200,
      text: 'Bug here!',
      color: '#ff0000',
      fontSize: 16,
    })
    expect(annotator.getActions()).toHaveLength(1)
    expect(annotator.getActions()[0].text).toBe('Bug here!')
  })

  it('renders all actions onto a context', () => {
    const annotator = createAnnotator()
    annotator.addAction({ type: 'pen', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#ff0000', width: 2 })
    annotator.addAction({ type: 'arrow', startX: 0, startY: 0, endX: 50, endY: 50, color: '#0066ff', width: 2 })
    annotator.addAction({ type: 'rect', x: 10, y: 10, w: 100, h: 50, color: '#00cc44', width: 2 })
    annotator.addAction({ type: 'text', x: 20, y: 20, text: 'Hello', color: '#ff0000', fontSize: 16 })

    const ctx = makeMockCtx()
    annotator.render(ctx)

    // Pen: beginPath + moveTo + lineTo + stroke
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    // Rect: strokeRect
    expect(ctx.strokeRect).toHaveBeenCalled()
    // Text: fillText
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('ignores arrow actions shorter than 5px', () => {
    const annotator = createAnnotator()
    annotator.addAction({ type: 'arrow', startX: 10, startY: 10, endX: 12, endY: 12, color: '#ff0000', width: 2 })
    // Should be filtered out (distance ~2.8px < 5px)
    expect(annotator.getActions()).toHaveLength(0)
  })

  it('ignores rect actions smaller than 3px', () => {
    const annotator = createAnnotator()
    annotator.addAction({ type: 'rect', x: 10, y: 10, w: 2, h: 2, color: '#ff0000', width: 2 })
    expect(annotator.getActions()).toHaveLength(0)
  })

  it('adds a number action', () => {
    const annotator = createAnnotator()
    annotator.addAction({
      type: 'number',
      x: 100, y: 200,
      num: 1,
      color: '#ff0000',
      size: 24,
    })
    expect(annotator.getActions()).toHaveLength(1)
    expect(annotator.getActions()[0].type).toBe('number')
    expect(annotator.getActions()[0].num).toBe(1)
  })

  it('renders number actions with fillText and fill (circle)', () => {
    const annotator = createAnnotator()
    annotator.addAction({ type: 'number', x: 50, y: 50, num: 3, color: '#ff0000', size: 24 })
    const ctx = makeMockCtx()
    annotator.render(ctx)
    // Should draw circle (beginPath + arc or fill) and number text (fillText)
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('renders clears the canvas before drawing', () => {
    const annotator = createAnnotator()
    const ctx = makeMockCtx()
    annotator.render(ctx)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
  })
})
