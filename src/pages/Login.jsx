import { useState } from 'react'
import { signIn, signUp } from '../services/auth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Auto-append domain if user enters a simple username
            const emailToUse = email.includes('@') ? email : `${email}@bizmemory.com`

            const { data, error } = isSignUp
                ? await signUp(emailToUse, password)
                : await signIn(emailToUse, password)

            if (error) throw error

            if (error) throw error
            navigate('/')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        BizMemory
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        {isSignUp ? 'Create an account to start' : 'Sign in to continue'}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="sr-only">Account</label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                required
                                className="relative block w-full rounded-lg border-0 py-3 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-slate-50/50"
                                placeholder="Account (Username)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="relative block w-full rounded-lg border-0 py-3 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-slate-50/50"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center bg-red-50 py-2 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-lg bg-primary-600 py-3 px-4 text-sm font-semibold text-white hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 transition-all active:scale-[0.98]"
                        >
                            {loading ? 'Processing...' : (isSignUp ? 'Sign up' : 'Sign in')}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                    >
                        {isSignUp ? 'Already have an account? Sign in' : 'No account? Sign up'}
                    </button>
                </div>
            </div>
        </div>
    )
}
