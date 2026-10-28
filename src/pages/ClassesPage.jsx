import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ClassesPage() {
  const { classes, setClasses, students, setStudents, addToast } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  
  const [formData, setFormData] = useState({ 
    name: '', startTime: '', endTime: '', days: [], room: '', enrolledStudents: [] 
  });

  const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    if (diffMinutes === 0) return 'Invalid time';
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
  };

  const openAdd = () => {
    setEditClass(null);
    setFormData({ name: '', startTime: '', endTime: '', days: [], room: '', enrolledStudents: [] });
    setStudentSearch('');
    setShowModal(true);
  };

  const openEdit = (cls) => {
    setEditClass(cls);
    const currentlyEnrolledIds = students.filter(s => s.enrolledClasses?.includes(cls.id)).map(s => s.id);
    setFormData({ name: cls.name, startTime: cls.startTime || '', endTime: cls.endTime || '', days: cls.days || [], room: cls.room || '', enrolledStudents: currentlyEnrolledIds });
    setStudentSearch('');
    setShowModal(true);
  };

  const handleDayChange = (day) => {
    setFormData(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }));
  };

  const handleStudentSelect = (studentId) => {
    setFormData(prev => ({ ...prev, enrolledStudents: prev.enrolledStudents.includes(studentId) ? prev.enrolledStudents.filter(id => id !== studentId) : [...prev.enrolledStudents, studentId] }));
  };

  const saveClass = () => {
    if (!formData.name) { addToast('Please enter a class name', 'error'); return; }
    if (formData.startTime && formData.endTime && calculateDuration(formData.startTime, formData.endTime) === 'Invalid time') { addToast('End time must be after Start time', 'error'); return; }
    let classId;
    if (editClass) {
      classId = editClass.id;
      setClasses(classes.map(c => c.id === editClass.id ? { ...c, name: formData.name, startTime: formData.startTime, endTime: formData.endTime, days: formData.days, room: formData.room } : c));
      addToast('Class updated', 'success');
    } else {
      classId = 'cls_' + Date.now();
      setClasses([...classes, { id: classId, name: formData.name, startTime: formData.startTime, endTime: formData.endTime, days: formData.days, room: formData.room }]);
      addToast('Class created!', 'success');
    }
    const updatedStudents = students.map(student => {
      const isEnrolledInForm = formData.enrolledStudents.includes(student.id);
      const wasEnrolledBefore = student.enrolledClasses?.includes(classId);
      let newClasses = [...(student.enrolledClasses || [])];
      if (isEnrolledInForm && !wasEnrolledBefore) newClasses.push(classId);
      else if (!isEnrolledInForm && wasEnrolledBefore) newClasses = newClasses.filter(id => id !== classId);
      return { ...student, enrolledClasses: newClasses };
    });
    setStudents(updatedStudents);
    setShowModal(false);
  };

  const deleteClass = (id) => {
    if (!confirm('Delete this class? Students enrolled will lose this class.')) return;
    setClasses(classes.filter(c => c.id !== id));
    const updatedStudents = students.map(s => ({ ...s, enrolledClasses: (s.enrolledClasses || []).filter(classId => classId !== id) }));
    setStudents(updatedStudents);
    addToast('Class deleted', 'info');
  };

  const duration = calculateDuration(formData.startTime, formData.endTime);
  const filteredStudentsForModal = students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.studentId.toLowerCase().includes(studentSearch.toLowerCase()));

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Manage Classes</h1>
          <p className="text-gray-400 text-sm mt-1">Create and schedule classes, assign students</p>
        </div>
        <button onClick={openAdd} className="btn-primary px-5 py-2.5 rounded-xl text-sm whitespace-nowrap">
          <i className="fas fa-plus mr-2"></i>Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => {
          const clsDuration = calculateDuration(cls.startTime, cls.endTime);
          const studentCount = students.filter(s => s.enrolledClasses?.includes(cls.id)).length;
          return (
            <div key={cls.id} className="glass rounded-2xl p-5 stat-card border-l-4 border-accent">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-bold text-white text-lg">{cls.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cls)} className="w-7 h-7 rounded-lg bg-dark-500/50 flex items-center justify-center text-gray-400 hover:text-warn hover:bg-warn/10"><i className="fas fa-pen text-xs"></i></button>
                  <button onClick={() => deleteClass(cls.id)} className="w-7 h-7 rounded-lg bg-dark-500/50 flex items-center justify-center text-gray-400 hover:text-danger hover:bg-danger/10"><i className="fas fa-trash text-xs"></i></button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                {cls.startTime && cls.endTime && (<div className="flex items-center gap-2"><i className="fas fa-clock text-accent w-5 text-center text-xs"></i><span>{cls.startTime} - {cls.endTime} <span className="text-gray-500 text-xs">({clsDuration})</span></span></div>)}
                {cls.days && cls.days.length > 0 && (<div className="flex items-center gap-2"><i className="fas fa-calendar-days text-accent w-5 text-center text-xs"></i><span>{cls.days.join(', ')}</span></div>)}
                {cls.room && (<div className="flex items-center gap-2"><i className="fas fa-location-dot text-accent w-5 text-center text-xs"></i><span>{cls.room}</span></div>)}
                <div className="flex items-center gap-2 pt-2 border-t border-dark-500/50"><i className="fas fa-user-graduate text-accent w-5 text-center text-xs"></i><span>{studentCount} Student{studentCount !== 1 ? 's' : ''}</span></div>
              </div>
            </div>
          );
        })}
        {classes.length === 0 && <p className="text-gray-500 text-sm col-span-full text-center py-8">No classes created yet.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="glass rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-dark-500/50 flex items-center justify-between shrink-0">
              <h3 className="font-display font-semibold text-white">{editClass ? 'Edit' : 'Create'} Class</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><i className="fas fa-xmark"></i></button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-1/2 p-6 space-y-4 overflow-y-auto border-r border-dark-500/50">
                <div><label className="block text-xs text-gray-400 mb-1">Class Name *</label><input type="text" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" placeholder="e.g. Mathematics Revision" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-400 mb-1">Start Time</label><input type="time" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">End Time</label><input type="time" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div>
                </div>
                {duration && duration !== 'Invalid time' && (<div className="bg-accent/10 border border-accent/20 text-accent text-xs font-semibold p-2.5 rounded-lg text-center">Duration: {duration}</div>)}
                {duration === 'Invalid time' && (<div className="bg-danger/10 border border-danger/20 text-danger text-xs font-semibold p-2.5 rounded-lg text-center">End time must be after Start time</div>)}
                <div><label className="block text-xs text-gray-400 mb-2">Schedule Days</label><div className="grid grid-cols-4 gap-2">{ALL_DAYS.map(day => (<label key={day} className={`flex items-center justify-center gap-2 cursor-pointer text-xs p-2 rounded-lg border transition-colors ${formData.days.includes(day) ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-dark-700 border-dark-500 text-gray-400 hover:border-gray-400'}`}><input type="checkbox" checked={formData.days.includes(day)} onChange={() => handleDayChange(day)} className="hidden" />{day.substring(0, 3)}</label>))}</div></div>
                <div><label className="block text-xs text-gray-400 mb-1">Room / Location</label><input type="text" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" placeholder="e.g. Room 204 or IT Lab" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} /></div>
              </div>

              {/* COMPACT STUDENT LIST */}
              <div className="md:w-1/2 p-6 flex flex-col border-t md:border-t-0 border-dark-500/50">
                <div className="mb-3">
                  <h4 className="font-display font-semibold text-white text-sm mb-1 flex items-center gap-2"><i className="fas fa-user-graduate text-accent text-xs"></i> Enroll Students</h4>
                  <p className="text-[10px] text-gray-500 mb-2">{formData.enrolledStudents.length} selected</p>
                  <div className="relative"><i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]"></i><input type="text" placeholder="Search by name or ID..." className="input-field w-full pl-8 pr-4 py-1.5 rounded-lg text-xs" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} /></div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
                  {filteredStudentsForModal.length > 0 ? filteredStudentsForModal.map(student => {
                    const isSelected = formData.enrolledStudents.includes(student.id);
                    return (
                      <div key={student.id} onClick={() => handleStudentSelect(student.id)} className={`flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded-lg transition-colors border ${isSelected ? 'bg-accent/10 border-accent/20' : 'bg-dark-700/30 border-transparent hover:bg-dark-700/60 hover:border-dark-500'}`}>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent border-accent' : 'border-gray-500'}`}>{isSelected && <i className="fas fa-check text-[7px] text-dark-900"></i>}</div>
                        <img src={student.photos?.front || 'https://picsum.photos/seed/fallback/40/40'} className="w-6 h-6 rounded-full object-cover border border-dark-500" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>{student.name}</p>
                          <p className="text-[9px] text-gray-500">{student.studentId}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10"><i className="fas fa-users-slash text-2xl text-gray-600 mb-3"></i><p className="text-xs text-gray-500">{studentSearch ? 'No match' : 'No students registered'}</p></div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-dark-500/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary px-5 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={saveClass} className="btn-primary px-5 py-2.5 rounded-xl text-sm"><i className="fas fa-save mr-1.5"></i>Save Class</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}