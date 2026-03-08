/**
 * Student Dashboard Modules
 * Utility functions for Firebase interactions
 */

// Firebase services are already initialized in firebase-config.js

/**
 * User Profile Module
 * Handles student profile operations
 */
const UserProfile = (function() {
    // Private variables
    let currentUser = null;
    let userData = null;
    
    // Initialize user profile
    const init = async function() {
        try {
            // Wait for Firebase Auth to initialize
            console.log("Waiting for auth to initialize...");
            
            // Check if the user is logged in
            currentUser = auth.currentUser;
            
            if (!currentUser) {
                console.error("No user is logged in");
                
                // Add a debug message on the page
                const debugElement = document.createElement('div');
                debugElement.style.cssText = 'position: fixed; top: 0; left: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-family: monospace;';
                debugElement.innerHTML = 'Authentication Error: No user is logged in. Redirecting to login...';
                document.body.appendChild(debugElement);
                
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 2000);
                
                return null;
            }
            
            console.log(`User is logged in: ${currentUser.email}`);
            
            // Get user data from Firestore
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            
            if (!userDoc.exists) {
                console.error('User document does not exist in Firestore');
                
                // Add a debug message
                const debugElement = document.createElement('div');
                debugElement.style.cssText = 'position: fixed; top: 0; left: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-family: monospace;';
                debugElement.innerHTML = 'Authentication Error: User document not found in database. Redirecting to login...';
                document.body.appendChild(debugElement);
                
                // Sign out and redirect
                auth.signOut().then(() => {
                    setTimeout(() => {
                        window.location.href = '../../index.html';
                    }, 2000);
                });
                
                return null;
            }
            
            userData = userDoc.data();
            console.log(`User role: ${userData.role}`);
            
            // Check if the user is a student
            if (userData.role !== 'student') {
                console.error(`Unauthorized access - user is a ${userData.role}, not a student`);
                
                // Add a debug message
                const debugElement = document.createElement('div');
                debugElement.style.cssText = 'position: fixed; top: 0; left: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-family: monospace;';
                debugElement.innerHTML = `Authentication Error: You are logged in as a ${userData.role}, not a student. Redirecting...`;
                document.body.appendChild(debugElement);
                
                // Redirect to the appropriate dashboard
                setTimeout(() => {
                    switch (userData.role) {
                        case 'admin':
                            window.location.href = '../admin/index.html';
                            break;
                        case 'counselor':
                            window.location.href = '../counselor/index.html';
                            break;
                        default:
                            window.location.href = '../../index.html';
                    }
                }, 2000);
                
                return null;
            }
            
            // Get additional student data if it exists
            const studentDoc = await db.collection('students').doc(currentUser.uid).get();
            
            if (studentDoc.exists) {
                userData = { ...userData, ...studentDoc.data() };
            }
            
            console.log("Student authentication successful");
            return userData;
        } catch (error) {
            console.error('Error initializing user profile:', error);
            
            // Add a debug message
            const debugElement = document.createElement('div');
            debugElement.style.cssText = 'position: fixed; top: 0; left: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-family: monospace;';
            debugElement.innerHTML = `Authentication Error: ${error.message}<br>Redirecting to login...`;
            document.body.appendChild(debugElement);
            
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 3000);
            
            return null;
        }
    };
    
    // Update user profile
    const updateProfile = async function(profileData) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.error('[updateProfile] No currentUser');
                return false;
            }
            console.log('[updateProfile] Updating users collection for uid:', currentUser.uid, 'with', { name: profileData.name });
            await db.collection('users').doc(currentUser.uid).update({
                name: profileData.name
            });
            console.log('[updateProfile] Updated users collection');
            // Prepare only defined fields for students collection
            const studentUpdate = { name: profileData.name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            if (profileData.program !== undefined) studentUpdate.program = profileData.program;
            if (profileData.year !== undefined) studentUpdate.year = profileData.year;
            if (profileData.contactNumber !== undefined) studentUpdate.contactNumber = profileData.contactNumber;
            console.log('[updateProfile] Updating students collection for uid:', currentUser.uid, 'with', studentUpdate);
            await db.collection('students').doc(currentUser.uid).set(studentUpdate, { merge: true });
            console.log('[updateProfile] Updated students collection');
            userData = { ...userData, ...profileData };
            console.log('[updateProfile] Updating Firebase Auth displayName:', profileData.name);
            await currentUser.updateProfile({
                displayName: profileData.name
            });
            console.log('[updateProfile] Updated Firebase Auth displayName');
            await ActivityLogger.log('profile_updated', 'Updated profile information');
            console.log('[updateProfile] Logged activity');
            return true;
        } catch (error) {
            console.error('[updateProfile] Error updating profile:', error, error && error.stack ? error.stack : '');
            return false;
        }
    };
    
    // Change user password
    const changePassword = async function(currentPassword, newPassword) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) return false;
            // Reauthenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                currentUser.email, 
                currentPassword
            );
            await currentUser.reauthenticateWithCredential(credential);
            // Update password
            await currentUser.updatePassword(newPassword);
            // Log activity
            await ActivityLogger.log('password_changed', 'Changed account password');
            return true;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    };
    
    // Upload profile picture
    const uploadProfilePicture = async function(file) {
        try {
            if (!currentUser || !file) return null;
            
            // Create storage reference
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`profile_pictures/${currentUser.uid}`);
            
            // Upload file
            await fileRef.put(file);
            
            // Get download URL
            const downloadURL = await fileRef.getDownloadURL();
            
            // Update user profile
            await currentUser.updateProfile({
                photoURL: downloadURL
            });
            
            // Update Firestore user document
            await db.collection('users').doc(currentUser.uid).update({
                photoURL: downloadURL
            });
            
            // Update students collection
            await db.collection('students').doc(currentUser.uid).update({
                photoURL: downloadURL
            });
            
            // Log activity
            await ActivityLogger.log('profile_picture_updated', 'Updated profile picture');
            
            return downloadURL;
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            // Show error in UI if possible
            const errorDiv = document.getElementById('profileMsg');
            if (errorDiv) {
                errorDiv.style.color = '#e74c3c';
                errorDiv.textContent = 'Failed to upload profile picture: ' + (error && error.message ? error.message : error);
            }
            return null;
        }
    };
    
    // Get user data
    const getUserData = function() {
        return userData;
    };
    
    // Get current user
    const getCurrentUser = function() {
        return currentUser;
    };
    
    // Handle sign out
    const signOut = async function() {
        try {
            await auth.signOut();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };
    
    // Public API
    return {
        init,
        updateProfile,
        changePassword,
        uploadProfilePicture,
        getUserData,
        getCurrentUser,
        signOut
    };
})();

