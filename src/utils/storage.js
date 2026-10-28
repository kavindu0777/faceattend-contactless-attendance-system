export const saveVisualsToStorage = (userId, students) => {
  try {
    if (!userId) return;
    const visuals = {};
    
    students.forEach(s => {
      if (s.photos || s.descriptors) {
        visuals[s.id] = { 
          photos: s.photos || null, 
          descriptors: s.descriptors || null 
        };
      }
    });
    
    localStorage.setItem(`fa_visuals_${userId}`, JSON.stringify(visuals));
  } catch (e) {
    console.error('Local visuals save error:', e);
  }
};

export const loadVisualsFromStorage = (userId, students) => {
  try {
    if (!userId) return students;
    
    const visualsString = localStorage.getItem(`fa_visuals_${userId}`);
    if (!visualsString) return students;
    
    const visuals = JSON.parse(visualsString) || {};
    
    return students.map(s => ({
      ...s,
      photos: visuals[s.id]?.photos || s.photos || { front: null, left: null, right: null },
      descriptors: visuals[s.id]?.descriptors || s.descriptors || null
    }));
    
  } catch (e) {
    console.error('Local visuals load error:', e);
    return students;
  }
};