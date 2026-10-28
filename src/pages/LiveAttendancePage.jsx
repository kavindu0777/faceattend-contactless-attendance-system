import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import * as faceapi from '@vladmandic/face-api';
import { drawFaceBox } from '../utils/constants';

export default function LiveAttendancePage() {
  const { students, attendance, setAttendance, classes, addToast, modelsLoaded, settings } = useContext(AppContext);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timeoutId = useRef(null); 
  const recentlyLoggedRef = useRef(new Set()); 
  const markedTodayMap = useRef(new Map()); 
  const isClassActiveRef = useRef(false); 
  const sessionStartRef = useRef(null);
  
  // FIX: Use useRef for stream so the cleanup function can access it reliably
  const streamRef = useRef(null); 

  const [isCamOn, setIsCamOn] = useState(false);
  const [isClassActive, setIsClassActive] = useState(false);
  const [activeClass, setActiveClass] = useState('');
  const [sessionInfo, setSessionInfo] = useState({ start: '-', recognized: 0, unknown: 0, late: 0 });
  const [feed, setFeed] = useState([]);
  const [viewStudent, setViewStudent] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isDetecting = useRef(false);
  
  const today = new Date().toISOString().split('T')[0];
  const [logDate, setLogDate] = useState(today);

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { isClassActiveRef.current = isClassActive; }, [isClassActive]);

  // FIX: Force camera off when leaving the page to prevent light staying on
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, []);

  useEffect(() => {
    const map = new Map();
    attendance.forEach(a => {
      if (a.date === today && a.classId === activeClass) {
        map.set(`${a.studentId}_${a.classId}`, a.status);
      }
    });
    markedTodayMap.current = map;
  }, [attendance, activeClass, today]);

  const startCamera = async () => {
    if (!activeClass) { addToast('Please select a class first', 'error'); return; }
    if (!modelsLoaded) { addToast('AI models are still loading...', 'warn'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } });
      streamRef.current = s; // Store in ref
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        setIsCamOn(true);
        const todayRecs = attendance.filter(a => a.classId === activeClass && a.date === today);
        const recognized = todayRecs.filter(a => a.status !== 'absent').length;
        const late = todayRecs.filter(a => a.status === 'late').length;
        setSessionInfo({ start: new Date().toLocaleTimeString(), recognized, unknown: 0, late });
        setFeed([]);
        recentlyLoggedRef.current.clear(); 
        sessionStartRef.current = null;
        setLogDate(today);
      }
    } catch (err) { addToast('Could not access camera.', 'error'); }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (timeoutId.current) { clearTimeout(timeoutId.current); timeoutId.current = null; }
    if (canvasRef.current) { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCamOn(false); 
    setIsClassActive(false); 
    sessionStartRef.current = null;
  };

  const startClass = () => {
    setIsClassActive(true);
    sessionStartRef.current = new Date();
    setSessionInfo(prev => ({ ...prev, start: new Date().toLocaleTimeString() }));
    addToast('Class started! Attendance is now being recorded.', 'success');
  };

  const endClass = () => {
    setIsClassActive(false);
    const classStudents = students.filter(s => s.enrolledClasses?.includes(activeClass));
    const newAbsentRecords = [];
    classStudents.forEach(student => {
      const uniqueKey = `${student.id}_${activeClass}`;
      if (!markedTodayMap.current.has(uniqueKey)) {
        newAbsentRecords.push({ studentId: student.id, classId: activeClass, date: today, time: '--:--:--', status: 'absent' });
        markedTodayMap.current.set(uniqueKey, 'absent');
      }
    });
    if (newAbsentRecords.length > 0) {
      setAttendance(prev => [...prev, ...newAbsentRecords]);
      addToast(`Class ended. ${newAbsentRecords.length} student(s) marked absent.`, 'warn');
    } else { addToast('Class ended. All enrolled students have records.', 'success'); }
    recentlyLoggedRef.current.clear(); 
    sessionStartRef.current = null;
  };

  const recognizeFace = (liveDescriptor) => {
    const classStudents = students.filter(s => s.enrolledClasses?.includes(activeClass));
    let bestMatch = null; let bestDistance = settings?.matchThreshold || 0.6; 
    for (const student of classStudents) {
      const storedDescriptor = student.descriptors?.front;
      if (!storedDescriptor) continue;
      const float32Descriptor = new Float32Array(storedDescriptor);
      const distance = faceapi.euclideanDistance(liveDescriptor, float32Descriptor);
      if (distance < bestDistance) { bestDistance = distance; bestMatch = student; }
    }
    return bestMatch ? { match: true, student: bestMatch, distance: bestDistance } : { match: false, student: null, distance: bestDistance };
  };

  const getLateStatus = (timeNow) => {
    let status = 'present';
    const activeClassData = classes.find(c => c.id === activeClass);
    if (activeClassData?.startTime) {
      const parsedStart = parseClassTime(activeClassData.startTime);
      if (parsedStart !== null) {
        const currentMinutes = timeNow.getHours() * 60 + timeNow.getMinutes();
        const classStartMinutes = parsedStart.hours * 60 + parsedStart.minutes;
        if (currentMinutes > classStartMinutes + (settings?.lateThreshold ?? 0)) status = 'late';
      }
    } else if (sessionStartRef.current) {
      const currentMinutes = timeNow.getHours() * 60 + timeNow.getMinutes();
      const sessionStartMinutes = sessionStartRef.current.getHours() * 60 + sessionStartRef.current.getMinutes();
      if (currentMinutes > sessionStartMinutes + (settings?.lateThreshold ?? 0)) status = 'late';
    }
    return status;
  };

  useEffect(() => {
    let isMounted = true;
    const detectFaces = async () => {
      if (isDetecting.current) { timeoutId.current = setTimeout(detectFaces, 200); return; }
      if (isCamOn && videoRef.current && canvasRef.current && modelsLoaded) {
        const video = videoRef.current; const canvas = canvasRef.current;
        if (video.readyState === 4) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
          const ctx = canvas.getContext('2d');
          try {
            isDetecting.current = true; 
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks().withFaceDescriptors();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (isCamOn && isMounted) {
              detections.forEach(det => {
                const originalBox = det.detection.box;
                const mirroredX = canvas.width - originalBox.x - originalBox.width;
                const mirroredBox = { x: mirroredX, y: originalBox.y, width: originalBox.width, height: originalBox.height };
                const recognitionResult = recognizeFace(det.descriptor);
                if (recognitionResult.match) {
                  const student = recognitionResult.student;
                  const uniqueKey = `${student.id}_${activeClass}`;
                  let boxColor = '#00d4aa'; let boxLabel = student.name;
                  if (isClassActiveRef.current) {
                    const existingStatus = markedTodayMap.current.get(uniqueKey);
                    const currentStatus = existingStatus || getLateStatus(new Date());
                    if (currentStatus === 'late') { boxColor = '#ffa502'; boxLabel = `${student.name} (LATE)`; }
                  }
                  drawFaceBox(ctx, mirroredBox, boxColor, boxLabel);
                  if (isClassActiveRef.current) handleMatchedFace(student);
                } else {
                  drawFaceBox(ctx, mirroredBox, '#ff4757', 'Unknown');
                  if (isClassActiveRef.current) handleUnknownFace();
                }
              });
            }
          } catch (e) { console.error("Detection error:", e); } finally { isDetecting.current = false; }
        }
      }
      if (isCamOn && isMounted) { timeoutId.current = setTimeout(detectFaces, 500); }
    };
    if (isCamOn) detectFaces();
    return () => { isMounted = false; if (timeoutId.current) clearTimeout(timeoutId.current); };
  }, [isCamOn, modelsLoaded, activeClass, students]);

  const handleMatchedFace = (matchedStudent) => {
    const timeNow = new Date();
    const timeNowStr = timeNow.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const uniqueKey = `${matchedStudent.id}_${activeClass}`;
    
    if (!recentlyLoggedRef.current.has(matchedStudent.id)) {
      recentlyLoggedRef.current.add(matchedStudent.id);
      const status = markedTodayMap.current.get(uniqueKey) || getLateStatus(timeNow);
      setFeed(prev => [{ name: matchedStudent.name, time: timeNowStr, known: true, studentId: matchedStudent.id, status: status }, ...prev.slice(0, 50)]);
      setTimeout(() => recentlyLoggedRef.current.delete(matchedStudent.id), 15000);
    }
    const currentStatus = markedTodayMap.current.get(uniqueKey);
    if (currentStatus === 'present' || currentStatus === 'late') return;
    const status = getLateStatus(timeNow);
    markedTodayMap.current.set(uniqueKey, status);
    if (currentStatus === 'absent') {
      setAttendance(prev => prev.map(a => a.studentId === matchedStudent.id && a.classId === activeClass && a.date === today ? { ...a, time: timeNowStr, status: status } : a));
      setSessionInfo(prev => ({ ...prev, recognized: prev.recognized + 1, late: prev.late + (status === 'late' ? 1 : 0) }));
      addToast(`${matchedStudent.name} updated to ${status}!`, status === 'late' ? 'warn' : 'success');
    } else {
      setAttendance(prev => [...prev, { studentId: matchedStudent.id, classId: activeClass, date: today, time: timeNowStr, status }]);
      setSessionInfo(prev => ({ ...prev, recognized: prev.recognized + 1, late: prev.late + (status === 'late' ? 1 : 0) }));
      addToast(`${matchedStudent.name} marked ${status}!`, status === 'late' ? 'warn' : 'success');
    }
  };

  const parseClassTime = (timeStr) => {
    if (!timeStr) return null;
    try {
      const timeOnly = timeStr.replace(/[aApP][mM]/g, '').trim();
      const parts = timeOnly.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        let hours = parts[0]; const minutes = parts[1];
        if (/pm/i.test(timeStr) && hours !== 12) hours += 12;
        if (/am/i.test(timeStr) && hours === 12) hours = 0;
        return { hours, minutes };
      } return null;
    } catch { return null; }
  };

  const handleUnknownFace = () => {
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (!recentlyLoggedRef.current.has('unknown')) {
      recentlyLoggedRef.current.add('unknown');
      setFeed(prev => [{ name: 'Unknown Face', time: timeNow, known: false, studentId: null, status: 'unknown' }, ...prev.slice(0, 50)]);
      setSessionInfo(prev => ({ ...prev, unknown: prev.unknown + 1 }));
      setTimeout(() => recentlyLoggedRef.current.delete('unknown'), 5000); 
    }
  };

  const selectedClassName = classes.find(c => c.id === activeClass)?.name || 'N/A';
  const selectedClassData = classes.find(c => c.id === activeClass);
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const isPastClassStart = (() => {
    if (!selectedClassData?.startTime) return false;
    const parsed = parseClassTime(selectedClassData.startTime);
    if (!parsed) return false;
    return (currentTime.getHours() * 60 + currentTime.getMinutes()) > (parsed.hours * 60 + parsed.minutes);
  })();
  const enrolledCount = students.filter(s => s.enrolledClasses?.includes(activeClass)).length;
  const absentCount = enrolledCount - sessionInfo.recognized;
  const isViewingToday = logDate === today;
  const historicalLogs = attendance.filter(a => a.classId === activeClass && a.date === logDate).sort((a, b) => b.time.localeCompare(a.time));
  const StatusDot = ({ status }) => {
    const colors = { present: 'bg-green-400', late: 'bg-yellow-400', absent: 'bg-red-400', unknown: 'bg-red-400', detect: 'bg-cyan-400' };
    return <div className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-gray-400'} shrink-0`}></div>;
  };

  return (
    <div className="p-4 lg:p-8 bg-[#060a13] text-white" style={{ height: 'calc(100vh)', display: 'flex', flexDirection: 'column' }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Live Attendance</h1>
          <p className="text-gray-400 text-sm mt-1">Select a class and start the camera</p>
        </div>
        <div className="glass rounded-lg px-3 py-1.5 border border-white/10 text-right shrink-0">
          <div className="text-sm lg:text-base font-bold font-mono text-accent tracking-wider"><i className="fas fa-clock mr-1 text-[10px] opacity-70"></i>{formattedTime}</div>
          <div className="text-[10px] text-gray-400 mt-0.5 font-medium"><i className="fas fa-calendar-day mr-1 text-[8px] opacity-60"></i>{formattedDate}</div>
        </div>
      </div>
      
      <div className="glass rounded-xl p-1.5 mb-4 border border-white/5">
        <div className="flex gap-2 items-center justify-between">
          <div className="flex-1 max-w-[200px]">
            <select className="input-field w-full px-2 py-1 rounded-md text-[11px]" value={activeClass} onChange={e => setActiveClass(e.target.value)} disabled={isCamOn}>
              <option value="">-- Class --</option>
              {classes.map(c => (<option key={c.id} value={c.id}>{c.name} {c.startTime ? `(${c.startTime})` : ''}</option>))}
            </select>
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-2">
            {modelsLoaded ? (<span className="text-accent flex items-center gap-1"><i className="fas fa-circle-check text-[7px]"></i> AI</span>) : (<span className="text-yellow-500 flex items-center gap-1"><i className="fas fa-spinner fa-spin text-[7px]"></i> Load</span>)}
            <div className="flex items-center gap-1.5">
              <button onClick={isCamOn ? stopCamera : startCamera} className={isCamOn ? "btn-danger px-2.5 py-1 rounded-md text-[10px] font-semibold" : "btn-primary px-2.5 py-1 rounded-md text-[10px] font-semibold"}>
                <i className={`fas ${isCamOn ? 'fa-video-slash' : 'fa-video'} mr-1`}></i> {isCamOn ? 'Off' : 'Cam On'}
              </button>
              <button onClick={isClassActive ? endClass : startClass} disabled={!isCamOn} className={isClassActive ? "bg-yellow-500 hover:bg-yellow-600 disabled:opacity-30 text-black px-2.5 py-1 rounded-md text-[10px] font-semibold" : "bg-green-500 hover:bg-green-600 disabled:opacity-30 text-black px-2.5 py-1 rounded-md text-[10px] font-semibold"}>
                <i className={`fas ${isClassActive ? 'fa-stop' : 'fa-play'} mr-1`}></i> {isClassActive ? 'End' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 min-h-0 flex flex-col">
          <div className="glass rounded-2xl p-3 border border-white/5 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isClassActive && <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>}
                <span className="text-xs font-medium text-white">{!isCamOn ? 'Camera Off' : isClassActive ? `Live: ${selectedClassName}` : `Preview: ${selectedClassName}`}</span>
              </div>
              {isClassActive && selectedClassData?.startTime && (
                <div className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${isPastClassStart ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                  {isPastClassStart ? `Late after ${selectedClassData.startTime}` : `Before ${selectedClassData.startTime}`}
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center min-h-0 mt-1 w-full">
              <div className="relative rounded-xl overflow-hidden bg-black ring-1 ring-white/10 w-full" style={{ aspectRatio: '4/3', maxHeight: '100%' }}>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }}></video>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 20 }}></canvas>
                {!isCamOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-[#060a13]" style={{ zIndex: 5 }}>
                    <i className="fas fa-video-slash text-5xl mb-4 opacity-20"></i><p className="text-sm">Select a class and click Cam On</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 min-h-0 flex flex-col">
          <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5 shrink-0">
            <div className="grid grid-cols-2 gap-x-3 gap-y-0 text-[8px]">
              <div className="flex justify-between col-span-2 py-0.5 border-b border-white/5 mb-0.5"><span className="text-gray-500">Class</span><span className="text-accent font-bold truncate ml-2">{selectedClassName}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Start</span><span className="text-white font-semibold">{selectedClassData?.startTime || 'N/A'}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Late After</span><span className="text-yellow-400 font-semibold">{selectedClassData?.startTime ? `${settings?.lateThreshold ?? 0}m` : '-'}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Status</span><span className={isClassActive ? 'text-accent font-bold' : 'text-yellow-400 font-bold'}>{isClassActive ? 'Active' : (isCamOn ? 'Preview' : 'Off')}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Enrolled</span><span className="text-white font-bold">{enrolledCount}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Present</span><span className="text-green-400 font-bold">{sessionInfo.recognized - sessionInfo.late}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Late</span><span className="text-yellow-400 font-bold">{sessionInfo.late}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Absent</span><span className="text-red-400 font-bold">{isClassActive ? Math.max(0, absentCount) : '-'}</span></div>
              <div className="flex justify-between py-px"><span className="text-gray-500">Unknown</span><span className="text-red-400 font-bold">{sessionInfo.unknown}</span></div>
            </div>
          </div>
          
          <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-1 shrink-0">
              <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Log</span>
              <input type="date" className="input-field px-1.5 py-0.5 rounded text-[8px] w-[110px]" value={logDate} max={today} onChange={e => setLogDate(e.target.value)} />
            </div>
            <div className="space-y-px overflow-y-auto pr-0.5 flex-1 min-h-0">
              {!activeClass ? (
                <p className="text-[7px] text-center py-3 text-gray-600 italic">Select a class</p>
              ) : isViewingToday && isClassActive ? (
                feed.length === 0 ? (<p className="text-[7px] text-center py-3 text-gray-600 italic">Waiting for detection...</p>) : (
                  feed.map((f, i) => (
                    <div key={i} className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer hover:bg-white/5 ${f.known ? (f.status === 'late' ? 'bg-yellow-500/5' : 'bg-accent/5') : 'bg-danger/5'}`} onClick={() => f.known && setViewStudent(students.find(s => s.id === f.studentId))}>
                      <StatusDot status={f.status || 'detect'} />
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <p className={`text-[8px] font-medium truncate ${f.known ? (f.status === 'late' ? 'text-yellow-300' : 'text-gray-200') : 'text-gray-400'}`}>{f.name}</p>
                        <span className="text-[7px] text-gray-600 font-mono ml-2 shrink-0">{f.time}</span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                historicalLogs.length === 0 ? (<p className="text-[7px] text-center py-3 text-gray-600 italic">No records</p>) : (
                  historicalLogs.map((rec, i) => {
                    const stu = students.find(s => s.id === rec.studentId);
                    return (
                      <div key={i} className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer hover:bg-white/5 ${rec.status === 'absent' ? 'bg-red-500/5' : rec.status === 'late' ? 'bg-yellow-500/5' : 'bg-accent/5'}`} onClick={() => stu && setViewStudent(stu)}>
                        <StatusDot status={rec.status} />
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <p className="text-[8px] font-medium text-gray-200 truncate">{stu?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <span className={`text-[7px] font-bold uppercase ${rec.status === 'absent' ? 'text-red-400' : rec.status === 'late' ? 'text-yellow-400' : 'text-accent'}`}>{rec.status}</span>
                            <span className="text-[7px] text-gray-600 font-mono">{rec.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={() => setViewStudent(null)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewStudent(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fas fa-xmark"></i></button>
            <div className="text-center mb-6 mt-2">
              <img src={viewStudent.photos?.front || 'https://picsum.photos/seed/fallback/160/160'} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border-2 border-dark-500" alt="" />
              <h4 className="font-display font-bold text-white text-lg">{viewStudent.name}</h4>
              <p className="text-sm text-gray-400">{viewStudent.studentId}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['front', 'left', 'right'].map(angle => (
                <div key={angle} className="text-center">
                  {viewStudent.photos?.[angle] ? (<img src={viewStudent.photos[angle]} className="w-full aspect-square rounded-lg object-cover border border-dark-500" alt={angle} />) : (<div className="w-full aspect-square rounded-lg bg-dark-700 flex items-center justify-center"><i className="fas fa-image text-gray-600 text-xs"></i></div>)}
                  <p className="text-[8px] text-gray-500 mt-1 capitalize">{angle}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-400 space-y-2 bg-dark-800/50 p-3 rounded-lg">
              <p><strong className="text-gray-300">Age:</strong> {viewStudent.age || 'N/A'}</p>
              <p><strong className="text-gray-300">Address:</strong> {viewStudent.address || 'N/A'}</p>
              <p><strong className="text-gray-300">Phone:</strong> {viewStudent.phone || 'N/A'}</p>
              <p><strong className="text-gray-300">Classes:</strong> {classes.filter(c => viewStudent.enrolledClasses?.includes(c.id)).map(c => c.name).join(', ') || 'None'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}