// Admin Dashboard Modules
// Contains functionality for various dashboard sections

// Modules for the Admin Dashboard
// Each module handles a specific section of functionality

// Firebase was already initialized in firebase-config.js
// No need to reinitialize here

// Get Firebase services
// These variables are already declared in firebase-config.js
// Do not redeclare them here

// Ensure Firebase is initialized and storage is available
if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK not loaded!');
}
const storage = firebase.storage();

// Appointments Module
const appointmentsModule = {
    // Get all appointments with optional status filter
    async getAllAppointments(status = null) {
        try {
            let query = db.collection('appointments');
            
            if (status) {
                query = query.where('status', '==', status);
            }
            
            const snapshot = await query.orderBy('appointmentDate', 'desc').get();
            
            const appointments = [];
            snapshot.forEach(doc => {
                appointments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return appointments;
        } catch (error) {
            console.error('Error getting appointments:', error);
            throw error;
        }
    },
    
    // Get appointment by ID
    async getAppointment(appointmentId) {
        try {
            const doc = await db.collection('appointments').doc(appointmentId).get();
            
            if (!doc.exists) {
                throw new Error('Appointment not found');
            }
            
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Error getting appointment:', error);
            throw error;
        }
    },
    
    // Create a new appointment
    async createAppointment(appointmentData) {
        try {
            const docRef = await db.collection('appointments').add({
                ...appointmentData,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid
            });
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating appointment:', error);
            throw error;
        }
    },
    
    // Update an appointment
    async updateAppointment(appointmentId, appointmentData) {
        try {
            await db.collection('appointments').doc(appointmentId).update({
                ...appointmentData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser.uid
            });
            
            return true;
        } catch (error) {
            console.error('Error updating appointment:', error);
            throw error;
        }
    },
    
    // Delete an appointment
    async deleteAppointment(appointmentId) {
        try {
            await db.collection('appointments').doc(appointmentId).delete();
            return true;
        } catch (error) {
            console.error('Error deleting appointment:', error);
            throw error;
        }
    },
    
    // Cancel an appointment
    async cancelAppointment(appointmentId, cancelReason) {
        try {
            await db.collection('appointments').doc(appointmentId).update({
                status: 'cancelled',
                cancelReason: cancelReason || 'Cancelled by administrator',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser.uid
            });
            
            return true;
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            throw error;
        }
    },
    
    // Get appointment count by status
    async getAppointmentCount(status = null) {
        try {
            let query = db.collection('appointments');
            
            if (status) {
                query = query.where('status', '==', status);
            }
            
            const snapshot = await query.get();
            return snapshot.size;
        } catch (error) {
            console.error('Error getting appointment count:', error);
            throw error;
        }
    },
    
    // Get today's appointment count
    async getTodayAppointmentCount() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const snapshot = await db.collection('appointments')
                .where('appointmentDate', '>=', today)
                .where('appointmentDate', '<', tomorrow)
                .get();
            
            return snapshot.size;
        } catch (error) {
            console.error('Error getting today\'s appointment count:', error);
            throw error;
        }
    }
};

// Settings Module
const settingsModule = {
    // Get general settings
    async getGeneralSettings() {
        try {
            const doc = await db.collection('settings').doc('general').get();
            
            if (!doc.exists) {
                // Create default settings if they don't exist
                const defaultSettings = {
                    schoolName: 'School Name',
                    systemName: 'Guidance Management System',
                    contactEmail: 'contact@example.com',
                    themeColor: '#4a6baf',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser.uid
                };
                
                await db.collection('settings').doc('general').set(defaultSettings);
                
                return defaultSettings;
            }
            
            return doc.data();
        } catch (error) {
            console.error('Error getting general settings:', error);
            throw error;
        }
    },
    
    // Update general settings
    async updateGeneralSettings(settings) {
        try {
            await db.collection('settings').doc('general').update(settings);
            return true;
        } catch (error) {
            // If document doesn't exist, create it
            if (error.code === 'not-found') {
                await db.collection('settings').doc('general').set(settings);
                return true;
            }
            
            console.error('Error updating general settings:', error);
            throw error;
        }
    },
    
    // Get appointment settings
    async getAppointmentSettings() {
        try {
            const doc = await db.collection('settings').doc('appointments').get();
            
            if (!doc.exists) {
                // Create default settings if they don't exist
                const defaultSettings = {
                    minNoticeHours: 24,
                    maxAppointmentDuration: 60,
                    workingHoursStart: '08:00',
                    workingHoursEnd: '17:00',
                    allowWeekends: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser.uid
                };
                
                await db.collection('settings').doc('appointments').set(defaultSettings);
                
                return defaultSettings;
            }
            
            return doc.data();
        } catch (error) {
            console.error('Error getting appointment settings:', error);
            throw error;
        }
    },
    
    // Update appointment settings
    async updateAppointmentSettings(settings) {
        try {
            await db.collection('settings').doc('appointments').update(settings);
            return true;
        } catch (error) {
            // If document doesn't exist, create it
            if (error.code === 'not-found') {
                await db.collection('settings').doc('appointments').set(settings);
                return true;
            }
            
            console.error('Error updating appointment settings:', error);
            throw error;
        }
    },
    
    // Get resource categories
    async getResourceCategories() {
        try {
            const snapshot = await db.collection('resourceCategories').orderBy('name').get();
            
            const categories = [];
            snapshot.forEach(doc => {
                categories.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return categories;
        } catch (error) {
            console.error('Error getting resource categories:', error);
            throw error;
        }
    },
    
    // Add a resource category
    async addResourceCategory(categoryData) {
        try {
            const docRef = await db.collection('resourceCategories').add(categoryData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding resource category:', error);
            throw error;
        }
    },
    
    // Update a resource category
    async updateResourceCategory(categoryId, categoryData) {
        try {
            await db.collection('resourceCategories').doc(categoryId).update(categoryData);
            return true;
        } catch (error) {
            console.error('Error updating resource category:', error);
            throw error;
        }
    },
    
    // Delete a resource category
    async deleteResourceCategory(categoryId) {
        try {
            // Delete the category
            await db.collection('resourceCategories').doc(categoryId).delete();
            
            // Update resources in this category to "Uncategorized"
            const uncategorizedQuery = await db.collection('resourceCategories')
                .where('name', '==', 'Uncategorized')
                .limit(1)
                .get();
            
            let uncategorizedId;
            
            if (uncategorizedQuery.empty) {
                // Create "Uncategorized" category if it doesn't exist
                const docRef = await db.collection('resourceCategories').add({
                    name: 'Uncategorized',
                    description: 'Resources with no specific category',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser.uid
                });
                
                uncategorizedId = docRef.id;
            } else {
                uncategorizedId = uncategorizedQuery.docs[0].id;
            }
            
            // Update resources in batch
            const resourcesQuery = await db.collection('resources')
                .where('category', '==', categoryId)
                .get();
            
            const batch = db.batch();
            
            resourcesQuery.forEach(doc => {
                batch.update(doc.ref, { category: uncategorizedId });
            });
            
            await batch.commit();
            
            return true;
        } catch (error) {
            console.error('Error deleting resource category:', error);
            throw error;
        }
    }
};

// Export modules for use in other files
// In a real app, you'd use ES6 modules or CommonJS
// For simplicity in this demo, we're attaching to window
window.auth = auth;
window.db = db;
window.storage = storage;
window.appointmentsModule = appointmentsModule;
window.settingsModule = settingsModule; 