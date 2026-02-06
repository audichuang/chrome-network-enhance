import { useState, useCallback } from 'react'

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const handleSelect = useCallback(
    (id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)

        if (event.shiftKey && lastSelectedId) {
          const startIndex = allIds.indexOf(lastSelectedId)
          const endIndex = allIds.indexOf(id)
          if (startIndex !== -1 && endIndex !== -1) {
            const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
            for (let i = from; i <= to; i++) {
              next.add(allIds[i])
            }
          }
        } else if (event.ctrlKey || event.metaKey) {
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
        } else {
          next.clear()
          next.add(id)
        }

        return next
      })
      setLastSelectedId(id)
    },
    [lastSelectedId]
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (prev.size === ids.length) {
        return new Set()
      }
      return new Set(ids)
    })
  }, [])

  return { selectedIds, lastSelectedId, handleSelect, clearSelection, selectAll }
}
