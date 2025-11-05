// src/components/modals/NoWorkDaysModal.jsx
import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';

export default function NoWorkDaysModal({ 
  noWorkDays, 
  onClose, 
  onAddNoWorkDay, 
  onDeleteNoWorkDay,
  showToast 
}) {
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newDate) {
      if (showToast) showToast('Please select a date', 'error');
      return;
    }

    // Check if date already exists
    if (noWorkDays.some(nwd => nwd.date === newDate)) {
      if (showToast) showToast('This date is already marked as a no-work day', 'error');
      return;
    }

    setAdding(true);
    try {
      await onAddNoWorkDay(newDate, newReason.trim() || 'No Work');
      setNewDate('');
      setNewReason('');
      if (showToast) showToast('No-work day added successfully!', 'success');
    } catch (error) {
      console.error('Error adding no-work day:', error);
      if (showToast) showToast('Error adding no-work day', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await onDeleteNoWorkDay(id);
      if (showToast) showToast('No-work day removed', 'success');
    } catch (error) {
      console.error('Error deleting no-work day:', error);
      if (showToast) showToast('Error removing no-work day', 'error');
    }
  };

  // Sort no work days by date
  const sortedNoWorkDays = [...noWorkDays].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  // Group by upcoming vs past
  const today = new Date().toISOString().split('T')[0];
  const upcomingDays = sortedNoWorkDays.filter(nwd => nwd.date >= today);
  const pastDays = sortedNoWorkDays.filter(nwd => nwd.date < today);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={24} className="text-red-600" />
            <h2 className="text-xl font-bold">Manage No-Work Days</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Mark days when no work will be scheduled (holidays, weather days, etc.)
        </p>

        {/* Add New No-Work Day */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-sm">Add No-Work Day</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              min={new Date().toISOString().split('T')[0]}
            />
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Reason (optional)"
              className="border border-gray-300 rounded-lg px-3 py-2"
              maxLength={50}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newDate}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              {adding ? 'Adding...' : 'Add Day'}
            </button>
          </div>
        </div>

        {/* Upcoming No-Work Days */}
        {upcomingDays.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-gray-700">
              Upcoming ({upcomingDays.length})
            </h3>
            <div className="space-y-2">
              {upcomingDays.map(nwd => (
                <div
                  key={nwd.id}
                  className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(nwd.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    {nwd.reason && (
                      <div className="text-sm text-gray-600 mt-1">{nwd.reason}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(nwd.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past No-Work Days */}
        {pastDays.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm text-gray-700">
              Past ({pastDays.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pastDays.map(nwd => (
                <div
                  key={nwd.id}
                  className="flex items-center justify-between p-3 border border-gray-200 bg-gray-50 rounded-lg opacity-60"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(nwd.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {nwd.reason && (
                      <div className="text-sm text-gray-600 mt-1">{nwd.reason}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(nwd.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {noWorkDays.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No blocked days yet</p>
            <p className="text-xs mt-1">Add days when work should not be scheduled</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}