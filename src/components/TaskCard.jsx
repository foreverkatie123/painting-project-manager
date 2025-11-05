// src/components/TaskCard.jsx
import React, { useState, useEffect } from 'react';
import { MessageSquare, Edit2, Trash2, Save, X, FileText, Clock } from 'lucide-react';

export default function TaskCard({ 
  task, 
  currentUser, 
  crewMembers, 
  taskTemplates,
  editingTask,
  setEditingTask,
  updateTask, 
  deleteTask, 
  addNote,
  readOnly = false 
}) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [customName, setCustomName] = useState(task.customFields?.customName || task.name);
  const [jobDetails, setJobDetails] = useState(task.jobDetails || '');
  const [showJobDetails, setShowJobDetails] = useState(false);
  const isEditing = editingTask === task.id;

  useEffect(() => {
    setCustomName(task.customFields?.customName || task.name);
  }, [task.customFields?.customName, task.name]);

  useEffect(() => {
    setJobDetails(task.jobDetails || '');
  }, [task.jobDetails]);

  const statusColors = {
    pending: 'bg-gray-200 text-gray-700',
    'in-progress': 'bg-blue-200 text-blue-700',
    completed: 'bg-green-200 text-green-700'
  };

  const handleAddNote = async () => {
    await addNote(task.id, noteText);
    setNoteText('');
    setShowNoteInput(false);
  };

  const toggleAssignment = async (crew) => {
    const assigned = task.assignedTo && task.assignedTo.includes(crew);
    const newAssigned = assigned
      ? task.assignedTo.filter(c => c !== crew)
      : [...(task.assignedTo || []), crew];
    
    await updateTask(task.id, { assignedTo: newAssigned });
  };

  const handleSaveCustomName = () => {
    if (task.name === 'Other' && customName.trim()) {
      updateTask(task.id, { 
        name: customName,
        customFields: { ...task.customFields, customName }
      });
    }
    setEditingTask(null);
  };

  const handleSaveJobDetails = async () => {
    await updateTask(task.id, { jobDetails });
    setShowJobDetails(false);
  };

  const canEdit = currentUser?.userType === 'admin' || currentUser?.userType === 'crew';

  // Format the last updated timestamp
  const formatLastUpdated = () => {
    if (!task.lastUpdatedAt) return null;
    
    try {
      // Handle Firestore Timestamp object
      const timestamp = task.lastUpdatedAt.toDate ? task.lastUpdatedAt.toDate() : new Date(task.lastUpdatedAt);
      const now = new Date();
      const diffMs = now - timestamp;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return timestamp.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return null;
    }
  };

  const lastUpdatedText = formatLastUpdated();

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {isEditing && task.templateId && taskTemplates.find(t => t.id === task.templateId)?.name === 'Other' ? (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter custom task name"
              className="border border-gray-300 rounded px-2 py-1 w-full mb-2"
            />
          ) : (
            <h4 className="font-semibold text-gray-900">{task.name}</h4>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[task.status]}`}>
              {task.status.replace('-', ' ')}
            </span>
            <span className="text-xs text-gray-500">
              {task.startDate} → {task.dueDate}
            </span>
            {task.estimatedDuration && (
              <span className="text-xs text-gray-500">Est: {task.estimatedDuration}h</span>
            )}
          </div>
          
          {/* Last Updated Info */}
          {lastUpdatedText && task.lastUpdatedBy && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <Clock size={12} />
              <span>
                Updated {lastUpdatedText} by {task.lastUpdatedBy}
              </span>
            </div>
          )}
        </div>
        {!readOnly && canEdit && (
          <div className="flex gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveCustomName}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => setEditingTask(null)}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                {task.templateId && taskTemplates.find(t => t.id === task.templateId)?.name === 'Other' && (
                  <button
                    onClick={() => {
                      setEditingTask(task.id);
                      setCustomName(task.name);
                    }}
                    className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                {currentUser?.userType === 'admin' && (
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!readOnly && canEdit && (
        <>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={task.status}
              onChange={async (e) => {
                await updateTask(task.id, { status: e.target.value });
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {currentUser?.userType === 'admin' && (
            <div className="mb-3 relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full text-left bg-white"
              >
                {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.join(', ') : 'Assign crew members...'}
              </button>
              {showAssignMenu && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                  {crewMembers.map(crew => (
                    <label key={crew.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.assignedTo && task.assignedTo.includes(crew.displayName)}
                        onChange={() => toggleAssignment(crew.displayName)}
                        className="mr-2"
                      />
                      <span className="text-sm">{crew.displayName}</span>
                    </label>
                  ))}
                  {crewMembers.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No crew members available</div>
                  )}
                  <button
                    onClick={() => setShowAssignMenu(false)}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border-t"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={task.startDate}
                onChange={async (e) => {
                  await updateTask(task.id, { startDate: e.target.value });
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={task.dueDate}
                onChange={async (e) => {
                  await updateTask(task.id, { dueDate: e.target.value });
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
              />
            </div>
          </div>

          <div className="border-t pt-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <FileText size={14} />
                Job Details
              </label>
              <button
                onClick={() => setShowJobDetails(!showJobDetails)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showJobDetails ? 'Hide' : 'Edit'}
              </button>
            </div>
            
            {showJobDetails && (
              <div className="mb-2">
                <textarea
                  value={jobDetails}
                  onChange={(e) => setJobDetails(e.target.value)}
                  placeholder="Paint colors, surface prep details, special instructions..."
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full h-20"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleSaveJobDetails}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Save Details
                  </button>
                  <button
                    onClick={() => {
                      setShowJobDetails(false);
                      setJobDetails(task.jobDetails || '');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {task.jobDetails && !showJobDetails && (
              <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">
                {task.jobDetails}
              </div>
            )}
          </div>
        </>
      )}
      
      {!readOnly && canEdit && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <MessageSquare size={14} />
              Communication Notes ({(task.notes || []).length})
            </label>
            {canEdit && (
              <button
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Add Note
              </button>
            )}
          </div>
          
          {showNoteInput && canEdit && (
            <div className="mb-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add progress update or communication..."
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full h-20"
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleAddNote}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Save Note
                </button>
                <button
                  onClick={() => {
                    setShowNoteInput(false);
                    setNoteText('');
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(task.notes || []).map(note => (
              <div key={note.id} className="bg-gray-50 rounded p-2 text-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium">{note.author}</span>
                  <span>{note.date}</span>
                </div>
                <p className="text-gray-700">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}