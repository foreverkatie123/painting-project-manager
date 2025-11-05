// src/components/views/CrewCalendarView.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Printer, X, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import TaskCard from '../TaskCard';
import { 
  getMonthDays, 
  formatDate, 
  getCategoryColor, 
  getStatusIcon,
  groupTasksByDate
} from '../../utils/calendarUtils';
import { updateTask as updateTaskAction } from '../../hooks/useFirebaseData';
import NoWorkDaysModal from '../modals/NoWorkDaysModal';
import { useNoWorkDays, addNoWorkDay, deleteNoWorkDay, isNoWorkDay, getNoWorkDayReason } from '../../hooks/useNoWorkDays';

export default function CrewCalendarView({
  tasks,
  projects,
  currentUser,
  selectedTask,
  setSelectedTask,
  taskTemplates,
  crewMembers,
  editingTask,
  setEditingTask,
  updateTask,
  deleteTask,
  addNote,
  printCalendar,
  readOnly = false,
  showToast
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState(null);
  const { noWorkDays, loading: noWorkDaysLoading } = useNoWorkDays();
  
  // Update selectedTask when tasks array changes (to get latest data from Firebase)
  useEffect(() => {
    if (selectedTask && tasks.length > 0) {
      const updatedTask = tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        console.log('CrewCalendarView: Checking for updates', {
          selectedTaskId: selectedTask.id,
          currentStatus: selectedTask.status,
          updatedStatus: updatedTask.status
        });
        
        // Check if this is actually different data to avoid unnecessary re-renders
        const currentData = JSON.stringify({
          status: selectedTask.status,
          assignedTo: selectedTask.assignedTo,
          startDate: selectedTask.startDate,
          dueDate: selectedTask.dueDate,
          jobDetails: selectedTask.jobDetails,
          notes: selectedTask.notes
        });
        const newData = JSON.stringify({
          status: updatedTask.status,
          assignedTo: updatedTask.assignedTo,
          startDate: updatedTask.startDate,
          dueDate: updatedTask.dueDate,
          jobDetails: updatedTask.jobDetails,
          notes: updatedTask.notes
        });
        
        if (currentData !== newData) {
          console.log('CrewCalendarView: Updating selectedTask with new data');
          setSelectedTask(updatedTask);
        }
      }
    }
  }, [tasks, selectedTask, setSelectedTask]);

  // Filter tasks assigned to current user
  const myTasks = tasks.filter(task => 
    task.assignedTo && task.assignedTo.includes(currentUser.displayName)
  );

  const handleDragStart = (e, task) => {
      if (readOnly || currentUser?.userType !== 'admin') return;
      setDraggedTask(task);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.currentTarget);
    };
  
    const handleDragOver = (e, dateStr) => {
      if (readOnly || currentUser?.userType !== 'admin') return;
      
      // Check if this is a no-work day
      if (isNoWorkDay(dateStr, noWorkDays)) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
  
    const handleDrop = async (e, date) => {
      if (readOnly || currentUser?.userType !== 'admin') return;
      e.preventDefault();
      if (!draggedTask) return;
  
      const dateStr = formatDate(date);
      
      // Prevent scheduling on no-work days
      if (isNoWorkDay(dateStr, noWorkDays)) {
        if (showToast) {
          const reason = getNoWorkDayReason(dateStr, noWorkDays);
          showToast(`Cannot schedule on ${dateStr}: ${reason}`, 'error');
        }
        setDraggedTask(null);
        return;
      }
  
      try {
        const updates = { dueDate: dateStr };
        if (!draggedTask.startDate) {
          updates.startDate = dateStr;
        }
        await updateTaskAction(draggedTask.id, updates);
        if (showToast) showToast('Task scheduled successfully', 'success');
      } catch (error) {
        console.error("Error updating task date:", error);
        if (showToast) showToast('Error updating task date', 'error');
      }
      setDraggedTask(null);
    };
  
    const handleDragEnd = () => {
      setDraggedTask(null);
    };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const monthDays = getMonthDays(currentMonth);
  const tasksByDate = groupTasksByDate(myTasks);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get tasks that appear on each date (spanning)
  const getTasksForDate = (dateStr) => {
    return tasks.filter(task => taskSpansDate(task, dateStr));
  };

  // Get project name for a task
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  // Helper function to check if a task spans a given date
  const taskSpansDate = (task, dateStr) => {
    if (!task.startDate || !task.dueDate) return false;
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.dueDate);
    const checkDate = new Date(dateStr);
    return checkDate >= taskStart && checkDate <= taskEnd;
  };

  // Helper function to determine task position in date
    const getTaskPositionInDate = (task, dateStr) => {
      if (!task.startDate || !task.dueDate) return 'single';
      const taskStart = formatDate(new Date(task.startDate));
      const taskEnd = formatDate(new Date(task.dueDate));
      
      if (taskStart === taskEnd) return 'single';
      if (dateStr === taskStart) return 'start';
      if (dateStr === taskEnd) return 'end';
      return 'middle';
    };

  // Check if we should disable task management features
  const isTaskManagementDisabled = true;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <p className="text-sm text-gray-600 mt-1">
              Viewing tasks assigned to {currentUser.displayName}
            </p>
          </div>
          <button
            onClick={printCalendar}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
          >
            <Printer size={18} />
            Print
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-700">{myTasks.length}</div>
            <div className="text-xs text-blue-600">Total Tasks</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-700">
              {myTasks.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-amber-700">
              {myTasks.filter(t => t.status === 'in-progress').length}
            </div>
            <div className="text-xs text-amber-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">
              {myTasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{monthName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  <ChevronLeft size={18} />
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
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dayInfo, idx) => {
              const { date, isCurrentMonth } = dayInfo;
              const dateStr = formatDate(date);
              const dayTasks = getTasksForDate(dateStr);
              const isToday = formatDate(new Date()) === dateStr;
              const noWorkDay = isNoWorkDay(dateStr, noWorkDays);
              const noWorkReason = noWorkDay ? getNoWorkDayReason(dateStr, noWorkDays) : null;

              return (
                <div
                  key={idx}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDrop={(e) => handleDrop(e, date)}
                  className={`min-h-24 border rounded p-1 transition-colors relative ${
                    noWorkDay ? 'bg-red-50 border-red-300' : 
                    isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                  } ${!isCurrentMonth ? 'bg-gray-50' : noWorkDay ? 'bg-red-50' : 'bg-white'} ${
                    draggedTask && !isTaskManagementDisabled && !noWorkDay ? 'hover:border-blue-400 hover:bg-blue-50 hover:shadow-md' : ''
                  } ${
                    draggedTask && noWorkDay ? 'cursor-not-allowed' : ''
                  }`}
                  title={noWorkDay ? noWorkReason : ''}
                >
                  {/* No Work Day Indicator */}
                  {noWorkDay && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded">
                      <div className="absolute top-0 left-0 w-full h-full" 
                           style={{
                             backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.1) 10px, rgba(239, 68, 68, 0.1) 20px)'
                           }}>
                      </div>
                    </div>
                  )}
                  
                  <div className={`text-xs font-semibold mb-1 flex items-center justify-between ${
                    noWorkDay ? 'text-red-600' :
                    isToday ? 'text-blue-600' : !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                  }`}>
                    <span>{date.getDate()}</span>
                    {noWorkDay && (
                      <XCircle size={10} className="text-red-500" />
                    )}
                  </div>
                  
                  {noWorkDay && (
                    <div className="text-xs text-red-600 font-medium mb-1 truncate">
                      {noWorkReason}
                    </div>
                  )}
                  
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 4).map(task => {
                      const position = getTaskPositionInDate(task, dateStr);
                      const showFullName = position === 'start' || position === 'single';
                      
                      return (
                        <div
                          key={task.id}
                          draggable={!isTaskManagementDisabled && currentUser?.userType === 'admin'}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedTask(task)}
                          style={{
                            borderRightColor: position === 'start' || position === 'middle' ? 'transparent' : undefined,
                            borderLeftColor: position === 'end' || position === 'middle' ? 'transparent' : undefined,
                          }}
                          className={`text-xs p-1 border cursor-move transition-all hover:shadow-sm ${getCategoryColor(task.category)} ${
                            draggedTask?.id === task.id ? 'opacity-50' : ''
                          } ${task.status === 'completed' ? 'opacity-60' : ''} ${
                            selectedTask?.id === task.id ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                          } ${
                            position === 'start' ? 'rounded-l' : 
                            position === 'end' ? 'rounded-r' : 
                            position === 'middle' ? 'rounded-none' : 
                            'rounded'
                          }`}
                        >
                          <div className="flex items-start gap-0.5">
                            {showFullName && <span className="text-xs">{getStatusIcon(task.status)}</span>}
                            <div className="flex-1 min-w-0 text-xs" title={task.name}>
                              {showFullName ? (
                                <span className="truncate block">{task.name}</span>
                              ) : (
                                <span className="block h-3">&nbsp;</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {dayTasks.length > 4 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayTasks.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>○ Pending</span>
                <span>● In Progress</span>
                <span>✓ Completed</span>
                <span className="flex items-center gap-1">
                  <XCircle size={12} className="text-red-500" />
                    No Work Day
                </span>
                <span className="ml-auto">Click tasks to view details</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
            {selectedTask ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Task Details</h3>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="mb-3 p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Project</div>
                  <div className="font-medium text-sm">{getProjectName(selectedTask.projectId)}</div>
                </div>
                <TaskCard
                  key={`${selectedTask.id}-${selectedTask.status}-${selectedTask.notes?.length || 0}`}
                  task={selectedTask}
                  currentUser={currentUser}
                  crewMembers={crewMembers}
                  taskTemplates={taskTemplates}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  addNote={addNote}
                  readOnly={readOnly}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Select a Task
                </h3>
                <p className="text-sm text-gray-500">
                  Click on a task in the calendar to view details and update status
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Tasks List */}
      {myTasks.filter(t => t.status !== 'completed').length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Upcoming Tasks</h3>
          <div className="space-y-2">
            {myTasks
              .filter(t => t.status !== 'completed' && t.dueDate)
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .slice(0, 5)
              .map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                    selectedTask?.id === task.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{getStatusIcon(task.status)}</span>
                        <span className="font-medium">{task.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getProjectName(task.projectId)} • Due: {task.dueDate}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                      task.status === 'in-progress' ? 'bg-blue-200 text-blue-700' :
                      'bg-green-200 text-green-700'
                    }`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}