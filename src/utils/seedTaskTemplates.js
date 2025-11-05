// src/utils/seedTaskTemplates.js
// Run this ONCE to populate your Firebase with initial task templates

import { collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';

const INITIAL_TEMPLATES = [
  // Prep Tasks
  { name: 'Powerwash', category: 'Prep', order: 1, estimatedDuration: 4, active: true },
  { name: 'Scrape', category: 'Prep', order: 2, estimatedDuration: 6, active: true },
  { name: 'Scrape, Sand & Prime', category: 'Prep', order: 3, estimatedDuration: 8, active: true },
  { name: 'Prime', category: 'Prep', order: 4, estimatedDuration: 4, active: true },
  { name: 'Caulk', category: 'Prep', order: 5, estimatedDuration: 3, active: true },
  
  // Paint Areas
  { name: 'Siding', category: 'Paint', order: 1, estimatedDuration: 8, active: true },
  { name: 'Eaves', category: 'Paint', order: 2, estimatedDuration: 3, active: true },
  { name: 'Facia', category: 'Paint', order: 3, estimatedDuration: 2, active: true },
  { name: 'Gutters', category: 'Paint', order: 4, estimatedDuration: 2, active: true },
  { name: 'Downspouts', category: 'Paint', order: 5, estimatedDuration: 1, active: true },
  { name: 'Windows', category: 'Paint', order: 6, estimatedDuration: 4, active: true },
  { name: 'Foundation', category: 'Paint', order: 7, estimatedDuration: 2, active: true },
  { name: 'Stairs', category: 'Paint', order: 8, estimatedDuration: 2, active: true },
  { name: 'Deck', category: 'Paint', order: 9, estimatedDuration: 6, active: true },
  { name: 'Fence', category: 'Paint', order: 10, estimatedDuration: 8, active: true },
  { name: 'Pergola', category: 'Paint', order: 11, estimatedDuration: 3, active: true },
  { name: 'Other', category: 'Paint', order: 12, estimatedDuration: 2, active: true },
  
  // Final Walkthrough
  { name: 'Final Walkthrough', category: 'Final Walkthrough', order: 1, estimatedDuration: 1, active: true },
  { name: 'Touch-ups', category: 'Final Walkthrough', order: 2, estimatedDuration: 2, active: true },
  { name: 'Cleanup', category: 'Final Walkthrough', order: 3, estimatedDuration: 1, active: true },
];

export async function seedTaskTemplates() {
  try {
    // Check if templates already exist
    const templatesQuery = query(collection(db, 'task_templates'));
    const existingTemplates = await getDocs(templatesQuery);
    
    if (!existingTemplates.empty) {
      console.log('Task templates already exist. Skipping seed.');
      return { success: true, message: 'Templates already exist' };
    }

    // Add all templates
    const promises = INITIAL_TEMPLATES.map(template => 
      addDoc(collection(db, 'task_templates'), {
        ...template,
        createdAt: serverTimestamp()
      })
    );

    await Promise.all(promises);
    
    console.log(`Successfully seeded ${INITIAL_TEMPLATES.length} task templates!`);
    return { success: true, message: `Seeded ${INITIAL_TEMPLATES.length} templates` };
  } catch (error) {
    console.error('Error seeding task templates:', error);
    return { success: false, error: error.message };
  }
}

// Alternative: Seed specific templates if you want to add more later
export async function addCustomTemplate(templateData) {
  try {
    const docRef = await addDoc(collection(db, 'task_templates'), {
      ...templateData,
      active: true,
      createdAt: serverTimestamp()
    });
    
    console.log('Template added with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding template:', error);
    return { success: false, error: error.message };
  }
}