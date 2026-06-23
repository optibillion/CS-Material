import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { logAction } from '../../lib/audit'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function callManageUsers(payload) {
  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify(payload)
  })
  return res.json()
}
function Modal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', role: 'issuer' })
  useEffect(() => { if (open) setForm({ name: '', email: '', username: '', password: '', role: 'issuer' }) }, [open])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
  if (!form.name || !form.username || !form.password || !form.email) { 
    toast.error('Name, email, username and password required'); return 
  }
  await onSave(form); onClose()
}
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-5">Create User</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Email * (used for login)</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Username *</label>
              <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="username"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Password *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Set password"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
              <option value="issuer">Issuer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Create User</button>
        </div>
      </div>
    </div>
  )
}

function ResetModal({ open, onClose, onSave, user }) {
  const [password, setPassword] = useState('')
  useEffect(() => { if (open) setPassword('') }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-sm p-6">
        <h2 className="text-white font-semibold text-lg mb-2">Reset Password</h2>
        <p className="text-[#9ca3af] text-sm mb-4">For <span className="text-white">{user?.name}</span></p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password"
          className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={() => { if (!password) { toast.error('Enter new password'); return } onSave(password); onClose() }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Reset</button>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || []); setLoading(false)
  }

  const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

  async function callFunction(payload) {
    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(payload)
    })
    return res.json()
  }

async function handleCreate(form) {
  if (!form.name || !form.username || !form.password || !form.email) {
    toast.error('All fields required'); return
  }
  const result = await callManageUsers({
    action: 'create',
    name: form.name,
    email: form.email,
    username: form.username,
    password: form.password,
    role: form.role
  })
  if (!result.success) { toast.error(result.message || 'Failed to create user'); return }
  toast.success('User created')
  logAction('USER_CREATED', `${form.name} (@${form.username}) — role: ${form.role}`)
  fetchUsers()
}

async function handleReset(password) {
  const result = await callManageUsers({
    action: 'reset_password',
    user_id: resetTarget.id,
    auth_id: resetTarget.auth_id,
    new_password: password
  })
  if (!result.success) { toast.error(result.message || 'Failed to reset'); return }
  toast.success('Password reset successfully')
  logAction('USER_PASSWORD_RESET', `${resetTarget.name} (@${resetTarget.username})`)
  setResetTarget(null)
  fetchUsers()
}

async function toggleActive(user) {
  const result = await callManageUsers({
    action: 'deactivate',
    user_id: user.id,
    auth_id: user.auth_id,
    is_active: !user.is_active
  })
  if (!result.success) { toast.error(result.message || 'Failed'); return }
  toast.success(user.is_active ? 'User deactivated' : 'User activated')
  logAction(user.is_active ? 'USER_DEACTIVATED' : 'USER_ACTIVATED', `${user.name} (@${user.username}) — role: ${user.role}`)
  fetchUsers()
}

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Users</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{users.length} total users</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> Create User
        </button>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username or email..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['NAME', 'USERNAME', 'EMAIL', 'ROLE', 'STATUS', 'CREATED', 'ACTIONS'].map(h => (
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(3)].map((_, i) => (
              <tr key={i}>{[...Array(7)].map((_, j) => (
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse" /></td>
              ))}</tr>
            )) : filtered.map(u => (
              <tr key={u.id} className={`hover:bg-[#12121f] transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3 text-white text-sm font-medium">{u.name}</td>
                <td className="px-5 py-3 text-[#f0a500] text-sm font-mono">{u.username}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{u.email || '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${u.role === 'admin' ? 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30' : 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${u.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{format(new Date(u.created_at), 'dd MMM yy')}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setResetTarget(u)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                      Reset PW
                    </button>
                    <button onClick={() => toggleActive(u)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} />
      <ResetModal open={!!resetTarget} onClose={() => setResetTarget(null)} onSave={handleReset} user={resetTarget} />
    </div>
  )
}