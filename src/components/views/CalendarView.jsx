// src/components/views/CalendarView.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Printer, X, Plus, ChevronDown, ChevronRight, AlertCircle, Info, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { X as XIcon } from 'lucide-react';
import TaskCard from '../TaskCard';
import NoWorkDaysModal from '../modals/NoWorkDaysModal';
import { 
  getMonthDays, 
  formatDate, 
  getCategoryColor, 
  getStatusIcon,
  groupTasksByDate,
  groupTasksByCategory
} from '../../utils/calendarUtils';
import { updateTask as updateTaskAction } from '../../hooks/useFirebaseData';
import { useNoWorkDays, addNoWorkDay, deleteNoWorkDay, isNoWorkDay, getNoWorkDayReason } from '../../hooks/useNoWorkDays';

const CATEGORIES = ['Prep', 'Paint', 'Final Walkthrough'];

export default function CalendarView({
  tasks,
  projects,
  currentUser,
  taskTemplates,
  crewMembers,
  selectedTask,
  setSelectedTask,
  editingTask,
  setEditingTask,
  updateTask,
  deleteTask,
  addNote,
  addTaskFromTemplate,
  printCalendar,
  readOnly = false,
  isAllTasksView = false,
  showToast
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [showNoWorkModal, setShowNoWorkModal] = useState(false);
  const scrollContainerRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  
  const { noWorkDays, loading: noWorkDaysLoading } = useNoWorkDays();

  // Update selectedTask when tasks array changes (to get latest data from Firebase)
  useEffect(() => {
    if (selectedTask && tasks.length > 0) {
      const updatedTask = tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        // Check if this is actually different data
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
          setSelectedTask(updatedTask);
        }
      }
    }
  }, [tasks, selectedTask, setSelectedTask]);

  // Auto-scroll when dragging near edges
  useEffect(() => {
    const handleDragMove = (e) => {
      if (!draggedTask) return;

      const scrollContainer = scrollContainerRef.current || window;
      const threshold = 100;
      const scrollSpeed = 10;

      const viewportHeight = window.innerHeight;
      const mouseY = e.clientY;

      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }

      if (mouseY > viewportHeight - threshold) {
        autoScrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16);
      }
      else if (mouseY < threshold) {
        autoScrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16);
      }
    };

    const handleDragEnd = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };

    if (draggedTask) {
      window.addEventListener('dragover', handleDragMove);
      window.addEventListener('dragend', handleDragEnd);
      window.addEventListener('drop', handleDragEnd);
    }

    return () => {
      window.removeEventListener('dragover', handleDragMove);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDragEnd);
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [draggedTask]);

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

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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

  const monthDays = getMonthDays(currentMonth);
  const tasksByCategory = groupTasksByCategory(tasks);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get tasks that appear on each date (spanning)
  const getTasksForDate = (dateStr) => {
    return tasks.filter(task => taskSpansDate(task, dateStr));
  };

  const scheduledTasks = tasks.filter(t => t.dueDate);
  const unscheduledTasks = tasks.filter(t => !t.dueDate);

  // Check if we should disable task management features
  const isTaskManagementDisabled = isAllTasksView || readOnly;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" ref={scrollContainerRef}>
      <div className="lg:col-span-2">
        {/* All Tasks View Notice */}
        {isAllTasksView && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 text-sm">Viewing All Projects</p>
                <p className="text-sm text-blue-700 mt-1">
                  Select a specific project to add tasks. This view shows all tasks across projects for scheduling overview.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unscheduled Tasks Banner */}
        {unscheduledTasks.length > 0 && !isTaskManagementDisabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <button
              onClick={() => setShowUnscheduled(!showUnscheduled)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600" />
                <span className="font-semibold text-amber-900">
                  {unscheduledTasks.length} Unscheduled Task{unscheduledTasks.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm text-amber-700">
                  (Drag to calendar to schedule)
                </span>
              </div>
              {showUnscheduled ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            
            {showUnscheduled && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {unscheduledTasks.map(task => (
                  <div
                    key={task.id}
                    draggable={!isTaskManagementDisabled && currentUser?.userType === 'admin'}
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedTask(task)}
                    className={`text-xs p-2 rounded border cursor-move transition-all hover:shadow-md ${getCategoryColor(task.category)} ${
                      draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''
                    } ${
                      selectedTask?.id === task.id ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-1">
                      <span className="text-xs">{getStatusIcon(task.status)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" title={task.name}>
                          {task.name}
                        </div>
                        {task.assignedTo?.length > 0 && (
                          <div className="text-xs opacity-75 mt-1 truncate">
                            {task.assignedTo.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{monthName}</h3>
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
              {currentUser?.userType === 'admin' && !isTaskManagementDisabled && (
                <button
                  onClick={() => setShowNoWorkModal(true)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                  title="Manage no-work days"
                >
                  <XCircle size={16} />
                  No Work
                </button>
              )}
              <button
                onClick={printCalendar}
                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
              >
                <Printer size={16} />
                Print
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
            <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
              <span>○ Pending</span>
              <span>◐ In Progress</span>
              <span>✓ Completed</span>
              <span className="flex items-center gap-1">
                <XCircle size={12} className="text-red-500" />
                No Work Day
              </span>
              {!isTaskManagementDisabled && currentUser?.userType === 'admin' && (
                <span className="ml-auto">Drag tasks to reschedule • Click to view details</span>
              )}
              {isTaskManagementDisabled && <span className="ml-auto">Click to view details</span>}
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP: Right sidebar - hidden on mobile */}
      <div className="hidden lg:block lg:col-span-1">
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
              <TaskCard
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
            <div>
              <h3 className="text-lg font-semibold mb-4">Task Management</h3>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">{tasks.length}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{unscheduledTasks.length}</div>
                  <div className="text-xs text-gray-500">Unscheduled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {tasks.filter(t => t.status === 'completed').length}
                  </div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
              </div>

              <div className="space-y-4">
                {CATEGORIES.map(category => {
                const categoryTasks = tasksByCategory[category] || [];
                const categoryTemplates = taskTemplates.filter(t => t.category === category);
                const isExpanded = expandedCategories[category];

                return (
                  <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span className="font-medium text-sm">{category}</span>
                        <span className="text-xs text-gray-500">
                          ({categoryTasks.length})
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-white">
                        {!isTaskManagementDisabled && currentUser?.userType === 'admin' && (
                          <div className="mb-3 pb-3 border-b">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Add Task
                            </label>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  addTaskFromTemplate(e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="">Select template...</option>
                              {categoryTemplates.map(template => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                  {template.estimatedDuration && ` (${template.estimatedDuration}h)`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {categoryTasks.length > 0 ? (
                          <div className="space-y-1">
                            {categoryTasks.map(task => (
                              <button
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className={`w-full text-left p-2 rounded text-sm transition-colors ${
                                  selectedTask?.id === task.id
                                    ? 'bg-blue-100 border border-blue-300'
                                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{task.name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${
                                    task.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                                    task.status === 'in-progress' ? 'bg-blue-200 text-blue-700' :
                                    'bg-green-200 text-green-700'
                                  }`}>
                                    {task.status === 'pending' ? 'Pending' :
                                    task.status === 'in-progress' ? 'In Progress' :
                                    'Done'}
                                  </span>
                                </div>
                                {task.dueDate && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Due: {task.dueDate}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic text-center py-2">
                            No {category.toLowerCase()} tasks yet
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE: Bottom sheet for task details */}
      {selectedTask && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div 
            className="bg-white w-full rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex items-center justify-center py-2 border-b">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Task Details</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-4">
              <TaskCard
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
          </div>
        </div>
      )}

      {/* No Work Days Modal */}
      {showNoWorkModal && (
        <NoWorkDaysModal
          noWorkDays={noWorkDays}
          onClose={() => setShowNoWorkModal(false)}
          onAddNoWorkDay={addNoWorkDay}
          onDeleteNoWorkDay={deleteNoWorkDay}
          showToast={showToast}
        />
      )}
    </div>
  );
}