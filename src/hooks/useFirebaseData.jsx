// src/hooks/useFirebaseData.js
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  getDocs,
  setDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// ---------- USER HOOKS ----------

export const useUserProfile = (user, onLogout) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() });
      } else {
        // User authenticated but no Firestore profile exists
        // Check if they're in pending_users
        try {
          const pendingQuery = query(
            collection(db, 'pending_users'),
            where('email', '==', user.email)
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          
          if (!pendingSnapshot.empty) {
            // Create user from pending_users data
            const pendingData = pendingSnapshot.docs[0].data();
            await setDoc(ref, {
              email: user.email,
              displayName: pendingData.displayName || user.displayName || user.email,
              userType: pendingData.userType || 'crew',
              role: pendingData.role || '',
              disabled: false,
              createdAt: serverTimestamp()
            });
            
            // Delete from pending_users
            await deleteDoc(pendingSnapshot.docs[0].ref);
          } else {
            // Create a default crew member profile
            await setDoc(ref, {
              email: user.email,
              displayName: user.displayName || user.email,
              userType: 'crew',
              role: 'Painter',
              disabled: false,
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error creating user profile:", error);
          onLogout();
        }
      }
    });
    return () => unsub();
  }, [user, onLogout]);

  return profile;
};

export const useAllUsers = (currentUser) => {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!currentUser || currentUser.userType !== 'admin') return;
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) =>
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [currentUser]);
  return users;
};

// ---------- CREW HOOKS ----------

export const useCrewMembers = () => {
  const [crew, setCrew] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "users"), where("userType", "==", "crew"));
    const unsub = onSnapshot(q, (snap) =>
      setCrew(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);
  return crew;
};

export const addCrewMember = async (crewData) => {
  await addDoc(collection(db, 'users'), {
    ...crewData,
    createdAt: serverTimestamp(),
  });
};

export const deleteCrewMember = async (crewId) => {
  await deleteDoc(doc(db, 'users', crewId));
};

// ---------- TASK TEMPLATES ----------

export const useTaskTemplates = () => {
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'task_templates'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) =>
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);
  return templates;
};

// ---------- PROJECTS ----------

export const useProjects = (currentUser) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    let q;
    
    // Admin and crew see all projects
    if (currentUser.userType === 'admin' || currentUser.userType === 'crew') {
      q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    } 
    // Homeowners only see their assigned project
    else if (currentUser.userType === 'homeowner' && currentUser.projectId) {
      q = query(
        collection(db, 'projects'),
        where('__name__', '==', currentUser.projectId)
      );
    } else {
      setProjects([]);
      setLoading(false);
      return;
    }
    
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    
    return () => unsub();
  }, [currentUser]);

  return { projects, loading };
};

export const createProject = async (user, currentUser, name, customer) => {
  const ref = await addDoc(collection(db, 'projects'), {
    name,
    customer,
    ownerId: currentUser.id,
    ownerEmail: user.email,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name, customer };
};

export const deleteProject = async (projectId, selectedProject, setSelectedProject) => {
  // Delete the project
  await deleteDoc(doc(db, 'projects', projectId));
  
  // Query and delete all tasks with this projectId
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('projectId', '==', projectId)
  );
  const tasksSnapshot = await getDocs(tasksQuery);
  
  // Delete all matching tasks
  const deletePromises = tasksSnapshot.docs.map(taskDoc => 
    deleteDoc(taskDoc.ref)
  );
  await Promise.all(deletePromises);
  
  if (selectedProject?.id === projectId) setSelectedProject(null);
};

// ---------- TASKS ----------

