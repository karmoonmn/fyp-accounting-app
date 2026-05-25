import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
} from 'react-icons/hi'

function AccountTreeNode({ node, level, onEdit, onDelete, idToken }) {
  const [expanded, setExpanded] = useState(level < 2)

  const hasChildren = node.children && node.children.length > 0
  const isInactive = node.isActive === false

  return (
    <div className="text-sm">
      <div
        className={`flex items-center justify-between py-3 px-5 hover:bg-[#F9FAFB] border-b border-[#E5E7EB] transition-colors ${
          isInactive ? 'opacity-50 grayscale' : ''
        }`}
      >
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 24}px` }}>
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-[#E5E7EB] rounded text-[#6B7280] transition-colors"
            >
              {expanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
            </button>
          ) : (
            <div className="w-6" /> // spacer
          )}
          <span className="font-mono text-[#6B7280] w-16">{node.accountCode}</span>
          <span className={`font-semibold ${level === 0 ? 'text-[#111827]' : 'text-[#374151]'}`}>
            {node.name}
          </span>
          <span className="ml-3 px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4] text-xs font-semibold">
            {node.accountType}
          </span>
          {isInactive && (
            <span className="ml-2 text-xs text-[#EF4444] font-bold">Inactive</span>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          <span className="font-mono font-semibold text-right w-32 text-[#111827]">
            ${(node.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(node.id)}
              className="p-1.5 text-[#0F766E] hover:bg-[#CCFBF1] rounded transition-colors"
              title="Edit"
            >
              <HiOutlinePencilAlt size={16} />
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="p-1.5 text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-colors"
              title="Delete"
            >
              <HiOutlineTrash size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <AccountTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              idToken={idToken}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChartOfAccounts() {
  const { idToken, me } = useAuth()
  const [viewMode, setViewMode] = useState('tree') // 'tree' or 'list'
  
  const [treeData, setTreeData] = useState([])
  const [listData, setListData] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  
  // Pagination for list view
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = async () => {
    if (!idToken || !me) return
    setLoading(true)
    setError('')
    try {
      if (viewMode === 'tree') {
        const data = await api('/account/tree', { token: idToken })
        setTreeData(data)
      } else {
        const endpoint = search.trim() 
          ? `/account/search?q=${encodeURIComponent(search)}&page=${page}&size=20`
          : `/account?page=${page}&size=20`
        const data = await api(endpoint, { token: idToken })
        setListData(data.content || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [idToken, me, viewMode, page, search])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return
    try {
      await api(`/account/${id}`, { method: 'DELETE', token: idToken })
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete account')
    }
  }

  return (
    <DashboardLayout activeNav="accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Chart of Accounts</h2>
          <Link
            to="/accounts/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white shadow-sm hover:bg-[#0F766E]/90 transition-colors"
          >
            <HiOutlinePlus className="w-5 h-5" />
            New Account
          </Link>
        </div>

        {error && (
          <div className="bg-[#FEE2E2] text-[#B91C1C] p-4 rounded-xl border border-[#F87171]">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex p-1 bg-[#F3F4F6] rounded-xl">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  viewMode === 'tree' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
                }`}
              >
                Tree View
              </button>
              <button
                onClick={() => { setViewMode('list'); setPage(0); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  viewMode === 'list' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
                }`}
              >
                List View
              </button>
            </div>

            {viewMode === 'list' && (
              <div className="relative w-full sm:w-72">
                <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="w-full pl-11 pr-4 py-2.5 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#111827] placeholder-[#9CA3AF] text-sm"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading chart of accounts...</div>
          ) : viewMode === 'tree' ? (
            <div className="p-0">
              <div className="flex justify-between items-center px-5 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                <span>Account</span>
                <div className="flex items-center gap-6">
                  <span className="w-32 text-right">Balance</span>
                  <span className="w-16 text-center">Actions</span>
                </div>
              </div>
              {treeData.length === 0 ? (
                <div className="p-8 text-center text-[#6B7280]">No accounts found.</div>
              ) : (
                <div className="flex flex-col">
                  {treeData.map((node) => (
                    <AccountTreeNode
                      key={node.id}
                      node={node}
                      level={0}
                      onEdit={(id) => window.location.assign(`/accounts/edit/${id}`)}
                      onDelete={handleDelete}
                      idToken={idToken}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-[#111827]">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {listData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-[#6B7280]">
                        No accounts found.
                      </td>
                    </tr>
                  ) : (
                    listData.map((acc) => (
                      <tr key={acc.id} className={`hover:bg-[#F9FAFB] transition-colors ${acc.isActive === false ? 'opacity-50 grayscale' : ''}`}>
                        <td className="px-6 py-4 font-mono text-[#6B7280]">{acc.accountCode}</td>
                        <td className="px-6 py-4 font-semibold text-[#111827]">{acc.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-[#CCFBF1] text-[#0F766E] font-semibold text-xs border border-[#99F6E4]">
                            {acc.accountType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {acc.isActive === false ? (
                            <span className="text-[#EF4444] font-semibold text-xs">Inactive</span>
                          ) : (
                            <span className="text-[#0F766E] font-semibold text-xs">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          <Link
                            to={`/accounts/edit/${acc.id}`}
                            className="p-2 text-[#0F766E] hover:bg-[#CCFBF1] rounded-lg transition-colors"
                          >
                            <HiOutlinePencilAlt size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="p-2 text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                          >
                            <HiOutlineTrash size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {totalPages > 1 && (
                <div className="flex justify-between items-center p-5 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 text-sm font-semibold border border-[#E5E7EB] rounded-lg bg-white hover:bg-[#F9FAFB] disabled:opacity-50 text-[#111827]"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-[#6B7280]">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 text-sm font-semibold border border-[#E5E7EB] rounded-lg bg-white hover:bg-[#F9FAFB] disabled:opacity-50 text-[#111827]"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
