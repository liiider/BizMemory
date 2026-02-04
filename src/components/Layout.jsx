
import { Fragment } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, User, PlusCircle, LogOut } from 'lucide-react'
import { signOut } from '../services/auth'
import clsx from 'clsx'
import UploadModal from './UploadModal'

function Layout() {
    const navigate = useNavigate()
    const location = useLocation()

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const navItems = [
        { name: 'Contacts', href: '/', icon: Home },
        // { name: 'Analytics', href: '/analytics', icon: BarChart3 }, // Future
    ]

    return (
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
            {/* Top Navigation (Desktop) */}
            <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                        BizMemory
                    </h1>

                    {location.pathname === '/' && (
                        <button
                            onClick={handleSignOut}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                            title="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto p-4">
                <Outlet />
            </main>



            <UploadModal />
        </div>
    )
}

export default Layout
