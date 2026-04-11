import { describe, it, expect, vi } from 'vitest'
import { createToast } from './toast.js'

function makeMockContainer() {
  const children = []
  const container = {
    children,
    appendChild(el) {
      children.push(el)
      el.parentNode = container
    },
    removeChild(el) {
      const idx = children.indexOf(el)
      if (idx >= 0) children.splice(idx, 1)
      el.parentNode = null
    },
  }
  return container
}

function makeMockDocument() {
  return {
    createElement(tag) {
      const classSet = new Set()
      const el = {
        tag,
        className: '',
        textContent: '',
        classList: {
          has(c) { return classSet.has(c) },
          contains(c) { return classSet.has(c) },
          add(c) { classSet.add(c) },
        },
        parentNode: null,
        children: [],
        appendChild(child) {
          child.parentNode = el
          el.children.push(child)
        },
        removeChild(child) {
          const idx = el.children.indexOf(child)
          if (idx >= 0) el.children.splice(idx, 1)
          child.parentNode = null
        },
        addEventListener() {},
      }
      // Sync className to classList
      Object.defineProperty(el, 'className', {
        get() { return [...classSet].join(' ') },
        set(val) {
          classSet.clear()
          val.split(' ').filter(Boolean).forEach(c => classSet.add(c))
        },
      })
      return el
    },
  }
}

describe('createToast', () => {
  it('returns an object with a show method', () => {
    const container = makeMockContainer()
    const toast = createToast(container, { doc: makeMockDocument() })
    expect(typeof toast.show).toBe('function')
  })

  it('appends a toast element to the container', () => {
    const container = makeMockContainer()
    const toast = createToast(container, { doc: makeMockDocument() })
    toast.show('Test message')
    expect(container.children.length).toBe(1)
    expect(container.children[0].classList.has('toast')).toBe(true)
  })

  it('displays the given message', () => {
    const container = makeMockContainer()
    const toast = createToast(container, { doc: makeMockDocument() })
    toast.show('API key expired')
    expect(container.children[0].textContent).toBe('API key expired')
  })

  it('adds error class for error type', () => {
    const container = makeMockContainer()
    const toast = createToast(container, { doc: makeMockDocument() })
    toast.show('Something failed', { type: 'error' })
    expect(container.children[0].classList.contains('toast-error')).toBe(true)
  })

  it('adds success class for success type', () => {
    const container = makeMockContainer()
    const toast = createToast(container, { doc: makeMockDocument() })
    toast.show('Upload complete', { type: 'success' })
    expect(container.children[0].classList.contains('toast-success')).toBe(true)
  })

  it('auto-dismisses after the specified duration', () => {
    vi.useFakeTimers()
    const container = makeMockContainer()
    const toast = createToast(container, { doc: makeMockDocument() })
    toast.show('Temporary', { duration: 3000 })
    expect(container.children.length).toBe(1)
    vi.advanceTimersByTime(3000)
    expect(container.children.length).toBe(0)
    vi.useRealTimers()
  })

  it('replaces previous toast when showing a new one', () => {
    const container = makeMockContainer()
    const toast = createToast(container, { doc: makeMockDocument() })
    toast.show('First')
    toast.show('Second')
    expect(container.children.length).toBe(1)
    expect(container.children[0].textContent).toBe('Second')
  })
})