/**
 * Appointments Module
 * Handles student appointment operations
 */
const Appointments = (function() {
    // Get upcoming appointments
    const getUpcomingAppointments = async function() {
        try {
            const user = auth.currentUser;
            if (!user) return [];
            
            const now = new Date();
            
            const snapshot = await db.collection('appointments')
                .where('studentId', '==', user.uid)
                .where('status', 'in', ['pending', 'confirmed'])
                .where('appointmentDate', '>=', now)
                .orderBy('appointmentDate')
                .get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting upcoming appointments:', error);
            return [];
        }
    };
    
    // Get past appointments
    const getPastAppointments = async function() {
        try {
            const user = auth.currentUser;
            if (!user) return [];
            
            const now = new Date();
            
            const snapshot = await db.collection('appointments')
                .where('studentId', '==', user.uid)
                .where('status', 'in', ['completed'])
                .where('appointmentDate', '<', now)
                .orderBy('appointmentDate', 'desc')
                .limit(20)
                .get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting past appointments:', error);
            return [];
        }
    };
    
    // Get cancelled appointments
    const getCancelledAppointments = async function() {
        try {
            const user = auth.currentUser;
            if (!user) return [];
            
            const snapshot = await db.collection('appointments')
                .where('studentId', '==', user.uid)
                .where('status', '==', 'cancelled')
                .orderBy('appointmentDate', 'desc')
                .limit(10)
                .get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting cancelled appointments:', error);
            return [];
        }
    };
    
    // Create appointment
    const createAppointment = async function(appointmentData) {
        try {
            const user = auth.currentUser;
            if (!user) return null;
            
            // Get user data
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            // Create ISO date string from date and time
            const dateTime = new Date(`${appointmentData.date}T${appointmentData.time}`);
            
            // Create appointment document
            const appointmentRef = await db.collection('appointments').add({
                studentId: user.uid,
                studentName: userData.name,
                counselorId: appointmentData.counselorId,
                counselorName: appointmentData.counselorName,
                appointmentDate: dateTime,
                reason: appointmentData.reason,
                notes: appointmentData.notes || '',
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Log activity
            await ActivityLogger.log('appointment_created', `Requested appointment with ${appointmentData.counselorName}`);
            
            // Notify counselor
            await createNotification({
                toUid: appointmentData.counselorId,
                message: `New appointment request from ${userData.name} for ${appointmentData.date} ${appointmentData.time}.`,
                type: 'appointment',
                link: '',
            });
            
            return appointmentRef.id;
        } catch (error) {
            console.error('Error creating appointment:', error);
            return null;
        }
    };
    
    // Cancel appointment
    const cancelAppointment = async function(appointmentId) {
        try {
            const user = auth.currentUser;
            if (!user) return false;
            
            // Get appointment data
            const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
            
            if (!appointmentDoc.exists) {
                throw new Error('Appointment not found');
            }
            
            const appointmentData = appointmentDoc.data();
            
            // Check if this appointment belongs to the user
            if (appointmentData.studentId !== user.uid) {
                throw new Error('Unauthorized access to appointment');
            }
            
            // Check if the appointment can be cancelled
            if (appointmentData.status !== 'pending' && appointmentData.status !== 'confirmed') {
                throw new Error('Only pending or confirmed appointments can be cancelled');
            }
            
            // Update appointment status
            await db.collection('appointments').doc(appointmentId).update({
                status: 'cancelled',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Log activity
            await ActivityLogger.log('appointment_cancelled', `Cancelled appointment with ${appointmentData.counselorName}`);
            
            return true;
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            return false;
        }
    };
    
    // Get all counselors
    const getCounselors = async function() {
        try {
            const snapshot = await db.collection('users')
                .where('role', '==', 'counselor')
                .get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting counselors:', error);
            return [];
        }
    };
    
    // Public API
    return {
        getUpcomingAppointments,
        getPastAppointments,
        getCancelledAppointments,
        createAppointment,
        cancelAppointment,
        getCounselors
    };
})();

/**
 * Resources Module
 * Handles student resource operations
 */
const Resources = (function() {
    // Get all resources
    const getAllResources = async function() {
        try {
            const snapshot = await db.collection('resources')
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting resources:', error);
            return [];
        }
    };
    
    // Get resources by category
    const getResourcesByCategory = async function(category) {
        try {
            const snapshot = await db.collection('resources')
                .where('category', '==', category)
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting resources by category:', error);
            return [];
        }
    };
    
    // Get recent resources
    const getRecentResources = async function(limit = 3) {
        try {
            const snapshot = await db.collection('resources')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting recent resources:', error);
            return [];
        }
    };
    
    // Get resource categories
    const getResourceCategories = async function() {
        try {
            const snapshot = await db.collection('categories').get();
            
            return snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
        } catch (error) {
            console.error('Error getting resource categories:', error);
            return [];
        }
    };
    
    // Download resource file
    const downloadResource = async function(resourceId) {
        try {
            const resourceDoc = await db.collection('resources').doc(resourceId).get();
            
            if (!resourceDoc.exists) {
                throw new Error('Resource not found');
            }
            
            const resourceData = resourceDoc.data();
            
            if (!resourceData.fileURL) {
                throw new Error('No file available for this resource');
            }
            
            // Log activity
            await ActivityLogger.log('resource_downloaded', `Downloaded resource: ${resourceData.title}`);
            
            return resourceData.fileURL;
        } catch (error) {
            console.error('Error downloading resource:', error);
            return null;
        }
    };
    
    // Get resource by ID
    const getResourceById = async function(resourceId) {
        try {
            const resourceDoc = await db.collection('resources').doc(resourceId).get();
            
            if (!resourceDoc.exists) {
                throw new Error('Resource not found');
            }
            
            return { id: resourceDoc.id, ...resourceDoc.data() };
        } catch (error) {
            console.error('Error getting resource by ID:', error);
            return null;
        }
    };
    
    // Public API
    return {
        getAllResources,
        getResourcesByCategory,
        getRecentResources,
        getResourceCategories,
        downloadResource,
        getResourceById
    };
})();

/**
 * Activity Logger Module
 * Handles logging user activities
 */
const ActivityLogger = (function() {
    // Log activity
    const log = async function(action, description) {
        try {
            const user = auth.currentUser;
            if (!user) return false;
            
            await db.collection('activity').add({
                userId: user.uid,
                userName: user.displayName || '',
                userEmail: user.email,
                userRole: 'student',
                action,
                description,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error logging activity:', error);
            return false;
        }
    };
    
    // Public API
    return {
        log
    };
})();

// Notification helper (if not present)
async function createNotification({ toUid, message, type = 'status', link = '', extra = {} }) {
    try {
        await db.collection('notifications').add({
            toUid,
            message,
            type,
            link: link || '',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            ...extra
        });
    } catch (err) {
        console.error('Error creating notification:', err);
    }
} 