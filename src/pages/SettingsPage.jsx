import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

export default function SettingsPage() {
  const { 
    settings, setSettings, setStudents, setAttendance, setClasses, 
    addToast, currentUser, handleUpdateProfile, handleUpdateProfilePic, handlePasswordReset 
  } = useContext(AppContext);
  
  const [form, setForm] = useState(settings);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) setProfileForm({ name: currentUser.name || '', email: currentUser.email || '' });
  }, [currentUser]);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveSettings = () => { 
    setSettings(form); 
    addToast('Settings saved successfully', 'success'); 
  };

  const saveProfile = async () => {
    if (!profileForm.name) { addToast('Name cannot be empty', 'error'); return; }
    await handleUpdateProfile(profileForm.name, profileForm.email);
  };

  const compressImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150; 
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (upload) => {
      const compressed = await compressImage(upload.target.result);
      handleUpdateProfilePic(compressed);
    };
    reader.readAsDataURL(file);
  };

  // ================= DATA MANAGEMENT =================
  const clearGraphData = () => { 
    if(!confirm('Clear ALL attendance records and graph data? Students and classes will remain.')) return; 
    setAttendance([]); 
    addToast('Attendance & graph data cleared', 'info'); 
  };

  const clearStudents = () => { 
    if(!confirm('Delete ALL students and their face data?')) return; 
    setStudents([]); 
    addToast('All students deleted', 'info'); 
  };

  const clearClasses = () => { 
    if(!confirm('Delete ALL classes? Students will become unassigned.')) return; 
    setClasses([]); 
    addToast('All classes deleted', 'info'); 
  };

  const clearEverything = () => { 
    if(!confirm('Permanently delete ALL data (Students, Classes, Attendance)? This cannot be undone.')) return; 
    setStudents([]); 
    setClasses([]);
    setAttendance([]);
    addToast('All data has been wiped', 'info'); 
  };
  // ============================================================

  if (!currentUser) return null;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">System configuration and account management</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profile Settings */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4"><i className="fas fa-user-pen mr-2 text-accent"></i>Edit Profile</h3>
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-28 h-28 group cursor-pointer" onClick={() => fileInputRef.current.click()}>
              <img 
                src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'T')}&background=00d4aa&color=060a13&size=128`}
                className="w-28 h-28 rounded-full object-cover border-4 border-dark-500" 
                alt="Profile" 
              />
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-camera text-white text-xl"></i>
              </div>
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleProfilePicChange} />
            <p className="text-xs text-gray-500 mt-2">Click to change photo</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full Name</label>
              <input className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email Address</label>
              <input type="email" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
            </div>
            <button onClick={saveProfile} className="btn-primary w-full py-2.5 rounded-xl text-sm">
              <i className="fas fa-save mr-2"></i>Save Profile
            </button>
            <div className="pt-2 border-t border-dark-500/50">
              <button onClick={handlePasswordReset} className="btn-secondary w-full py-2.5 rounded-xl text-sm">
                <i className="fas fa-key mr-2"></i>Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Institution Settings */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4"><i className="fas fa-building mr-2 text-accent"></i>Institution</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Institution Name</label>
              <input className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={form?.institution || ''} onChange={e=>setForm({...form, institution: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Department</label>
              <input className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={form?.department || ''} onChange={e=>setForm({...form, department: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Attendance Rules */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4"><i className="fas fa-clock mr-2 text-warn"></i>Attendance Rules</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Late Arrival Threshold (minutes)</label>
              <input type="number" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={form?.lateThreshold || 0} onChange={e=>setForm({...form, lateThreshold: parseInt(e.target.value)||0})} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Minimum Attendance %</label>
              <input type="number" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={form?.minAttendance || 0} onChange={e=>setForm({...form, minAttendance: parseInt(e.target.value)||0})} />
            </div>
          </div>
        </div>

        {/* GRANULAR DATA MANAGEMENT */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4"><i className="fas fa-database mr-2 text-blue-400"></i>Data Management</h3>
          <p className="text-[11px] text-gray-500 mb-4">Manage your data precisely. Deleted data cannot be recovered.</p>
          
          <div className="space-y-3">
            
            {/* Graph / Attendance Data */}
            <button onClick={clearGraphData} className="bg-orange-500 hover:bg-orange-600 text-black w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              <i className="fas fa-chart-line"></i> Clear Graph & Attendance Data
            </button>
            <p className="text-[9px] text-gray-600 -mt-1 px-1">Keeps students & classes. Resets graphs and logs to zero.</p>

            <div className="border-t border-white/5 pt-3">
              {/* Student Data */}
              <button onClick={clearStudents} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-1">
                <i className="fas fa-user-graduate"></i> Clear All Students
              </button>
              <p className="text-[9px] text-gray-600 mb-2 px-1">Deletes students & face data. Attendance logs lose student names.</p>

              {/* Class Data */}
              <button onClick={clearClasses} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-1">
                <i className="fas fa-chalkboard"></i> Clear All Classes
              </button>
              <p className="text-[9px] text-gray-600 px-1">Deletes classes. Students will become unassigned.</p>
            </div>

            <div className="border-t border-white/5 pt-3">
              {/* Nuclear Option */}
              <button onClick={clearEverything} className="bg-gray-800 hover:bg-gray-700 text-red-400 border border-red-900/50 w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <i className="fas fa-radiation"></i> Wipe Everything
              </button>
            </div>

          </div>
        </div>

      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={saveSettings} className="btn-primary px-8 py-3 rounded-xl text-sm"><i className="fas fa-save mr-2"></i>Save Institution Settings</button>
      </div>
    </div>
  );
}