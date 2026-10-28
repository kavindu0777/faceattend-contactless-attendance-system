export const generateDemoData = () => {
  const classes = [
    { id: 'cls_1', name: 'Mathematics Revision', startTime: '09:00', endTime: '11:00', days: ['Monday', 'Wednesday', 'Friday'], room: 'Room 201', createdBy: 'teacher_1' },
    { id: 'cls_2', name: 'Science Paper Class', startTime: '13:00', endTime: '15:30', days: ['Tuesday', 'Thursday'], room: 'Lab 3', createdBy: 'teacher_1' },
    { id: 'cls_3', name: 'ICT Group Study', startTime: '16:00', endTime: '17:00', days: ['Saturday'], room: 'IT Lab', createdBy: 'teacher_1' }
  ];
  const names = [
    'Nimal Perera','Sanduni Fernando','Kasun Jayawardena','Ishara Wijesinghe',
    'Tharindu De Silva','Chamari Dias','Prasanna Kumara','Malini Rajapaksa'
  ];

  const students = names.map((name, i) => ({
    id: 'stu_' + i,
    studentId: 'STU' + (1000 + i),
    name: name,
    age: 18 + Math.floor(Math.random() * 5),
    address: 'Colombo, Sri Lanka',
    phone: '077-' + Math.floor(1000000 + Math.random() * 9000000),
    enrolledClasses: [classes[i % 3].id, classes[(i + 1) % 3].id], // Students in multiple classes
    photos: {
      front: `https://picsum.photos/seed/front${i}/200/200`,
      left: `https://picsum.photos/seed/left${i}/200/200`,
      right: `https://picsum.photos/seed/right${i}/200/200`
    },
    descriptors: { front: null, left: null, right: null },
    registeredDate: '2024-01-15',
  }));

  const attendance = [];
  const today = new Date();
  for (let d = 29; d >= 0; d--) {
    const date = new Date(today); date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    students.forEach(stu => {
      stu.enrolledClasses.forEach(clsId => {
        const rand = Math.random();
        let status = 'present', hour = 8 + Math.floor(Math.random() * 2), min = Math.floor(Math.random() * 55);
        if (rand > 0.85) { status = 'absent'; hour = 0; min = 0; }
        else if (rand > 0.72) { status = 'late'; hour = 9 + Math.floor(Math.random() * 2); }
        attendance.push({
          studentId: stu.id, classId: clsId, date: dateStr,
          time: `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`,
          status: status
        });
      });
    });
  }

  const users = [{ id: 'teacher_1', name: 'Mr. Teacher', email: 'admin@faceattend.com', password: 'admin123', role: 'teacher' }];

  return { students, attendance, classes, users };
};