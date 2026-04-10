export const COLORS = [
  { value: '#ff0000', label: 'Red' },
  { value: '#0066ff', label: 'Blue' },
  { value: '#00cc44', label: 'Green' },
  { value: '#ffcc00', label: 'Yellow' },
  { value: '#000000', label: 'Black' },
  { value: '#ffffff', label: 'White' },
]

export const WIDTHS = [
  { value: 2, label: 'Thin' },
  { value: 4, label: 'Medium' },
  { value: 8, label: 'Thick' },
]

export function createToolbarState() {
  let tool = 'pen'
  let color = '#ff0000'
  let width = 2
  let listener = null

  function notify(prop, val) {
    if (listener) listener(prop, val)
  }

  return {
    getTool() { return tool },
    getColor() { return color },
    getWidth() { return width },
    setTool(v) { tool = v; notify('tool', v) },
    setColor(v) { color = v; notify('color', v) },
    setWidth(v) { width = v; notify('width', v) },
    onChange(fn) { listener = fn },
  }
}
