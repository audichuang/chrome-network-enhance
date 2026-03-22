import { useState, useCallback, useMemo } from 'react'
import { NetworkRequest, FilterState } from '../types'
import { useNetworkRequests } from './hooks/useNetworkRequests'
import { useSelection } from './hooks/useSelection'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import FilterBar from './components/FilterBar'
import RequestTable from './components/RequestTable'
import DetailPanel from './components/DetailPanel'
import ContextMenu from './components/ContextMenu'
import Toast from './components/Toast'

function App() {
  const { requests, clearRequests, isRecording, toggleRecording } = useNetworkRequests()
  const { selectedIds, handleSelect, clearSelection, selectAll } = useSelection()
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    statusFilter: 'all',
    methodFilter: 'all',
    resourceType: 'fetch',
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null)

  const filteredRequests = useMemo(() => requests.filter((req) => {
    if (filter.search && !req.url.toLowerCase().includes(filter.search.toLowerCase())) {
      return false
    }
    if (filter.statusFilter !== 'all') {
      const statusRange = parseInt(filter.statusFilter[0])
      if (Math.floor(req.status / 100) !== statusRange) {
        return false
      }
    }
    if (filter.methodFilter !== 'all' && req.method !== filter.methodFilter) {
      return false
    }
    if (filter.resourceType !== 'all') {
      const resourceType = req.resourceType?.toLowerCase() || ''
      if (filter.resourceType === 'fetch') {
        if (!['xhr', 'fetch'].includes(resourceType) && !req.mimeType.includes('json')) {
          return false
        }
      } else if (resourceType !== filter.resourceType) {
        return false
      }
    }
    return true
  }), [requests, filter])

  const filteredIds = useMemo(() => filteredRequests.map((r) => r.id), [filteredRequests])
  const selectedRequests = filteredRequests.filter((req) => selectedIds.has(req.id))
  const detailRequest = detailRequestId
    ? requests.find((r) => r.id === detailRequestId) || null
    : null

  const handleSelectAll = useCallback(() => {
    selectAll(filteredIds)
  }, [selectAll, filteredIds])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (selectedIds.size > 0) {
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
  }, [selectedIds.size])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailRequestId(null)
  }, [])

  const handleRowClick = useCallback((id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
    handleSelect(id, allIds, event)
    setFocusedId(id)
    // 單擊時只有非多選才開啟詳情面板
    if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
      setDetailRequestId(id)
    }
  }, [handleSelect])

  // 鍵盤快捷鍵
  useKeyboardShortcuts({
    filteredIds,
    focusedId,
    expandedId: detailRequestId,
    selectedIds,
    onFocusChange: (id) => {
      setFocusedId(id)
      if (id) setDetailRequestId(id)
    },
    onExpandToggle: (id) => setDetailRequestId(id),
    onSelectAll: handleSelectAll,
    onClearSelection: () => {
      clearSelection()
      setDetailRequestId(null)
    },
    onSelect: handleSelect,
  })

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]" onClick={closeContextMenu}>
      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        onClear={() => {
          clearRequests()
          setDetailRequestId(null)
        }}
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
        requestCount={requests.length}
        selectedCount={selectedIds.size}
      />
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* 左側請求列表 */}
        <div className={`flex-shrink-0 overflow-hidden transition-all duration-200 ${
          detailRequest ? 'w-[40%] min-w-[280px]' : 'w-full'
        }`}>
          <RequestTable
            requests={filteredRequests}
            selectedIds={selectedIds}
            focusedId={focusedId}
            searchTerm={filter.search}
            showDetailColumns={!detailRequest}
            onSelect={handleRowClick}
            onSelectAll={handleSelectAll}
            onContextMenu={handleContextMenu}
          />
        </div>
        {/* 右側詳情面板 */}
        {detailRequest && (
          <div className="flex-1 min-w-0 min-h-0">
            <DetailPanel
              request={detailRequest}
              onClose={handleCloseDetail}
              onCopySuccess={showToast}
            />
          </div>
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedRequests={selectedRequests}
          onClose={closeContextMenu}
          onCopySuccess={showToast}
          onClearSelection={clearSelection}
        />
      )}
      {toast && <Toast message={toast} />}
    </div>
  )
}

export default App
