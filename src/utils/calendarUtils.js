// src/utils/calendarUtils.js

export const getMonthDays = (currentMonth) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const daysFromPrevMonth = startingDayOfWeek;
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
  
  const days = [];
  
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date, isCurrentMonth: false });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push({ date, isCurrentMonth: true });
  }
  
  const remainingCells = totalCells - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month + 1, i);
    days.push({ date, isCurrentMonth: false });
  }
  
  return days;
};

export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

export const getCategoryColor = (category) => {
  const colors = {
    'Prep': 'bg-blue-100 border-blue-300 text-blue-700',
    'Paint': 'bg-green-100 border-green-300 text-green-700',
    'Final Walkthrough': 'bg-purple-100 border-purple-300 text-purple-700'
  };
  return colors[category] || 'bg-gray-100 border-gray-300 text-gray-700';
};

export const getStatusIcon = (status) => {
  if (status === 'completed') return '✓';
  if (status === 'in-progress') return '◐';
  return '○';
};

export const groupTasksByDate = (tasks) => {
  return tasks.reduce((acc, task) => {
    if (!acc[task.dueDate]) acc[task.dueDate] = [];
    acc[task.dueDate].push(task);
    return acc;
  }, {});
};

export const groupTasksByCategory = (tasks) => {
  return tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {});
};