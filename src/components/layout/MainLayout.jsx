import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

export default function MainLayout({ children }) {
  const { toasts, removeToast } = useContext(AppContext);

  const toastColors = {
    success: 'border-accent bg-accent/10 text-accent',
    error: 'border-danger bg-danger/10 text-danger',
    warn: 'border-warn bg-warn/10 text-warn',
    info: 'border-blue-400 bg-blue-400/10 text-blue-400'
  };
  const toastIcons = { success:'fa-circle-check', error:'fa-circle-xmark', warn:'fa-triangle-exclamation', info:'fa-circle-info' };

  return (
    <>
      <MobileHeader />
      <Sidebar />
      
      <main className="main-content lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>

      {/* Toast Container with IMPROVED X button */}
      <div id="toastContainer" className="fixed top-4 right-4 z-[200] space-y-2" style={{maxWidth: '360px'}}>
        {toasts.map(t => (
          <div key={t.id} className={`toast glass rounded-xl px-4 py-3 flex items-center gap-3 border ${toastColors[t.type] || toastColors.info}`}>
            <i className={`fas ${toastIcons[t.type] || toastIcons.info}`}></i>
            <span className="text-sm flex-1">{t.message}</span>
            
            {/* FIX: Larger, clickable close button with hover background */}
            <button 
              onClick={() => removeToast(t.id)} 
              className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <i className="fas fa-xmark text-sm"></i>
            </button>

          </div>
        ))}
      </div>
    </>
  );
}