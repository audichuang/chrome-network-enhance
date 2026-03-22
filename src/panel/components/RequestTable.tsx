import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { NetworkRequest } from '../../types'
import { formatBytes, formatTime, getStatusColor, getMethodColor, extractName } from '../utils/formatters'
import HighlightText from './HighlightText'

interface RequestTableProps {
  requests: NetworkRequest[]
  selectedIds: Set<string>
  focusedId: string | null
  searchTerm: string
  showDetailColumns: boolean
  onSelect: (id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onSelectAll: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

const ROW_HEIGHT = 30

export default function RequestTable({
  requests,
  selectedIds,
  focusedId,
  searchTerm,
  showDetailColumns,
  onSelect,
  onSelectAll,
  onContextMenu,
}: RequestTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const allIds = requests.map((r) => r.id)
  const allSelected = requests.length > 0 && selectedIds.size === requests.length

  const virtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  })

  // 當 focusedId 變化時，滾動到焦點列
  useEffect(() => {
    if (focusedId) {
      const index = requests.findIndex((r) => r.id === focusedId)
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: 'auto' })
      }
    }
  }, [focusedId, requests, virtualizer])

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-center text-xs bg-[#252526] border-b border-gray-700 flex-shrink-0 text-gray-400 font-semibold">
        <div className="w-7 px-1.5 flex-shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="rounded"
          />
        </div>
        <div className="w-14 px-1.5 flex-shrink-0">Method</div>
        <div className="flex-1 px-1.5 min-w-0">Name</div>
        <div className="w-14 px-1.5 flex-shrink-0">Status</div>
        {showDetailColumns && (
          <>
            <div className="w-16 px-1.5 flex-shrink-0">Size</div>
            <div className="w-16 px-1.5 flex-shrink-0">Time</div>
          </>
        )}
      </div>

      {/* Virtual list */}
      <div ref={parentRef} className="flex-1 overflow-auto min-w-0">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const req = requests[virtualRow.index]
            const isSelected = selectedIds.has(req.id)
            const isFocused = focusedId === req.id

            return (
              <div
                key={req.id}
                style={{
                  position: 'absolute',
                  top: `${virtualRow.start}px`,
                  left: 0,
                  width: '100%',
                  height: `${ROW_HEIGHT}px`,
                }}
                className={[
                  'flex items-center text-xs cursor-pointer border-b border-gray-800/50 transition-colors',
                  isSelected ? 'bg-[#094771]' : 'hover:bg-[#2a2d2e]',
                  isFocused ? 'ring-1 ring-inset ring-blue-400/60' : '',
                ].join(' ')}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    onSelect(req.id, allIds, e)
                  }
                }}
                onContextMenu={onContextMenu}
              >
                <div className="w-7 px-1.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(req.id, allIds, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey })
                    }}
                    className="rounded"
                  />
                </div>
                <div className={`w-14 px-1.5 font-mono flex-shrink-0 ${getMethodColor(req.method)}`}>
                  {req.method}
                </div>
                <div className="flex-1 px-1.5 truncate overflow-hidden min-w-0">
                  <HighlightText text={extractName(req.url)} highlight={searchTerm} />
                </div>
                <div className={`w-14 px-1.5 font-mono flex-shrink-0 ${getStatusColor(req.status)}`}>
                  {req.status}
                </div>
                {showDetailColumns && (
                  <>
                    <div className="w-16 px-1.5 text-gray-400 flex-shrink-0">{formatBytes(req.size)}</div>
                    <div className="w-16 px-1.5 text-gray-400 flex-shrink-0">{formatTime(req.time)}</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        {requests.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-xs">
            No requests captured. Navigate or trigger API calls to see network activity.
          </div>
        )}
      </div>
    </div>
  )
}
