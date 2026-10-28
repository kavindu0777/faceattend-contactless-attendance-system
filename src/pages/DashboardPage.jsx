import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default function DashboardPage() {
  const { students, attendance, classes } = useContext(AppContext);
  const weeklyChartRef = useRef(null);
  const courseChartRef = useRef(null);
  const weeklyChartInstance = useRef(null);
  const courseChartInstance = useRef(null);
  const [selectedClass, setSelectedClass] = useState('');
  
  // NEW: Date filter state, defaulting to today
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const filteredAttendance = selectedClass ? attendance.filter(a => a.classId === selectedClass) : attendance;
  const filteredStudents = selectedClass ? students.filter(s => s.enrolledClasses?.includes(selectedClass)) : students;

  // FIX: Filter attendance by selectedDate instead of hardcoded today
  const dateRecords = filteredAttendance.filter(a => a.date === selectedDate);
  
  const strictlyPresentIds = new Set(dateRecords.filter(a => a.status === 'present').map(a => a.studentId));
  const lateIds = new Set(dateRecords.filter(a => a.status === 'late').map(a => a.studentId));
  const attendedIds = new Set(dateRecords.filter(a => a.status === 'present' || a.status === 'late').map(a => a.studentId));
  const absentCount = filteredStudents.length - attendedIds.size;
  const pct = filteredStudents.length > 0 ? Math.round((attendedIds.size / filteredStudents.length) * 100) : 0;

  useEffect(() => {
    renderWeeklyChart();
    renderCourseChart();
    return () => {
      if (weeklyChartInstance.current) weeklyChartInstance.current.destroy();
      if (courseChartInstance.current) courseChartInstance.current.destroy();
    };
  }, [filteredAttendance, filteredStudents, classes, selectedDate]); // Added selectedDate dependency

  const renderWeeklyChart = () => {
    if (weeklyChartInstance.current) weeklyChartInstance.current.destroy();
    const labels = [], presentData = [], lateData = [], absentData = [];
    
    // FIX: Calculate the 7 days leading up to the selectedDate
    const endDate = new Date(selectedDate);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }));
      const recs = filteredAttendance.filter(a => a.date === dateStr);
      presentData.push(recs.filter(a => a.status === 'present').length);
      lateData.push(recs.filter(a => a.status === 'late').length);
      absentData.push(recs.filter(a => a.status === 'absent').length);
    }
    weeklyChartInstance.current = new Chart(weeklyChartRef.current, {
      type: 'bar', data: { labels, datasets: [
        { label:'Present', data:presentData, backgroundColor:'rgba(0,212,170,0.7)', borderRadius:6 },
        { label:'Late', data:lateData, backgroundColor:'rgba(255,165,2,0.7)', borderRadius:6 },
        { label:'Absent', data:absentData, backgroundColor:'rgba(255,71,87,0.7)', borderRadius:6 }
      ]},
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#94a3b8', usePointStyle:true }}}, scales:{ x:{ stacked:true, grid:{ color:'rgba(36,51,80,.3)' }, ticks:{ color:'#64748b' }}, y:{ stacked:true, grid:{ color:'rgba(36,51,80,.3)' }, ticks:{ color:'#64748b' }}}}
    });
  };

  const renderCourseChart = () => {
    if (courseChartInstance.current) courseChartInstance.current.destroy();
    const classCounts = classes.map(c => students.filter(s => s.enrolledClasses?.includes(c.id)).length);
    const colors = ['rgba(0,212,170,0.8)','rgba(99,102,241,0.8)','rgba(255,165,2,0.8)','rgba(255,71,87,0.8)', 'rgba(168,85,247,0.8)'];
    courseChartInstance.current = new Chart(courseChartRef.current, {
      type: 'doughnut', data: { labels: classes.map(c => c.name), datasets: [{ data: classCounts, backgroundColor: colors.slice(0, classes.length), borderColor: 'rgba(6,10,19,0.8)', borderWidth: 3 }]},
      options: { responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ color:'#94a3b8', usePointStyle:true, font:{size:10} }}}}
    });
  };

  const statCards = [
    { label: 'Total Students', value: filteredStudents.length, icon: 'fa-user-graduate', bgColor: 'rgba(59,130,246,0.1)', textColor: '#60a5fa', span: selectedClass ? 'Filtered' : 'Total' },
    { label: 'Attended', value: attendedIds.size, icon: 'fa-circle-check', bgColor: 'rgba(0,212,170,0.1)', textColor: '#00d4aa', span: pct + '%' },
    { label: 'Late Arrivals', value: lateIds.size, icon: 'fa-clock', bgColor: 'rgba(255,165,2,0.1)', textColor: '#ffa502', span: 'Late' },
    { label: 'Absent', value: Math.max(0, absentCount), icon: 'fa-circle-xmark', bgColor: 'rgba(255,71,87,0.1)', textColor: '#ff4757', span: 'Absent' }
  ];

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time attendance overview</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* NEW: Date Filter */}
          <div className="w-full sm:w-44">
            <input 
              type="date" 
              className="input-field w-full px-4 py-2.5 rounded-xl text-sm" 
              value={selectedDate} 
              max={today} 
              onChange={e => setSelectedDate(e.target.value)} 
            />
          </div>
          {/* Class Filter */}
          <div className="w-full sm:w-64">
            <select className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: s.bgColor}}>
                <i className={`fas ${s.icon}`} style={{color: s.textColor}}></i>
              </div>
              <span className="text-xs" style={{color: s.textColor}}>{s.span}</span>
            </div>
            <p className="font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4">Weekly Trend</h3>
          <div style={{height:280}}><canvas ref={weeklyChartRef}></canvas></div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4">Class Distribution</h3>
          <div style={{height:280}}><canvas ref={courseChartRef}></canvas></div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-display font-semibold text-white mb-4">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b border-dark-500"><th className="pb-3 font-medium">Student</th><th className="pb-3 font-medium">Class</th><th className="pb-3 font-medium">Time</th><th className="pb-3 font-medium">Status</th></tr></thead>
            <tbody>
              {/* FIX: Use dateRecords instead of todayRecords */}
              {dateRecords.sort((a,b) => b.time.localeCompare(a.time)).slice(0, 8).map(rec => {
                const stu = students.find(s => s.id === rec.studentId);
                const cls = classes.find(c => c.id === rec.classId);
                if (!stu) return null;
                const statusClass = rec.status === 'present' ? 'text-accent' : rec.status === 'late' ? 'text-warn' : 'text-danger';
                const statusBg = rec.status === 'present' ? 'rgba(0,212,170,0.1)' : rec.status === 'late' ? 'rgba(255,165,2,0.1)' : 'rgba(255,71,87,0.1)';
                return (
                  <tr key={rec.studentId + rec.time + rec.classId} className="table-row border-b border-dark-500">
                    <td className="py-3 pr-3"><div className="flex items-center gap-2"><img src={stu.photos?.front || 'https://picsum.photos/seed/fallback/40/40'} className="w-7 h-7 rounded-full object-cover" alt="" /><span className="text-white">{stu.name}</span></div></td>
                    <td className="py-3 text-gray-400">{cls?.name || 'N/A'}</td>
                    <td className="py-3 text-gray-400">{rec.time}</td>
                    <td className="py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${statusClass}`} style={{background: statusBg}}>{rec.status.charAt(0).toUpperCase()+rec.status.slice(1)}</span></td>
                  </tr>
                );
              })}
              {dateRecords.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-gray-500 text-sm">No records found for this date.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}