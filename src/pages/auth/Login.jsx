import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { brand } from '../../lib/brand'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Please enter username and password')
      return
    }
    setLoading(true)
    try {
      const user = await login(username, password)
      toast.success(`Welcome, ${user.name}!`)
      if (user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/issuer')
      }
    } catch (err) {
      toast.error(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#12121f] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#bd0a0a]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-2xl p-8 shadow-2xl">

          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-8">
            <img
              src={brand.logo}
              alt="Champion Square"
              className="w-16 h-16 object-contain mb-4"
            />
            <h1 className="text-white text-xl font-bold">Champion Square</h1>
            <p className="text-[#f0a500] text-sm font-medium mt-1">Material Distribution System</p>
            <p className="text-[#6b7280] text-xs mt-2 text-center">{brand.tagline}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input
  type="text"
  value={username}
  onChange={e => setUsername(e.target.value.toLowerCase())}
  placeholder="Enter your username"
  autoComplete="username"
  autoCapitalize="none"
  autoCorrect="off"
  spellCheck="false"
  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#bd0a0a] focus:ring-1 focus:ring-[#bd0a0a] transition-all"
/>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-9 pr-10 py-2.5 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#bd0a0a] focus:ring-1 focus:ring-[#bd0a0a] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all mt-2 text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-[#4b5563] text-xs mt-6">
            Contact admin to reset your password
          </p>
        </div>

        {/* Bottom tag */}
        <p className="text-center text-[#2a2a45] text-xs mt-4">
          Champion Square IAS • Indore
        </p>
      </div>
    </div>
  )
}