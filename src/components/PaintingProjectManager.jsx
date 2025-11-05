// src/components/PaintingProjectManager.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Users, ClipboardList, Settings, Trash2, ChevronDown, Menu, X as XIcon } from 'lucide-react';
import { seedTaskTemplates } from '../utils/seedTaskTemplates';

// Modals
import UserManagementModal from './modals/UserManagementModal';
import ProfileEditorModal from './modals/ProfileEditorModal';

// Components
import TaskCard from './TaskCard';
import CalendarView from './views/CalendarView';
import CrewCalendarView from './views/CrewCalendarView';
import { ToastContainer, useToast } from './Toast';

// Hooks
import {
  useUserProfile,
  useAllUsers,
  useCrewMembers,
  useTaskTemplates,
  useProjects,
  useTasks,
  useCrewTasks,
  createProject as createProjectAction,
  addTaskFromTemplate as addTaskFromTemplateAction,
  updateTask as updateTaskAction,
  deleteTask as deleteTaskAction,
  addNote as addNoteAction,
  updateUserProfile as updateUserProfileAction,
  deleteProject as deleteProjectAction
} from '../hooks/useFirebaseData';

const CATEGORIES = ['Prep', 'Paint', 'Final Walkthrough'];

export default function PaintingProjectManager({ user, onLogout }) {
  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();
  // State
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [view, setView] = useState('calendar');
  const [editingTask, setEditingTask] = useState(null);
  const [showCrewManager, setShowCrewManager] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  // NEW: Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firebase hooks
  const currentUser = useUserProfile(user, onLogout);
  const allUsers = useAllUsers(currentUser);
  const crewMembers = useCrewMembers();
  const taskTemplates = useTaskTemplates();
  const { projects, loading } = useProjects(currentUser);
  const tasks = useTasks(selectedProject, currentUser);
  const crewTasks = useCrewTasks(currentUser);

  // Auto-select project for homeowners
  useEffect(() => {
    if (currentUser?.userType === 'homeowner' && projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [currentUser, projects, selectedProject]);

  // NEW: Close mobile menu when project selected
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setMobileMenuOpen(false);
  };

  // Handlers
  const handleCreateProject = async () => {
    if (!newProjectName || !newCustomerName) return;
    
    try {
      const newProject = await createProjectAction(user, currentUser, newProjectName, newCustomerName);
      setNewProjectName('');
      setNewCustomerName('');
      setShowNewProject(false);
      setSelectedProject(newProject);
    } catch (error) {
      alert("Error creating project. Please try again.");
    }
  };

  const handleAddTaskFromTemplate = async (templateId) => {
    if (!selectedProject) return;
    
    const template = taskTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    try {
      await addTaskFromTemplateAction(selectedProject, template, currentUser);
    } catch (error) {
      alert("Error adding task. Please try again.");
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await updateTaskAction(taskId, updates, currentUser);
    } catch (error) {
      alert("Error updating task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTaskAction(taskId, selectedTask, setSelectedTask);
    } catch (error) {
      alert("Error deleting task. Please try again.");
    }
  };

  const handleAddNote = async (taskId, noteText) => {
    try {
      await addNoteAction(taskId, noteText, currentUser, tasks);
    } catch (error) {
      alert("Error adding note. Please try again.");
    }
  };

  const handleUpdateUserProfile = async (updates) => {
    try {
      await updateUserProfileAction(user.uid, updates, () => {});
    } catch (error) {
      alert("Error updating profile. Please try again.");
    }
  };

  const handleDeleteProject = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?\n\n` +
      `This will permanently delete the project and all associated tasks. This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await deleteProjectAction(projectId, selectedProject, setSelectedProject);
      addToast('Project deleted successfully', 'success');
    } catch (error) {
      console.error("Error deleting project:", error);
      addToast('Error deleting project. Please try again.', 'error');
    }
  };

  const printCalendar = () => {
    window.print();
  };

  // Render functions
  const renderMainContent = () => {
    if (currentUser?.userType === 'crew') {
      return (
        <CrewCalendarView
          tasks={crewTasks}
          projects={projects}
          currentUser={currentUser}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          setEditingTask={setEditingTask}
          updateTask={handleUpdateTask}
          taskTemplates={taskTemplates}
          crewMembers={crewMembers}
          deleteTask={handleDeleteTask}
          addNote={handleAddNote}
          printCalendar={printCalendar}
          showToast={addToast}
        />
      );
    }
    
    if (currentUser?.userType === 'homeowner') {
      return (
        <CalendarView
          tasks={tasks}
          projects={projects}
          currentUser={currentUser}
          taskTemplates={taskTemplates}
          crewMembers={crewMembers}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          updateTask={handleUpdateTask}
          deleteTask={handleDeleteTask}
          addNote={handleAddNote}
          addTaskFromTemplate={handleAddTaskFromTemplate}
          printCalendar={printCalendar}
          readOnly={true}
        />
      );
    }

    // Admin view
    return (
      <>
        {view === 'calendar' && (
          <CalendarView
            tasks={tasks}
            projects={projects}
            currentUser={currentUser}
            taskTemplates={taskTemplates}
            crewMembers={crewMembers}
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
            updateTask={handleUpdateTask}
            deleteTask={handleDeleteTask}
            addNote={handleAddNote}
            addTaskFromTemplate={handleAddTaskFromTemplate}
            printCalendar={printCalendar}
            isAllTasksView={selectedProject?.isAllTasks || false}
            showToast={addToast}
          />
        )}
        
        {view === 'list' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">All Tasks</h3>
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={currentUser}
                  crewMembers={crewMembers}
                  taskTemplates={taskTemplates}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                  updateTask={handleUpdateTask}
                  deleteTask={handleDeleteTask}
                  addNote={handleAddNote}
                />
              ))}
              {tasks.length === 0 && (
                <p className="text-gray-500 text-sm italic">No tasks added yet</p>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* UPDATED: Mobile-friendly header */}
        <header className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6 no-print">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 truncate">Irish Luxe Painting Manager</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs md:text-sm text-gray-600 truncate">
                  {currentUser?.displayName || 'Loading...'} 
                  {currentUser?.role && <span className="text-gray-400 hidden sm:inline"> • {currentUser.role}</span>}
                  {currentUser?.userType && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                      currentUser.userType === 'admin' ? 'bg-red-100 text-red-700' :
                      currentUser.userType === 'crew' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {currentUser.userType}
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  Edit
                </button>
              </div>
            </div>
            
            {/* NEW: Mobile menu button */}
            {currentUser?.userType === 'admin' && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
            )}
          </div>
          
          {/* Desktop view buttons */}
          <div className="hidden md:flex items-center justify-between">
            {currentUser?.userType === 'admin' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setView('calendar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    view === 'calendar' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Calendar size={18} />
                  Calendar View
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    view === 'list' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <ClipboardList size={18} />
                  List View
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              {currentUser?.userType === 'admin' && (
                <>
                  <button
                    onClick={() => setShowNewProject(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={20} />
                    New Project
                  </button>
                  <button
                    onClick={() => setShowUserManager(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    title="Manage users"
                  >
                    <Settings size={20} />
                    Users
                  </button>
                </>
              )}
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile action buttons */}
          <div className="md:hidden flex gap-2 mt-4">
            {currentUser?.userType === 'admin' && (
              <button
                onClick={() => setShowNewProject(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus size={18} />
                New Project
              </button>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* NEW: Mobile menu overlay */}
        {mobileMenuOpen && currentUser?.userType === 'admin' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
            <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Projects</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                >
                  <XIcon size={24} />
                </button>
              </div>
              
              <div className="overflow-y-auto h-[calc(100vh-73px)] p-4">
                {/* All Tasks Button */}
                <button
                  onClick={() => handleSelectProject({ id: 'all-tasks', name: 'All Tasks', isAllTasks: true })}
                  className={`w-full text-left p-3 rounded-lg mb-2 ${
                    selectedProject?.isAllTasks
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-700 border border-purple-200'
                  }`}
                >
                  <div className="font-medium flex items-center gap-2">
                    <Calendar size={16} />
                    All Tasks
                  </div>
                  <div className="text-xs opacity-75">View all projects combined</div>
                </button>
                
                <div className="space-y-2">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={`w-full text-left p-3 rounded-lg ${
                        selectedProject?.id === project.id && !selectedProject?.isAllTasks
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm opacity-75">{project.customer}</div>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center py-4">No projects yet</p>
                  )}
                </div>

                {/* Mobile menu actions */}
                <div className="mt-6 space-y-2 pt-6 border-t">
                  <button
                    onClick={() => {
                      setShowUserManager(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Settings size={20} />
                    Manage Users
                  </button>
                  <button
                    onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    {view === 'calendar' ? <ClipboardList size={20} /> : <Calendar size={20} />}
                    {view === 'calendar' ? 'List View' : 'Calendar View'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showNewProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Address
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Johnson Residence"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCreateProject}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create Project
                  </button>
                  <button
                    onClick={() => {
                      setShowNewProject(false);
                      setNewProjectName('');
                      setNewCustomerName('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showProfileEditor && currentUser && (
          <ProfileEditorModal
            currentUser={currentUser}
            onClose={() => setShowProfileEditor(false)}
            onUpdate={handleUpdateUserProfile}
          />
        )}

        {showUserManager && currentUser?.userType === 'admin' && (
          <UserManagementModal
            allUsers={allUsers}
            onClose={() => setShowUserManager(false)}
            showToast={addToast}
            projects={projects}
          />
        )}

        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* UPDATED: Mobile-responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 print-area">
          {/* Desktop sidebar - hidden on mobile */}
          {currentUser?.userType === 'homeowner' && (
            <div className="hidden lg:block lg:col-span-1 no-print">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Users size={20} />
                  Your Project
                </h3>
                <div className="space-y-2">
                  {projects.length > 0 ? (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="font-medium text-blue-900">{projects[0].name}</div>
                      <div className="text-sm text-blue-700">{projects[0].customer}</div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No project assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentUser?.userType === 'admin' && (
            <div className="hidden lg:block lg:col-span-1 no-print">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Users size={20} />
                  Projects
                </h3>
                
                {/* All Tasks Button */}
                <button
                  onClick={() => setSelectedProject({ id: 'all-tasks', name: 'All Tasks', isAllTasks: true })}
                  className={`w-full text-left p-3 rounded-lg transition-colors mb-2 ${
                    selectedProject?.isAllTasks
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-700 hover:from-purple-100 hover:to-blue-100 border border-purple-200'
                  }`}
                >
                  <div className="font-medium flex items-center gap-2">
                    <Calendar size={16} />
                    All Tasks
                  </div>
                  <div className="text-xs opacity-75">View all projects combined</div>
                </button>
                
                <div className="space-y-2">
                  {projects.map(project => (
                    <div key={project.id} className="relative group">
                      <button
                        onClick={() => setSelectedProject(project)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedProject?.id === project.id && !selectedProject?.isAllTasks
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm opacity-75">{project.customer}</div>
                      </button>
                      {currentUser?.userType === 'admin' && (
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="absolute top-2 right-2 p-1 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-opacity"
                          title="Delete project"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-gray-500 text-sm italic">No projects yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main content - full width on mobile */}
          <div className={`${currentUser?.userType === 'crew' ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
            {selectedProject || currentUser?.userType === 'crew' || currentUser?.userType === 'homeowner' ? (
              <div>
                {/* Mobile project header */}
                {selectedProject && currentUser?.userType !== 'crew' && currentUser?.userType !== 'homeowner' && (
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4 no-print">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">{selectedProject.name}</h2>
                    <p className="text-sm md:text-base text-gray-600">{selectedProject.customer}</p>
                  </div>
                )}
                {currentUser?.userType === 'homeowner' && projects.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4 no-print lg:hidden">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">{projects[0].name}</h2>
                    <p className="text-sm md:text-base text-gray-600">{projects[0].customer}</p>
                  </div>
                )}
                {renderMainContent()}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 text-center">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                  Select or Create a Project
                </h3>
                <p className="text-sm md:text-base text-gray-500">
                  Choose a project from the list or create a new one to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}