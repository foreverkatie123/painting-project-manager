// src/components/modals/UserManagementModal.jsx
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { db } from '../../firebase';
import { adminAuth } from '../../firebase.js';
import { collection, addDoc, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export default function UserManagementModal({ allUsers, onClose, showToast, projects }) {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserType, setNewUserType] = useState('crew');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserProject, setNewUserProject] = useState('');
  const [updatingUsers, setUpdatingUsers] = useState(new Set());
  const [creating, setCreating] = useState(false);

  const addUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword.trim()) {
      if (showToast) showToast('Email, name, and password are required', 'error');
      return;
    }

    if (newUserPassword.length < 6) {
      if (showToast) showToast('Password must be at least 6 characters', 'error');
      return;
    }

    // Check if homeowner needs a project
    if (newUserType === 'homeowner' && !newUserProject) {
      if (showToast) showToast('Homeowners must be assigned to a project', 'error');
      return;
    }
    
    setCreating(true);
    try {
      // Create Firebase Auth user using secondary auth instance
      const userCredential = await createUserWithEmailAndPassword(
        adminAuth, 
        newUserEmail.trim(), 
        newUserPassword.trim()
      );
      
      // Create Firestore user document with projectId for homeowners
      const userData = {
        email: newUserEmail.trim(),
        displayName: newUserName.trim(),
        userType: newUserType,
        role: newUserRole.trim() || (newUserType === 'crew' ? 'Painter' : ''),
        disabled: false,
        createdAt: serverTimestamp()
      };

      // Add projectId for homeowners
      if (newUserType === 'homeowner' && newUserProject) {
        userData.projectId = newUserProject;
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      // Sign out the newly created user from the secondary instance
      // This prevents the admin from being logged out
      await signOut(adminAuth);

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('');
      setNewUserProject('');
      if (showToast) showToast(`User ${newUserName.trim()} created successfully!`, 'success');
    } catch (error) {
      console.error("Error adding user:", error);
      let errorMessage = 'Error creating user. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      }
      
      if (showToast) showToast(errorMessage, 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleUserDisabled = async (userId, currentDisabled) => {
    setUpdatingUsers(prev => new Set([...prev, userId]));
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        disabled: !currentDisabled,
        updatedAt: serverTimestamp()
      });
      if (showToast) showToast(`User ${!currentDisabled ? 'disabled' : 'enabled'} successfully!`, 'success');
    } catch (error) {
      console.error("Error updating user:", error);
      if (showToast) showToast('Error updating user. Please try again.', 'error');
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const updateUserType = async (userId, userType) => {
    setUpdatingUsers(prev => new Set([...prev, userId]));
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        userType,
        updatedAt: serverTimestamp()
      });
      if (showToast) showToast('User type updated successfully!', 'success');
    } catch (error) {
      console.error("Error updating user:", error);
      if (showToast) showToast('Error updating user. Please try again.', 'error');
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Get project name by ID
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.name} (${project.customer})` : 'Unknown Project';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Manage Users</h2>
          <button onClick={onClose} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Create New User</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Email"
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Display Name"
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="border border-gray-300 rounded-lg px-3 py-2 col-span-2"
            />
            <select
              value={newUserType}
              onChange={(e) => {
                setNewUserType(e.target.value);
                // Clear project selection when changing user type
                if (e.target.value !== 'homeowner') {
                  setNewUserProject('');
                }
              }}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="crew">Crew Member</option>
              <option value="homeowner">Homeowner</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="text"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              placeholder="Role (optional)"
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          {newUserType === "homeowner" && (
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Project <span className="text-red-600">*</span>
              </label>
              <select
                value={newUserProject}
                onChange={(e) => setNewUserProject(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                required
              >
                <option value="">Select a project...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.customer}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Homeowner will only see this project's calendar.
              </div>
            </div>
          )}
          <button
            onClick={addUser}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            {creating ? 'Creating User...' : 'Create User'}
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold mb-2">All Users ({allUsers.length})</h3>
          {allUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{user.displayName}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                {user.role && <div className="text-xs text-gray-500">{user.role}</div>}
                {user.projectId && (
                  <div className="text-xs text-blue-600 mt-1">
                    📍 {getProjectName(user.projectId)}
                  </div>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={user.userType || 'crew'}
                  onChange={(e) => updateUserType(user.id, e.target.value)}
                  disabled={updatingUsers.has(user.id)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50"
                >
                  <option value="admin">Admin</option>
                  <option value="crew">Crew</option>
                  <option value="homeowner">Homeowner</option>
                </select>
                <button
                  onClick={() => toggleUserDisabled(user.id, user.disabled)}
                  disabled={updatingUsers.has(user.id)}
                  className={`px-3 py-1 text-xs rounded disabled:opacity-50 ${
                    user.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {updatingUsers.has(user.id) ? '...' : user.disabled ? 'Disabled' : 'Active'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
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