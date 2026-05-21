import { useState, useCallback, useRef } from 'react'

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastSelectedIdRef = useRef<string | null>(null)

  const handleSelect = useCallback(
    (id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
      const anchor = lastSelectedIdRef.current
      setSelectedIds((prev) => {
        const next = new Set(prev)

        if (event.shiftKey && anchor) {
          const startIndex = allIds.indexOf(anchor)
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
      lastSelectedIdRef.current = id
    },
    []
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    lastSelectedIdRef.current = null
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (prev.size === ids.length) {
        return new Set()
      }
      return new Set(ids)
    })
  }, [])

  return { selectedIds, handleSelect, clearSelection, selectAll }
}
