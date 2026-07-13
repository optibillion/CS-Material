import { LayoutDashboard, Users, BookOpen, Package, Send, ShoppingCart, Building2, Archive, UserCog, FileText, ClipboardList, LogOut, Menu, X, GraduationCap, Tag } from 'lucide-react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { brand } from '../lib/brand'
import { useState } from 'react'
import UniversalSearch from './UniversalSearch'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/issuances', label: 'Issuances', icon: Send },
  { to: '/admin/books', label: 'Books', icon: BookOpen },
  { to: '/admin/book-prices', label: 'Book Prices', icon: Tag },
  { to: '/admin/bundles', label: 'Bundles', icon: Package },
  { to: '/admin/batches', label: 'Batches', icon: GraduationCap },
  { to: '/admin/inventory', label: 'Inventory', icon: Archive },
  { to: '/admin/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/admin/allotments', label: 'Distributors', icon: Building2 },
  { to: '/admin/users', label: 'Users', icon: UserCog },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
]

const bottomNav = [
  { to: '/admin', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/issuances', label: 'Issuances', icon: Send },
  { to: '/admin/books', label: 'Books', icon: BookOpen },
  { to: '/admin/inventory', label: 'Inventory', icon: Archive },
]

export default function AdminLayout() {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-[#12121f] overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#1a1a2e] border-r border-[#2a2a45] flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 border-b border-[#2a2a45] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={brand.logo} alt="Champion Square" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Champion Square</p>
              <p className="text-[#f0a500] text-xs font-medium">Material System</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#6b7280] hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#2a2a45]">
          <span className="text-xs bg-[#bd0a0a]/20 text-[#bd0a0a] border border-[#bd0a0a]/30 px-2 py-1 rounded-full font-medium">
            Admin
          </span>
        </div>

        {/* Universal Search in sidebar */}
        <div className="px-3 py-3 border-b border-[#2a2a45]">
          <UniversalSearch />
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-[#bd0a0a] text-white' : 'text-[#9ca3af] hover:bg-[#2a2a45] hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2a2a45]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#bd0a0a] flex items-center justify-center text-white text-sm font-bold">
              {profile?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.name}</p>
              <p className="text-[#6b7280] text-xs truncate">{profile?.username}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#6b7280] hover:bg-[#2a2a45] hover:text-red-400 text-sm transition-all">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar with search */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#1a1a2e] border-b border-[#2a2a45]">
          <button onClick={() => setSidebarOpen(true)} className="text-[#9ca3af] hover:text-white flex-shrink-0">
            <Menu size={22} />
          </button>
          <div className="flex-1">
            <UniversalSearch />
          </div>
          <div className="w-8 h-8 rounded-full bg-[#bd0a0a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {profile?.name?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-[#2a2a45] z-30">
          <div className="flex items-center justify-around px-2 py-2">
            {bottomNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                    isActive ? 'text-[#bd0a0a]' : 'text-[#6b7280]'
                  }`
                }
              >
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </NavLink>
            ))}
            <button onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[#6b7280]">
              <Menu size={20} />
              <span className="text-xs">More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}