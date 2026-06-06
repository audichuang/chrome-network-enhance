import { useState, useCallback, useMemo, useEffect } from 'react'
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
  const { requests, clearRequests, isRecording, toggleRecording, fetchResponseBody } = useNetworkRequests()
  const { selectedIds, handleSelect, clearSelection, selectAll } = useSelection()
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    statusFilter: 'all',
    methodFilter: 'all',
    resourceType: 'fetch',
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
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

  const selectedRequests = useMemo(() =>
    filteredRequests.filter((req) => selectedIds.has(req.id)),
    [filteredRequests, selectedIds]
  )

  const detailRequest = useMemo(() =>
    detailRequestId ? requests.find((r) => r.id === detailRequestId) || null : null,
    [requests, detailRequestId]
  )

  // 懶載入副作用：當選中的 detailRequestId 變更且該請求尚未載入 responseBody 時，發送 getContent 請求
  useEffect(() => {
    if (detailRequestId) {
      const req = requests.find((r) => r.id === detailRequestId)
      if (req && req.responseBody === null) {
        fetchResponseBody(detailRequestId)
      }
    }
  }, [detailRequestId, requests, fetchResponseBody])

  const handleSelectAll = useCallback(() => {
    selectAll(filteredIds)
  }, [selectAll, filteredIds])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // 選單一律彈出；RequestTable 會在右擊未選列時先 onContextSelect 補上選取，
    // 因此到此處時必有至少一個選取項可供操作。
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
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

  const handleContextSelect = useCallback((id: string, allIds: string[]) => {
    // 右鍵選取：單選該列並聚焦，但不開啟詳情面板
    handleSelect(id, allIds, { shiftKey: false, ctrlKey: false, metaKey: false })
    setFocusedId(id)
  }, [handleSelect])

  // 鍵盤快捷鍵所用 callback 進行穩定化
  const handleFocusChange = useCallback((id: string | null) => {
    setFocusedId(id)
    if (id) setDetailRequestId(id)
  }, [])

  const handleExpandToggle = useCallback((id: string | null) => {
    setDetailRequestId(id)
  }, [])

  const handleClearSelection = useCallback(() => {
    clearSelection()
    setDetailRequestId(null)
  }, [clearSelection])

  // 鍵盤快捷鍵
  useKeyboardShortcuts({
    filteredIds,
    focusedId,
    expandedId: detailRequestId,
    selectedIds,
    onFocusChange: handleFocusChange,
    onExpandToggle: handleExpandToggle,
    onSelectAll: handleSelectAll,
    onClearSelection: handleClearSelection,
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
          clearSelection()
          setFocusedId(null)
        }}
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
        requestCount={requests.length}
        selectedCount={selectedRequests.length}
      />
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* 左側請求列表 */}
        <div className={`flex-shrink-0 overflow-hidden transition-all duration-200 ${
          detailRequest ? 'w-[40%] min-w-[280px]' : 'w-full'
        }`}>
          <RequestTable
            requests={filteredRequests}
            allIds={filteredIds}
            selectedIds={selectedIds}
            focusedId={focusedId}
            searchTerm={filter.search}
            showDetailColumns={!detailRequest}
            onSelect={handleRowClick}
            onContextSelect={handleContextSelect}
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
              onToast={showToast}
            />
          </div>
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedRequests={selectedRequests}
          fetchResponseBody={fetchResponseBody}
          onClose={closeContextMenu}
          onToast={showToast}
          onClearSelection={clearSelection}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default App
