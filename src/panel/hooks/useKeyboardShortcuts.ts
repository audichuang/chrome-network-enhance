import { useEffect, useCallback, useRef } from 'react'

interface KeyboardShortcutsOptions {
  filteredIds: string[]
  focusedId: string | null
  expandedId: string | null
  selectedIds: Set<string>
  onFocusChange: (id: string | null) => void
  onExpandToggle: (id: string | null) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onSelect: (id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  // 使用 useRef 避免當選項或回呼更新時頻繁重新註冊全域事件監聽器
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 忽略在 input/select 元素中的事件
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      // 但 Escape 仍然生效
      if (e.key !== 'Escape') return
    }

    const {
      filteredIds,
      focusedId,
      expandedId,
      selectedIds,
      onFocusChange,
      onExpandToggle,
      onSelectAll,
      onClearSelection,
      onSelect,
    } = optionsRef.current

    switch (e.key) {
      case 'a':
      case 'A':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onSelectAll()
        }
        break

      case 'Escape':
        e.preventDefault()
        if (expandedId) {
          onExpandToggle(null)
        } else if (selectedIds.size > 0) {
          onClearSelection()
        }
        break

      case 'ArrowDown': {
        e.preventDefault()
        if (filteredIds.length === 0) break
        const currentIndex = focusedId ? filteredIds.indexOf(focusedId) : -1
        const nextIndex = Math.min(currentIndex + 1, filteredIds.length - 1)
        const nextId = filteredIds[nextIndex]
        onFocusChange(nextId)
        onSelect(nextId, filteredIds, { shiftKey: e.shiftKey, ctrlKey: false, metaKey: false })
        break
      }

      case 'ArrowUp': {
        e.preventDefault()
        if (filteredIds.length === 0) break
        const currentIndex = focusedId ? filteredIds.indexOf(focusedId) : filteredIds.length
        const prevIndex = Math.max(currentIndex - 1, 0)
        const prevId = filteredIds[prevIndex]
        onFocusChange(prevId)
        onSelect(prevId, filteredIds, { shiftKey: e.shiftKey, ctrlKey: false, metaKey: false })
        break
      }

      case 'Enter':
        if (focusedId) {
          e.preventDefault()
          onExpandToggle(expandedId === focusedId ? null : focusedId)
        }
        break
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
