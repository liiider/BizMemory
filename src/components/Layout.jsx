
import { Fragment, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, User, PlusCircle, LogOut, Menu, X, Lock } from 'lucide-react'
import { signOut, updatePassword } from '../services/auth'
import clsx from 'clsx'
import UploadModal from './UploadModal'

function Layout() {
    const navigate = useNavigate()
    const location = useLocation()

    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
    const [newPassword, setNewPassword] = useState('')

    const handleSignOut = async () => {
        setIsMenuOpen(false)
        await signOut()
        navigate('/login')
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        try {
            const { error } = await updatePassword(newPassword)
            if (error) throw error
            alert('Password updated successfully')
            setIsPasswordModalOpen(false)
            setNewPassword('')
        } catch (err) {
            alert('Error updating password: ' + err.message)
        }
    }

    const navItems = [
        { name: 'Contacts', href: '/', icon: Home },
        // { name: 'Analytics', href: '/analytics', icon: BarChart3 }, // Future
    ]

    return (
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
            {/* Top Navigation (Desktop) */}
            <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    {location.pathname === '/' && (
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                                <div className="absolute left-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 transform origin-top-left transition-all">
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false)
                                            setIsPasswordModalOpen(true)
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <Lock size={16} className="text-slate-400" />
                                        Change Password
                                    </button>
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                                    >
                                        <LogOut size={16} className="text-red-400" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                        BizMemory
                    </h1>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto p-4">
                <Outlet />
            </main>



            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-lg border-slate-200 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Enter new password"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 active:scale-[0.98] transition-all"
                            >
                                Update Password
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <UploadModal />
        </div>
    )
}

export default Layout
