import { useState, useCallback } from 'react'
import { NetworkRequest, FilterState } from '../types'
import { useNetworkRequests } from './hooks/useNetworkRequests'
import { useSelection } from './hooks/useSelection'
import FilterBar from './components/FilterBar'
import RequestTable from './components/RequestTable'
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

  const filteredRequests = requests.filter((req) => {
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
    // 資源類型過濾
    if (filter.resourceType !== 'all') {
      const resourceType = req.resourceType?.toLowerCase() || ''
      if (filter.resourceType === 'fetch') {
        // Fetch/XHR: 只顯示 xhr, fetch, 或 JSON 類型
        if (!['xhr', 'fetch'].includes(resourceType) && !req.mimeType.includes('json')) {
          return false
        }
      } else if (resourceType !== filter.resourceType) {
        return false
      }
    }
    return true
  })

  const selectedRequests = filteredRequests.filter((req) => selectedIds.has(req.id))

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

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]" onClick={closeContextMenu}>
      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        onClear={clearRequests}
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
        requestCount={requests.length}
        selectedCount={selectedIds.size}
      />
      <RequestTable
        requests={filteredRequests}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={() => selectAll(filteredRequests.map((r) => r.id))}
        onContextMenu={handleContextMenu}
      />
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
