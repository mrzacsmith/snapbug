export function createHistory(onChange) {
  const actions = []
  const redoStack = []

  function notify() {
    if (onChange) onChange(getActions())
  }

  function getActions() {
    return [...actions]
  }

  function push(action) {
    actions.push(action)
    redoStack.length = 0
    notify()
  }

  function undo() {
    if (actions.length === 0) return
    redoStack.push(actions.pop())
    notify()
  }

  function redo() {
    if (redoStack.length === 0) return
    actions.push(redoStack.pop())
    notify()
  }

  function clear() {
    actions.length = 0
    redoStack.length = 0
    notify()
  }

  return { getActions, push, undo, redo, clear }
}
