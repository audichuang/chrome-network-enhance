import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { NetworkRequest } from '../../types'
import { formatBytes, formatTime, getStatusColor, getMethodColor, extractName } from '../utils/formatters'
import HighlightText from './HighlightText'

interface RequestTableProps {
  requests: NetworkRequest[]
  allIds: string[]
  selectedIds: Set<string>
  focusedId: string | null
  searchTerm: string
  showDetailColumns: boolean
  onSelect: (id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onContextSelect: (id: string, allIds: string[]) => void
  onSelectAll: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

const ROW_HEIGHT = 30

export default function RequestTable({
  requests,
  allIds,
  selectedIds,
  focusedId,
  searchTerm,
  showDetailColumns,
  onSelect,
  onContextSelect,
  onSelectAll,
  onContextMenu,
}: RequestTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const allSelected = requests.length > 0 && selectedIds.size === requests.length

  const virtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  })

  // 用於在滾動效果中獲取最新的 requests 而不觸發 scroll effect
  const requestsRef = useRef(requests)
  useEffect(() => {
    requestsRef.current = requests
  }, [requests])

  // 當 focusedId 變化時，滾動到焦點列
  useEffect(() => {
    if (focusedId) {
      const index = requestsRef.current.findIndex((r) => r.id === focusedId)
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: 'auto' })
      }
    }
  }, [focusedId, virtualizer])

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
        <div className="flex-1 px-1.5 min-w-0">Name</div>
        {showDetailColumns && (
          <>
            <div className="w-14 px-1.5 flex-shrink-0">Method</div>
            <div className="w-14 px-1.5 flex-shrink-0">Status</div>
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
                  isFocused ? 'outline outline-1 outline-offset-[-1px] outline-sky-300' : '',
                ].join(' ')}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    onSelect(req.id, allIds, e)
                  }
                }}
                onContextMenu={(e) => {
                  // 右擊未選取的列時先單選它，避免對「別的請求」執行批次操作；
                  // 若該列已在選取集合中則保持多選不變。
                  if (!selectedIds.has(req.id)) {
                    onContextSelect(req.id, allIds)
                  }
                  onContextMenu(e)
                }}
              >
                <div className="w-7 px-1.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(req.id, allIds, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey })
                    }}
                    className="rounded"
                  />
                </div>
                <div className="flex-1 px-1.5 truncate overflow-hidden min-w-0" title={req.url}>
                  <HighlightText text={extractName(req.url)} highlight={searchTerm} />
                </div>
                {showDetailColumns && (
                  <>
                    <div className={`w-14 px-1.5 font-mono flex-shrink-0 ${getMethodColor(req.method)}`}>
                      {req.method}
                    </div>
                    <div className={`w-14 px-1.5 font-mono flex-shrink-0 ${getStatusColor(req.status)}`}>
                      {req.status}
                    </div>
                    <div className="w-16 px-1.5 text-gray-400 flex-shrink-0">{formatBytes(req.size)}</div>
                    <div className="w-16 px-1.5 text-gray-400 flex-shrink-0">{formatTime(req.time)}</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        {requests.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-xs">
            No requests captured. Navigate or trigger API calls to see network activity.
          </div>
        )}
      </div>
    </div>
  )
}
