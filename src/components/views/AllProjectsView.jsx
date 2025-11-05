// src/components/views/AllProjectsView.jsx
import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { 
  getMonthDays, 
  formatDate, 
  getCategoryColor, 
  getStatusIcon 
} from '../../utils/calendarUtils';

export default function AllProjectsView({
  projects,
  tasks,
  currentUser,
  setSelectedTask,
  selectedTask,
  printCalendar
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedProjects, setExpandedProjects] = useState({});

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const monthDays = getMonthDays(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Group tasks by project
  const tasksByProject = tasks.reduce((acc, task) => {
    if (!acc[task.projectId]) acc[task.projectId] = [];
    acc[task.projectId].push(task);
    return acc;
  }, {});

  // Helper function to check if a task spans a given date
  const taskSpansDate = (task, dateStr) => {
    if (!task.startDate || !task.dueDate) return false;
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.dueDate);
    const checkDate = new Date(dateStr);
    return checkDate >= taskStart && checkDate <= taskEnd;
  };

  // Get tasks for a specific project and date
  const getProjectTasksForDate = (projectId, dateStr) => {
    const projectTasks = tasksByProject[projectId] || [];
    return projectTasks.filter(task => taskSpansDate(task, dateStr));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Projects Calendar</h2>
            <p className="text-sm text-gray-600 mt-1">
              Overview of all projects and their schedules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              ← Prev
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Next →
            </button>
            <button
              onClick={printCalendar}
              className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-2"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-700">{projects.length}</div>
            <div className="text-xs text-blue-600">Active Projects</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-700">{tasks.length}</div>
            <div className="text-xs text-purple-600">Total Tasks</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-amber-700">
              {tasks.filter(t => t.status === 'in-progress').length}
            </div>
            <div className="text-xs text-amber-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">{monthName}</h3>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Project-by-Project Calendars */}
      {projects.map(project => {
        const projectTasks = tasksByProject[project.id] || [];
        const isExpanded = expandedProjects[project.id];

        return (
          <div key={project.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={() => toggleProject(project.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <div className="text-left">
                  <div className="font-semibold text-gray-900">{project.name}</div>
                  <div className="text-sm text-gray-600">{project.customer}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  {projectTasks.filter(t => t.status === 'completed').length} completed
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 border-t">
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((dayInfo, idx) => {
                    const { date, isCurrentMonth } = dayInfo;
                    const dateStr = formatDate(date);
                    const dayTasks = getProjectTasksForDate(project.id, dateStr);
                    const isToday = formatDate(new Date()) === dateStr;

                    return (
                      <div
                        key={idx}
                        className={`min-h-20 border rounded p-1 ${
                          isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                        } ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}`}
                      >
                        <div className={`text-xs font-semibold mb-1 ${
                          isToday ? 'text-blue-600' : !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 3).map(task => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`text-xs p-1 rounded border cursor-pointer transition-all hover:shadow-sm ${getCategoryColor(task.category)} ${
                                task.status === 'completed' ? 'opacity-60' : ''
                              } ${
                                selectedTask?.id === task.id ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-start gap-0.5">
                                <span className="text-xs">{getStatusIcon(task.status)}</span>
                                <div className="flex-1 min-w-0 truncate" title={task.name}>
                                  {task.name}
                                </div>
                              </div>
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dayTasks.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {projects.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Projects Yet
          </h3>
          <p className="text-gray-500">
            Create a project to get started
          </p>
        </div>
      )}
    </div>
  );
}