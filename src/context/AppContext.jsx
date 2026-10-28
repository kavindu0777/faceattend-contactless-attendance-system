import { createContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as faceapi from '@vladmandic/face-api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('fa_currentView') || 'dashboard');
  const [authLoading, setAuthLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [settings, setSettings] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const isDataLoaded = useRef(false);

  const defaultSettings = { 
    institution: 'My Academy', department: 'Default',
    lateThreshold: 15, minAttendance: 80, matchThreshold: 0.55 
  };

  useEffect(() => { localStorage.setItem('fa_currentView', currentView); }, [currentView]);

  useEffect(() => {
    if (!modelsLoaded) {
      const loadModels = async () => {
        try {
          const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          setModelsLoaded(true);
        } catch (err) { console.error(err); }
      };
      loadModels();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let appUser = { uid: user.uid, name: user.displayName || 'Teacher', email: user.email, role: 'teacher', photoURL: null };
        
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          setIsCloudConnected(true);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setClasses(data.classes || []);
            setAttendance(data.attendance || []);
            setSettings(data.settings || defaultSettings);
            setStudents(data.students || []);
            if (data.teacherProfile) {
              appUser = { ...appUser, ...data.teacherProfile };
            }
          } else {
            setClasses([]); 
            setStudents([]); 
            setAttendance([]); 
            setSettings(defaultSettings);
          }
        } catch (error) {
          setIsCloudConnected(false);
          addToast('Cloud Sync Offline.', 'warn');
        }
        
        const latestUser = auth.currentUser;
        if (latestUser && latestUser.displayName) {
          appUser.name = latestUser.displayName;
        }

        setCurrentUser(appUser);
        setIsLoggedIn(true);
        isDataLoaded.current = true;
      } else {
        setCurrentUser(null); setIsLoggedIn(false); setClasses([]); setStudents([]); setAttendance([]); setSettings(null);
        isDataLoaded.current = false;
      }
      setAuthLoading(false);
    }, (error) => { setAuthLoading(false); });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser?.uid || !isDataLoaded.current) return;

    const saveData = async () => {
      const dataToSave = { 
        classes, students, attendance, settings,
        teacherProfile: { name: currentUser.name, email: currentUser.email, photoURL: currentUser.photoURL }
      };

      if (isCloudConnected) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, dataToSave, { merge: true });
        } catch (error) {
          setIsCloudConnected(false);
          addToast('Cloud save failed.', 'warn');
        }
      }
    };
    saveData();
  }, [students, attendance, settings, classes, isLoggedIn, currentUser, isCloudConnected]);

  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      addToast('Welcome back!', 'success');
      return true;
    } catch (error) {
      if (error.code === 'auth/invalid-credential') addToast('Invalid email or password', 'error');
      else addToast(error.message, 'error');
      return false;
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      addToast('Account created!', 'success');
      return true;
    } catch (error) {
      addToast(error.message, 'error');
      return false;
    }
  };

  const handleLogout = async () => {
    try { 
      await signOut(auth); 
      localStorage.removeItem('fa_currentView');
      setCurrentView('dashboard');
      addToast('Logged out', 'info'); 
    } catch (error) { addToast('Error logging out', 'error'); }
  };

  const handleUpdateProfile = async (newName, newEmail) => {
    if (!newName) { addToast('Name cannot be empty', 'error'); return; }
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      setCurrentUser(prev => ({ ...prev, name: newName, email: newEmail }));
      addToast('Profile updated successfully!', 'success');
      return true;
    } catch (error) {
      addToast(error.message, 'error');
      return false;
    }
  };

  const handleUpdateProfilePic = (base64String) => {
    setCurrentUser(prev => ({ ...prev, photoURL: base64String }));
    addToast('Profile picture updated!', 'success');
  };

  const handlePasswordReset = async () => {
    try {
      await auth.sendPasswordResetEmail(currentUser.email);
      addToast('Password reset link sent to your email!', 'success');
    } catch (error) { addToast('Failed to send reset email.', 'error'); }
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    // FIX: Increased timeout from 2500 to 4500 (4.5 seconds) so it's easier to read and click
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060a13] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center animate-pulse mb-4">
          <i className="fas fa-fingerprint text-dark-900 text-xl"></i>
        </div>
        <p className="text-gray-400 text-sm">Connecting...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      isLoggedIn, currentUser, handleLogin, handleRegister, handleLogout,
      handleUpdateProfile, handleUpdateProfilePic, handlePasswordReset,
      currentView, setCurrentView,
      classes, setClasses, students, setStudents,
      attendance, setAttendance, settings, setSettings,
      modelsLoaded, toasts, addToast, removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
};