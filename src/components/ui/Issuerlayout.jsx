import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { brand } from '../lib/brand'
import { LayoutDashboard, Users, Send, ShoppingCart, LogOut } from 'lucide-react'

const navItems = [
  { to: '/issuer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/issuer/students', label: 'Students', icon: Users },
  { to: '/issuer/issue', label: 'Issue Material', icon: Send },
  { to: '/issuer/sales', label: 'Record Sale', icon: ShoppingCart },
]

export default function IssuerLayout() {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-[#12121f] overflow-hidden">
      <aside className="w-64 bg-[#1a1a2e] border-r border-[#2a2a45] flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-[#2a2a45]">
          <div className="flex items-center gap-3">
            <img src={brand.logo} alt="Champion Square" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Champion Square</p>
              <p className="text-[#f0a500] text-xs font-medium">Material System</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-[#2a2a45]">
          <span className="text-xs bg-[#f0a500]/20 text-[#f0a500] border border-[#f0a500]/30 px-2 py-1 rounded-full font-medium">
            Issuer
          </span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-[#bd0a0a] text-white' : 'text-[#9ca3af] hover:bg-[#2a2a45] hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-[#2a2a45]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#f0a500] flex items-center justify-center text-black text-sm font-bold">
              {profile?.name?.[0]?.toUpperCase() || 'I'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.name}</p>
              <p className="text-[#6b7280] text-xs truncate">{profile?.username}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#6b7280] hover:bg-[#2a2a45] hover:text-red-400 text-sm transition-all">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto"><Outlet /></main>
    </div>
  )
}