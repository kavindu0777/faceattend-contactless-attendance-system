import { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Chart, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
Chart.register(...registerables);

export default function ReportsPage() {
  const { students, attendance, settings, addToast, classes } = useContext(AppContext);
  const dailyRef = useRef(null); 
  const compRef = useRef(null);
  const dailyInst = useRef(null); 
  const compInst = useRef(null);
  
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    generateReport();
    return () => { 
      if(dailyInst.current) dailyInst.current.destroy(); 
      if(compInst.current) compInst.current.destroy(); 
    };
  }, [from, to, selectedClass, attendance]);

  const generateReport = () => {
    let recs = attendance.filter(a => a.date >= from && a.date <= to);
    if (selectedClass) recs = recs.filter(a => a.classId === selectedClass);
    
    if(dailyInst.current) dailyInst.current.destroy();
    
    const byDate = {}; 
    recs.forEach(r => { 
      if(!byDate[r.date]) byDate[r.date] = { present: 0, late: 0, absent: 0 }; 
      byDate[r.date][r.status]++; 
    });
    
    const dates = Object.keys(byDate).sort();
    
    dailyInst.current = new Chart(dailyRef.current, {
      type: 'line',
      data: {
        labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [
          { label: 'Present', data: dates.map(d => byDate[d].present), borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)', fill: true, tension: 0.4 },
          { label: 'Late', data: dates.map(d => byDate[d].late), borderColor: '#ffa502', backgroundColor: 'rgba(255,165,2,0.1)', fill: true, tension: 0.4 },
          { label: 'Absent', data: dates.map(d => byDate[d].absent), borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.1)', fill: true, tension: 0.4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', usePointStyle: true } } },
        scales: {
          x: { grid: { color: 'rgba(36,51,80,.3)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(36,51,80,.3)' }, ticks: { color: '#64748b' } }
        }
      }
    });

    if(compInst.current) compInst.current.destroy();
    
    compInst.current = new Chart(compRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Late', 'Absent'],
        datasets: [{
          data: [
            recs.filter(r => r.status === 'present').length, 
            recs.filter(r => r.status === 'late').length, 
            recs.filter(r => r.status === 'absent').length
          ],
          backgroundColor: ['rgba(0,212,170,0.8)', 'rgba(255,165,2,0.8)', 'rgba(255,71,87,0.8)'],
          borderColor: 'rgba(6,10,19,0.8)',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true, font: { size: 10 } } } }
      }
    });
  };

  const exportCSV = () => {
    let csv = 'Student Name,Class,Date,Status\n'; 
    let recs = attendance.filter(a => a.date >= from && a.date <= to);
    if (selectedClass) recs = recs.filter(a => a.classId === selectedClass);
    recs.forEach(r => { 
      const s = students.find(x => x.id === r.studentId); 
      const c = classes.find(x => x.id === r.classId); 
      if(s) csv += `${s.name},${c?.name || 'N/A'},${r.date},${r.status}\n`; 
    });
    const blob = new Blob([csv], { type: 'text/csv' }); 
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'report.csv'; 
    a.click(); 
    addToast('CSV exported', 'success');
  };

  const exportPDF = () => {
    let recs = attendance.filter(a => a.date >= from && a.date <= to);
    if (selectedClass) recs = recs.filter(a => a.classId === selectedClass);

    const doc = new jsPDF();
    const className = classes.find(c => c.id === selectedClass)?.name || 'All Classes';

    doc.setFontSize(22);
    doc.setTextColor(0, 212, 170);
    doc.text('Smart-log', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Attendance Report', 14, 26);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.institution || 'N/A', 14, 36);
    
    doc.setFontSize(10);
    doc.text(`Department: ${settings.department || 'N/A'}`, 14, 42);
    doc.text(`Class: ${className}`, 14, 48);
    doc.text(`Period: ${from} to ${to}`, 14, 54);

    const tableData = recs.map(r => {
      const s = students.find(x => x.id === r.studentId);
      const c = classes.find(x => x.id === r.classId);
      return [ s?.name || 'Unknown', s?.studentId || 'N/A', c?.name || 'N/A', r.date, r.time, r.status.charAt(0).toUpperCase() + r.status.slice(1) ];
    });

    autoTable(doc, {
      head: [['Student Name', 'ID', 'Class', 'Date', 'Time', 'Status']],
      body: tableData,
      startY: 60,
      theme: 'striped',
      headStyles: { fillColor: [0, 212, 170], textColor: [6, 10, 19], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }
    doc.save(`Smart-log_Report_${className.replace(/\s+/g, '_')}.pdf`);
    addToast('PDF exported successfully', 'success');
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Reports</h1>
        <p className="text-gray-400 text-sm mt-1">Filter by class and export data</p>
      </div>
      
      <div className="glass rounded-2xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <input type="date" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <input type="date" className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Class</label>
          <select className="input-field w-full px-4 py-2.5 rounded-xl text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4">Daily Attendance</h3>
          <div style={{ height: 250 }}><canvas ref={dailyRef}></canvas></div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-4">Attendance vs Absence</h3>
          <div style={{ height: 250 }}><canvas ref={compRef}></canvas></div>
        </div>
      </div>
      
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display font-semibold text-white mb-4">Export Data</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportCSV} className="btn-secondary px-5 py-2.5 rounded-xl text-sm"><i className="fas fa-file-csv mr-2"></i>Export CSV</button>
          <button onClick={exportPDF} className="btn-primary px-5 py-2.5 rounded-xl text-sm"><i className="fas fa-file-pdf mr-2"></i>Export PDF</button>
        </div>
      </div>
    </div>
  );
}