export const useTasks = (selectedProject, currentUser) => {
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    // For homeowners, filter by their assigned project
    if (currentUser?.userType === 'homeowner' && currentUser.projectId) {
      const q = query(
        collection(db, 'tasks'),
        where('projectId', '==', currentUser.projectId),
        orderBy('startDate')
      );
      
      const unsub = onSnapshot(q, (snap) => {
        const taskList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTasks(taskList);
      }, (error) => {
        console.error("Error fetching homeowner tasks:", error);
      });
      
      return () => unsub();
    }
    
    // Handle "All Tasks" view BEFORE checking if selectedProject exists
    if (selectedProject?.isAllTasks) {
      const q = query(collection(db, 'tasks'));
      
      const unsub = onSnapshot(q, (snap) => {
        const taskList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort by startDate in memory instead of in query
        taskList.sort((a, b) => {
          if (!a.startDate) return 1;
          if (!b.startDate) return -1;
          return a.startDate.localeCompare(b.startDate);
        });
        setTasks(taskList);
      }, (error) => {
        console.error("❌ Error fetching all tasks:", error);
        setTasks([]);
      });
      
      return () => unsub();
    }
    
    // If no project selected, return empty
    if (!selectedProject) {
      setTasks([]);
      return;
    }
    
    // For admin/crew with specific project selected, use selected project
    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', selectedProject.id),
      orderBy('startDate')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const taskList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTasks(taskList);
    }, (error) => {
      console.error("Error fetching project tasks:", error);
    });
    
    return () => unsub();
  }, [selectedProject, currentUser]);
  
  return tasks;
};

export const useCrewTasks = (currentUser) => {
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    if (!currentUser || !currentUser.displayName) {
      setTasks([]); // reset tasks when user logs out or is null
      return;
    }

    const q = query(
        collection(db, 'tasks'),
        where('assignedTo', 'array-contains', currentUser.displayName),
        orderBy('startDate')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const taskList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTasks(taskList);
    }, (error) => {
      console.error("Error fetching tasks:", error);
    });
    
    return () => unsub();
  }, [currentUser]);
  
  return tasks;
};

export const addTaskFromTemplate = async (project, template, currentUser) => {
  await addDoc(collection(db, 'tasks'), {
    projectId: project.id,
    templateId: template.id,
    name: template.name,
    category: template.category || 'Paint',
    status: 'pending',
    assignedTo: [],
    startDate: '',
    dueDate: '',
    estimatedDuration: template.estimatedDuration || null,
    jobDetails: '',
    notes: [],
    createdAt: serverTimestamp(),
    createdBy: currentUser?.displayName || 'Unknown',
    lastUpdatedAt: serverTimestamp(),
    lastUpdatedBy: currentUser?.displayName || 'Unknown'
  });
};

// UPDATED: Now accepts currentUser parameter for tracking
export const updateTask = async (taskId, updates, currentUser) => {
  const ref = doc(db, 'tasks', taskId);
  await updateDoc(ref, {
    ...updates,
    lastUpdatedAt: serverTimestamp(),
    lastUpdatedBy: currentUser?.displayName || 'Unknown'
  });
};

export const deleteTask = async (taskId, selectedTask, setSelectedTask) => {
  await deleteDoc(doc(db, 'tasks', taskId));
  if (selectedTask?.id === taskId) setSelectedTask(null);
};

export const addNote = async (taskId, noteText, currentUser) => {
  try {
    // Make sure we have valid data
    if (!taskId || !noteText) {
      console.error("addNote called without taskId or noteText");
      return;
    }

    // Fetch the task directly from Firestore
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      console.warn(`No task found for id: ${taskId}`);
      return;
    }

    const task = taskSnap.data();

    const newNote = {
      text: noteText,
      author: currentUser?.displayName || "Unknown user",
      date: new Date().toLocaleDateString(),
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };

    const updatedNotes = [...(task.notes || []), newNote];

    // Update Firestore - the snapshot listener will automatically update the UI
    await updateDoc(taskRef, { 
      notes: updatedNotes,
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: currentUser?.displayName || 'Unknown'
    });

    // Return the new note for immediate UI feedback if needed
    return newNote;
  } catch (error) {
    console.error("Error adding note:", error);
    throw error;
  }
};

// ---------- PROFILE ----------

export const updateUserProfile = async (uid, updates, onComplete) => {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, updates);
  if (onComplete) onComplete();
};