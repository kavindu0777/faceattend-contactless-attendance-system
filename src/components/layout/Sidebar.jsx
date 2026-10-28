import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

export default function Sidebar({ isMobile = false }) {
  const { currentView, setCurrentView, handleLogout, currentUser } = useContext(AppContext);

  const links = [
    { view: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { view: 'live', icon: 'fa-video', label: 'Live Attendance' },
    { view: 'classes', icon: 'fa-chalkboard', label: 'Classes' },
    { view: 'students', icon: 'fa-user-graduate', label: 'Students' },
    { view: 'reports', icon: 'fa-file-lines', label: 'Reports' },
    { view: 'settings', icon: 'fa-gear', label: 'Settings' },
  ];

  return (
    <aside className={`${isMobile ? 'flex' : 'hidden lg:flex'} fixed top-0 left-0 bottom-0 w-64 z-50 glass border-r border-dark-500/50 flex-col`}>
      
      {/* Brand Logo Area */}
      <div className="p-6 border-b border-dark-500/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/20">
            <i className="fas fa-fingerprint text-dark-900 text-lg"></i>
          </div>
          <div>
            <h2 className="font-display font-bold text-white text-sm tracking-wide">Smart-log</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Teacher Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {links.map(link => (
          <button
            key={link.view}
            onClick={() => setCurrentView(link.view)}
            className={`sidebar-link w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer ${
              currentView === link.view 
                ? 'active text-accent' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className={`fas ${link.icon} w-5 text-center text-base`}></i>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      {/* User Profile & Logout Area */}
      <div className="p-4 border-t border-dark-500/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-dark-500 flex items-center justify-center overflow-hidden border-2 border-dark-500 shrink-0">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <i className="fas fa-user text-accent text-sm"></i>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{currentUser?.name || 'Teacher'}</p>
            <p className="text-[10px] text-gray-500 truncate">{currentUser?.email}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-gray-500 hover:text-danger transition-colors p-1 rounded-md hover:bg-danger/10"
            title="Logout"
          >
            <i className="fas fa-right-from-bracket text-xs"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}