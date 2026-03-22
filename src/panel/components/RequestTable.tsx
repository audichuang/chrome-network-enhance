import { useState, useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { NetworkRequest } from '../../types'
import { formatBytes, formatTime, getStatusColor, getMethodColor, formatJson, extractPath } from '../utils/formatters'
import HighlightText from './HighlightText'

interface RequestTableProps {
  requests: NetworkRequest[]
  selectedIds: Set<string>
  focusedId: string | null
  expandedId: string | null
  searchTerm: string
  onSelect: (id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onSelectAll: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onExpandToggle: (id: string | null) => void
  onFocusChange: (id: string | null) => void
}

const ROW_HEIGHT = 32
const EXPANDED_HEIGHT = 300

export default function RequestTable({
  requests,
  selectedIds,
  focusedId,
  expandedId,
  searchTerm,
  onSelect,
  onSelectAll,
  onContextMenu,
  onExpandToggle,
  onFocusChange,
}: RequestTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const allIds = requests.map((r) => r.id)
  const allSelected = requests.length > 0 && selectedIds.size === requests.length

  const virtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const req = requests[index]
      return expandedId === req?.id ? EXPANDED_HEIGHT : ROW_HEIGHT
    },
    overscan: 10,
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

  // expandedId 變化時重新計算尺寸
  useEffect(() => {
    virtualizer.measure()
  }, [expandedId, virtualizer])

  return (
    <div ref={parentRef} className="flex-1 overflow-auto min-w-0">
      <div style={{ height: `${virtualizer.getTotalSize() + 28}px`, width: '100%', position: 'relative' }}>
        {/* Sticky header */}
        <table className="w-full text-xs table-fixed" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <thead className="bg-[#252526] border-b border-gray-700">
            <tr>
              <th className="w-8 p-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded"
                />
              </th>
              <th className="w-16 p-2 text-left">Method</th>
              <th className="p-2 text-left">URL</th>
              <th className="w-16 p-2 text-left">Status</th>
              <th className="w-20 p-2 text-left">Size</th>
              <th className="w-20 p-2 text-left">Time</th>
            </tr>
          </thead>
        </table>

        {/* Virtual rows */}
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const req = requests[virtualRow.index]
          return (
            <div
              key={req.id}
              style={{
                position: 'absolute',
                top: `${virtualRow.start + 28}px`,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
              }}
            >
              <RequestRow
                request={req}
                isSelected={selectedIds.has(req.id)}
                isFocused={focusedId === req.id}
                isExpanded={expandedId === req.id}
                searchTerm={searchTerm}
                onSelect={(e) => {
                  onSelect(req.id, allIds, e)
                  onFocusChange(req.id)
                }}
                onToggleExpand={() => onExpandToggle(expandedId === req.id ? null : req.id)}
                onContextMenu={onContextMenu}
              />
            </div>
          )
        })}
      </div>
      {requests.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-500">
          No requests captured. Navigate or trigger API calls to see network activity.
        </div>
      )}
    </div>
  )
}

interface RequestRowProps {
  request: NetworkRequest
  isSelected: boolean
  isFocused: boolean
  isExpanded: boolean
  searchTerm: string
  onSelect: (e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onToggleExpand: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function RequestRow({ request, isSelected, isFocused, isExpanded, searchTerm, onSelect, onToggleExpand, onContextMenu }: RequestRowProps) {
  const [activeTab, setActiveTab] = useState<'response' | 'request' | 'headers'>('response')
  const rowRef = useRef<HTMLDivElement>(null)

  const rowClass = [
    'flex items-center border-b border-gray-800 cursor-pointer text-xs',
    isSelected ? 'bg-[#094771]' : 'hover:bg-[#2a2d2e]',
    isFocused ? 'ring-1 ring-inset ring-blue-400' : '',
  ].join(' ')

  return (
    <div>
      <div
        ref={rowRef}
        className={rowClass}
        style={{ height: `${ROW_HEIGHT}px` }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'INPUT') {
            onSelect(e)
          }
        }}
        onDoubleClick={onToggleExpand}
        onContextMenu={onContextMenu}
      >
        <div className="w-8 px-2 flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation()
              onSelect({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey })
            }}
            className="rounded"
          />
        </div>
        <div className={`w-16 px-2 font-mono flex-shrink-0 ${getMethodColor(request.method)}`}>
          {request.method}
        </div>
        <div className="flex-1 px-2 truncate overflow-hidden min-w-0">
          <HighlightText text={extractPath(request.url)} highlight={searchTerm} />
        </div>
        <div className={`w-16 px-2 font-mono flex-shrink-0 ${getStatusColor(request.status)}`}>
          {request.status}
        </div>
        <div className="w-20 px-2 text-gray-400 flex-shrink-0">{formatBytes(request.size)}</div>
        <div className="w-20 px-2 text-gray-400 flex-shrink-0">{formatTime(request.time)}</div>
      </div>
      {isExpanded && (
        <div className="bg-[#1e1e1e] border-l-2 border-blue-500 ml-4" style={{ height: `${EXPANDED_HEIGHT - ROW_HEIGHT}px`, overflow: 'auto' }}>
          <div className="flex border-b border-gray-700">
            <button
              className={`px-4 py-2 text-xs ${activeTab === 'response' ? 'bg-[#2a2d2e] text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('response')}
            >
              Response
            </button>
            <button
              className={`px-4 py-2 text-xs ${activeTab === 'request' ? 'bg-[#2a2d2e] text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('request')}
            >
              Request Body
            </button>
            <button
              className={`px-4 py-2 text-xs ${activeTab === 'headers' ? 'bg-[#2a2d2e] text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('headers')}
            >
              Headers
            </button>
          </div>
          <div className="p-4 overflow-auto" style={{ maxHeight: `${EXPANDED_HEIGHT - ROW_HEIGHT - 32}px` }}>
            {activeTab === 'response' && (
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {formatJson(request.responseBody) || 'No response body'}
              </pre>
            )}
            {activeTab === 'request' && (
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {formatJson(request.requestBody) || 'No request body'}
              </pre>
            )}
            {activeTab === 'headers' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold mb-2 text-gray-400">Request Headers</h4>
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {request.requestHeaders.map((h) => `${h.name}: ${h.value}`).join('\n')}
                  </pre>
                </div>
                <div>
                  <h4 className="text-xs font-bold mb-2 text-gray-400">Response Headers</h4>
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {request.responseHeaders.map((h) => `${h.name}: ${h.value}`).join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
