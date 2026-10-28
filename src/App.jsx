import { useContext, useState, useEffect } from 'react'
import { AppContext, AppProvider } from './context/AppContext'
import MainLayout from './components/layout/MainLayout'
import DashboardPage from './pages/DashboardPage'
import LiveAttendancePage from './pages/LiveAttendancePage'
import StudentsPage from './pages/StudentsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import ClassesPage from './pages/ClassesPage'

function AppContent() {
  const { isLoggedIn, handleLogin, handleRegister, currentView, toasts, removeToast } = useContext(AppContext)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const toastColors = {
    success: 'border-accent bg-accent/10 text-accent',
    error: 'border-danger bg-danger/10 text-danger',
    warn: 'border-warn bg-warn/10 text-warn',
    info: 'border-blue-400 bg-blue-400/10 text-blue-400'
  };
  const toastIcons = { success:'fa-circle-check', error:'fa-circle-xmark', warn:'fa-triangle-exclamation', info:'fa-circle-info' };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-dark-900 flex flex-col items-center justify-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
            <i className="fas fa-fingerprint text-dark-900 text-2xl"></i>
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-accent/20 animate-ping"></div>
        </div>
        <h2 className="font-display text-xl text-white mb-2">Smart-log</h2>
        <p className="text-gray-400 text-sm mb-6">Initializing system...</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900 bg-mesh">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dark mb-4">
                <i className="fas fa-fingerprint text-dark-900 text-2xl"></i>
              </div>
              <h1 className="font-display text-3xl font-bold text-white">Smart-log</h1>
              <p className="text-gray-400 mt-2">Teacher Portal</p>
            </div>
            <div className="glass rounded-2xl p-8">
              <h3 className="font-display text-lg font-semibold text-white mb-6">{isRegistering ? 'Create Account' : 'Sign In'}</h3>
              <div className="space-y-4">
                {isRegistering && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
                    <input type="text" className="input-field w-full px-4 py-3 rounded-xl text-sm" placeholder="Mr. Smith" value={name} onChange={e => setName(e.target.value)} disabled={isSubmitting} />
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email Address</label>
                  <input type="email" className="input-field w-full px-4 py-3 rounded-xl text-sm" placeholder="teacher@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                  <input type="password" className="input-field w-full px-4 py-3 rounded-xl text-sm" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} />
                </div>
                
                {isRegistering ? (
                  <button 
                    onClick={async () => { 
                      setIsSubmitting(true);
                      const success = await handleRegister(name, email, password); 
                      if(success) setIsRegistering(false);
                      setIsSubmitting(false);
                    }} 
                    className="btn-primary w-full py-3 rounded-xl text-sm mt-2 flex justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-user-plus mr-2"></i>}
                    {isSubmitting ? 'Creating Account...' : 'Register'}
                  </button>
                ) : (
                  <button 
                    onClick={async () => { 
                      setIsSubmitting(true);
                      await handleLogin(email, password); 
                      setIsSubmitting(false);
                    }} 
                    className="btn-primary w-full py-3 rounded-xl text-sm mt-2 flex justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-right-to-bracket mr-2"></i>}
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </button>
                )}
              </div>
              
              <p className="text-sm text-gray-500 mt-6 text-center">
                {isRegistering ? (
                  <>
                    Already have an account?{' '}
                    <span className="text-accent font-semibold cursor-pointer hover:underline" onClick={() => setIsRegistering(false)}>
                      Sign In
                    </span>
                  </>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <span className="text-accent font-semibold cursor-pointer hover:underline" onClick={() => setIsRegistering(true)}>
                      Register
                    </span>
                  </>
                )}
              </p>
              
            </div>
          </div>
        </div>

        <div id="toastContainer" className="fixed top-4 right-4 z-[200] space-y-2" style={{maxWidth: '360px'}}>
          {toasts.map(t => (
            <div key={t.id} className={`toast glass rounded-xl px-4 py-3 flex items-center gap-3 border ${toastColors[t.type] || toastColors.info}`}>
              <i className={`fas ${toastIcons[t.type] || toastIcons.info}`}></i>
              <span className="text-sm flex-1">{t.message}</span>
              {/* FIX: Added close button to login toasts */}
              <button 
                onClick={() => removeToast(t.id)} 
                className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <i className="fas fa-xmark text-sm"></i>
              </button>
            </div>
          ))}
        </div>

      </div>
    )
  }

  const renderPage = () => {
    switch(currentView) {
      case 'dashboard': return <DashboardPage />;
      case 'live': return <LiveAttendancePage />;
      case 'students': return <StudentsPage />;
      case 'classes': return <ClassesPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  }
  return (
    <div className="bg-dark-900 bg-mesh min-h-screen">
      <MainLayout>
        {renderPage()}
      </MainLayout>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}