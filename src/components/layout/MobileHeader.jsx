import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import Sidebar from './Sidebar';

export default function MobileHeader() {
  const { handleLogout, currentView } = useContext(AppContext);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentView]);

  return (
    <>
      <header className="mobile-header fixed top-0 left-0 right-0 z-30 glass border-b border-dark-500/50 px-4 py-3 flex items-center justify-between lg:hidden">
        <button onClick={() => setMenuOpen(true)} className="text-gray-400 hover:text-accent text-xl p-2 -ml-2">
          <i className="fas fa-bars"></i>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
            <i className="fas fa-fingerprint text-dark-900 text-xs"></i>
          </div>
          <span className="font-display font-semibold text-white">Smart-log</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-danger text-xl p-2 -mr-2">
          <i className="fas fa-right-from-bracket"></i>
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 h-full z-50 relative" onClick={() => setMenuOpen(false)}>
            <Sidebar isMobile={true} /> 
          </div>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMenuOpen(false)}></div>
        </div>
      )}
    </>
  );
}