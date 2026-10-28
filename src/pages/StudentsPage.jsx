import { useContext, useState, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import * as faceapi from '@vladmandic/face-api';

export default function StudentsPage() {
  const { students, setStudents, attendance, setAttendance, addToast, classes, modelsLoaded } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStu, setEditStu] = useState(null);
  const [viewStu, setViewStu] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', studentId: '', age: '', address: '', phone: '', enrolledClasses: [],
    photos: { front: null, left: null, right: null } 
  });

  const [showCamera, setShowCamera] = useState(false);
  const [cameraAngle, setCameraAngle] = useState('front');
  const camVideoRef = useRef(null);
  const camCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // FIX: Added isFromCamera flag to know if we need to flip the image
  const [cropModal, setCropModal] = useState({ isOpen: false, imageSrc: null, angle: 'front', zoom: 1, isFromCamera: false });

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchClass = !classFilter || s.enrolledClasses?.includes(classFilter);
    return matchSearch && matchClass;
  });

  const openAdd = () => { 
    setEditStu(null); 
    setFormData({ name: '', studentId: '', age: '', address: '', phone: '', enrolledClasses: [], photos: { front: null, left: null, right: null } }); 
    setShowModal(true); 
  };

  const openEdit = (s) => { 
    setEditStu(s); 
    setFormData({ name: s.name, studentId: s.studentId, age: s.age, address: s.address, phone: s.phone, enrolledClasses: s.enrolledClasses || [], photos: s.photos || { front: null, left: null, right: null } }); 
    setShowModal(true); 
  };
  
  const handleClassSelect = (classId) => {
    setFormData(prev => ({ ...prev, enrolledClasses: prev.enrolledClasses.includes(classId) ? prev.enrolledClasses.filter(id => id !== classId) : [...prev.enrolledClasses, classId] }));
  };

  // File selected -> Open Crop Modal (Not from camera)
  const handleFileChange = (e, angle) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (upload) => {
      setCropModal({ isOpen: true, imageSrc: upload.target.result, angle: angle, zoom: 1, isFromCamera: false });
    };
    reader.readAsDataURL(file);
  };

  // Crop and Save Photo
  const processCrop = () => {
    const img = new Image();
    img.src = cropModal.imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 320; 
      canvas.width = maxSize;
      canvas.height = maxSize;
      const ctx = canvas.getContext('2d');

      // FIX: If the image came from the camera, flip the canvas horizontally before drawing
      if (cropModal.isFromCamera) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      const zoom = cropModal.zoom;
      const sw = img.width / zoom;
      const sh = img.height / zoom;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, maxSize, maxSize);
      
      // Reset transformation for safety
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      
      setFormData(prev => ({ ...prev, photos: { ...prev.photos, [cropModal.angle]: compressed } }));
      setCropModal({ isOpen: false, imageSrc: null, angle: 'front', zoom: 1, isFromCamera: false });
    };
  };

  const openCamera = async (angle) => {
    setCameraAngle(angle);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: 'user' } });
      cameraStreamRef.current = stream;
      if (camVideoRef.current) camVideoRef.current.srcObject = stream;
    } catch (err) {
      addToast('Could not access camera.', 'error');
      closeCamera();
    }
  };

  const capturePhoto = () => {
    const video = camVideoRef.current;
    const canvas = camCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const rawImageData = canvas.toDataURL('image/jpeg');
    // FIX: Mark as isFromCamera: true so it gets flipped during crop
    setCropModal({ isOpen: true, imageSrc: rawImageData, angle: cameraAngle, zoom: 1, isFromCamera: true });
    closeCamera();
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const saveStudent = async () => {
    if (!formData.name || !formData.studentId) { addToast('Please fill name and ID', 'error'); return; }
    if (!formData.photos.front) { addToast('Front face photo is required', 'error'); return; }

    let frontDescriptor = null;
    if (modelsLoaded) {
      try {
        const img = new Image();
        img.src = formData.photos.front;
        await new Promise(resolve => img.onload = resolve);
        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks().withFaceDescriptor();
        if (detection) frontDescriptor = Array.from(detection.descriptor);
        else addToast('No face found in front photo. Try a clearer image.', 'warn');
      } catch (err) { 
        addToast('Could not process face data.', 'warn'); 
      }
    }

    const studentData = { ...formData, descriptors: { front: frontDescriptor, left: null, right: null } };
    if (editStu) {
      setStudents(students.map(s => s.id === editStu.id ? { ...s, ...studentData } : s));
      addToast('Student updated', 'success');
    } else {
      setStudents([...students, { id: 'stu_' + Date.now(), ...studentData, registeredDate: new Date().toISOString().split('T')[0] }]);
      addToast('Student added', 'success');
    }
    setShowModal(false);
  };

  const deleteStudent = (id) => {
    if (!confirm('Delete this student?')) return;
    setStudents(students.filter(s => s.id !== id));
    setAttendance(attendance.filter(a => a.studentId !== id));
    addToast('Student deleted', 'info');
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div><h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Student Records</h1><p className="text-gray-400 text-sm mt-1">Manage students, classes, and face data</p></div>
        <button onClick={openAdd} className="btn-primary px-5 py-2.5 rounded-xl text-sm"><i className="fas fa-plus mr-2"></i>Add Student</button>
      </div>
      <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Search by name or ID..." className="input-field flex-1 px-4 py-2.5 rounded-xl text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field px-4 py-2.5 rounded-xl text-sm" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(stu => {
          const stuClasses = classes.filter(c => stu.enrolledClasses?.includes(c.id));
          const hasFaceData = stu.descriptors?.front ? true : false;
          return (
            <div key={stu.id} className="glass rounded-2xl p-5 stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={stu.photos?.front || 'https://picsum.photos/seed/fallback/200/200'} className="w-12 h-12 rounded-xl object-cover border-2 border-dark-500" alt="" />
                  <div><p className="text-sm font-semibold text-white">{stu.name}</p><p className="text-xs text-gray-400">{stu.studentId}</p></div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewStu(stu)} className="w-7 h-7 rounded-lg bg-dark-500/50 flex items-center justify-center text-gray-400 hover:text-accent hover:bg-accent/10"><i className="fas fa-eye text-xs"></i></button>
                  <button onClick={() => openEdit(stu)} className="w-7 h-7 rounded-lg bg-dark-500/50 flex items-center justify-center text-gray-400 hover:text-warn hover:bg-warn/10"><i className="fas fa-pen text-xs"></i></button>
                  <button onClick={() => deleteStudent(stu.id)} className="w-7 h-7 rounded-lg bg-dark-500/50 flex items-center justify-center text-gray-400 hover:text-danger hover:bg-danger/10"><i className="fas fa-trash text-xs"></i></button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div><span className="text-gray-400">Classes: </span><span className="text-white">{stuClasses.map(c => c.name).join(', ') || 'None'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-400">Face Data</span>{hasFaceData ? <span className="text-accent"><i className="fas fa-circle-check mr-1"></i>Registered</span> : <span className="text-danger"><i className="fas fa-circle-xmark mr-1"></i>Missing</span>}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-500/50 flex items-center justify-between"><h3 className="font-display font-semibold text-white">{editStu ? 'Edit' : 'Add'} Student</h3><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><i className="fas fa-xmark"></i></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs text-gray-400 mb-1">Full Name *</label><input className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-400 mb-1">Student ID *</label><input className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Age</label><input type="number" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs text-gray-400 mb-1">Address</label><input className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Phone</label><input className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Enrolled Classes</label>
                <div className="space-y-2">{classes.map(cls => (<label key={cls.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white"><input type="checkbox" checked={formData.enrolledClasses.includes(cls.id)} onChange={() => handleClassSelect(cls.id)} className="accent-accent" />{cls.name}</label>))}{classes.length === 0 && <p className="text-gray-500 text-xs">No classes created yet.</p>}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Face Photos * <span className="text-accent">(Front is required)</span></label>
                <div className="grid grid-cols-3 gap-4">
                  {['front', 'left', 'right'].map(angle => (
                    <div key={angle} className="text-center">
                      <label className="block text-[10px] text-gray-500 mb-1 capitalize">{angle} Face</label>
                      <div className="w-full aspect-square rounded-xl bg-dark-700 border-2 border-dashed border-dark-500 flex items-center justify-center overflow-hidden relative">
                        {formData.photos[angle] ? (<img src={formData.photos[angle]} className="w-full h-full object-cover" alt={angle} />) : (<div className="text-center pointer-events-none"><i className="fas fa-user text-gray-600 text-2xl mb-1"></i><p className="text-[8px] text-gray-600">No Photo</p></div>)}
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        <button type="button" onClick={() => openCamera(angle)} className="flex-1 bg-accent/10 text-accent hover:bg-accent/20 text-[9px] py-1.5 rounded-lg transition-colors font-semibold flex items-center justify-center gap-1"><i className="fas fa-camera text-[8px]"></i> Cam</button>
                        <button type="button" onClick={() => document.getElementById(`file-${angle}`).click()} className="flex-1 bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 text-[9px] py-1.5 rounded-lg transition-colors font-semibold flex items-center justify-center gap-1"><i className="fas fa-upload text-[8px]"></i> File</button>
                      </div>
                      <input id={`file-${angle}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, angle)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-dark-500/50 flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="btn-secondary px-5 py-2.5 rounded-xl text-sm">Cancel</button><button onClick={saveStudent} className="btn-primary px-5 py-2.5 rounded-xl text-sm"><i className="fas fa-save mr-1.5"></i>Save Student</button></div>
          </div>
        </div>
      )}

      {/* LIVE CAMERA POPUP */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-overlay p-4 bg-black/90">
          <div className="glass rounded-2xl w-full max-w-md p-6 text-center relative">
            <h3 className="font-display font-semibold text-white mb-4 capitalize">Take {cameraAngle} Photo</h3>
            <div className="relative rounded-xl overflow-hidden bg-black mb-4" style={{ aspectRatio: '1/1' }}>
              <video ref={camVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }}></video>
            </div>
            <canvas ref={camCanvasRef} className="hidden"></canvas>
            <div className="flex gap-3 justify-center">
              <button onClick={closeCamera} className="btn-danger px-5 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={capturePhoto} className="btn-primary px-5 py-2.5 rounded-xl text-sm"><i className="fas fa-camera mr-2"></i>Capture</button>
            </div>
          </div>
        </div>
      )}

      {/* CROP & ZOOM POPUP */}
      {cropModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center modal-overlay p-4 bg-black/90">
          <div className="glass rounded-2xl w-full max-w-md p-6 text-center relative">
            <h3 className="font-display font-semibold text-white mb-4 capitalize">Crop {cropModal.angle} Photo</h3>
            <div className="relative rounded-xl overflow-hidden bg-dark-800 mb-4" style={{ aspectRatio: '1/1' }}>
              {/* FIX: Show mirror preview if it came from the camera so the user can align properly */}
              <img 
                src={cropModal.imageSrc} 
                className="w-full h-full object-cover" 
                style={{ transform: cropModal.isFromCamera ? `scaleX(-1) scale(${cropModal.zoom})` : `scale(${cropModal.zoom})` }} 
                alt="Crop preview" 
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-accent/50 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <i className="fas fa-search-minus text-gray-400"></i>
              <input type="range" min="1" max="3" step="0.1" value={cropModal.zoom} onChange={e => setCropModal({...cropModal, zoom: e.target.value})} className="flex-1 accent-accent" />
              <i className="fas fa-search-plus text-gray-400"></i>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setCropModal({ isOpen: false, imageSrc: null, angle: 'front', zoom: 1, isFromCamera: false })} className="btn-danger px-5 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={processCrop} className="btn-primary px-5 py-2.5 rounded-xl text-sm"><i className="fas fa-crop mr-2"></i>Crop & Save</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewStu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="glass rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4"><h3 className="font-display font-semibold text-white">Student Profile</h3><button onClick={() => setViewStu(null)} className="text-gray-400 hover:text-white"><i className="fas fa-xmark"></i></button></div>
            <div className="text-center mb-6">
              <img src={viewStu.photos?.front || 'https://picsum.photos/seed/fallback/200/200'} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border-2 border-dark-500" alt="" />
              <h4 className="font-display font-bold text-white text-lg">{viewStu.name}</h4>
              <p className="text-sm text-gray-400">{viewStu.studentId}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['front', 'left', 'right'].map(angle => (
                <div key={angle}>{viewStu.photos?.[angle] ? <img src={viewStu.photos[angle]} className="w-full aspect-square rounded-lg object-cover border border-dark-500" alt={angle} /> : <div className="w-full aspect-square rounded-lg bg-dark-700 flex items-center justify-center"><i className="fas fa-image text-gray-600"></i></div>}</div>
              ))}
            </div>
            <div className="text-xs text-gray-400 space-y-2">
              <p><strong>Age:</strong> {viewStu.age || 'N/A'}</p>
              <p><strong>Address:</strong> {viewStu.address || 'N/A'}</p>
              <p><strong>Phone:</strong> {viewStu.phone || 'N/A'}</p>
              <p><strong>Classes:</strong> {classes.filter(c => viewStu.enrolledClasses?.includes(c.id)).map(c => c.name).join(', ') || 'None'}</p>
              <p><strong>Face Data:</strong> {viewStu.descriptors?.front ? <span className="text-accent">Registered</span> : <span className="text-danger">Not Registered</span>}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}