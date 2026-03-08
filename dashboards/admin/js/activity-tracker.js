// Activity Tracker Module for Admin Dashboard

// Activity tracker module to track and display system activities
const activityTracker = {
    // Get recent activities
    async getRecentActivities(limit = 10) {
        try {
            const snapshot = await db.collection('activities')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            
            const activities = [];
            snapshot.forEach(doc => {
                activities.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return activities;
        } catch (error) {
            console.error('Error getting recent activities:', error);
            throw error;
        }
    },
    
    // Log an activity
    async logActivity(activityData) {
        try {
            const user = auth.currentUser;
            
            if (!user) {
                throw new Error('Must be logged in to log activities');
            }
            
            const activity = {
                ...activityData,
                userId: user.uid,
                userEmail: user.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection('activities').add(activity);
            return docRef.id;
        } catch (error) {
            console.error('Error logging activity:', error);
            throw error;
        }
    },
    
    // Log a user activity
    async logUserActivity(action, userId, details = {}) {
        try {
            // Get user information
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : { email: 'Unknown user' };
            
            const activityData = {
                type: 'user',
                action,
                targetId: userId,
                targetName: userData.name || userData.email,
                targetType: userData.role || 'user',
                details
            };
            
            return this.logActivity(activityData);
        } catch (error) {
            console.error('Error logging user activity:', error);
            throw error;
        }
    },
    
    // Log an appointment activity
    async logAppointmentActivity(action, appointmentId, details = {}) {
        try {
            // Get appointment information
            const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
            const appointmentData = appointmentDoc.exists ? appointmentDoc.data() : {};
            
            // Get student information
            let studentName = 'Unknown student';
            if (appointmentData.studentId) {
                const studentDoc = await db.collection('users').doc(appointmentData.studentId).get();
                if (studentDoc.exists) {
                    studentName = studentDoc.data().name || studentDoc.data().email;
                }
            }
            
            // Get counselor information
            let counselorName = 'Unknown counselor';
            if (appointmentData.counselorId) {
                const counselorDoc = await db.collection('users').doc(appointmentData.counselorId).get();
                if (counselorDoc.exists) {
                    counselorName = counselorDoc.data().name || counselorDoc.data().email;
                }
            }
            
            const activityData = {
                type: 'appointment',
                action,
                targetId: appointmentId,
                targetName: appointmentData.title || 'Counseling session',
                targetType: appointmentData.status || 'appointment',
                details: {
                    ...details,
                    studentName,
                    counselorName,
                    appointmentDate: appointmentData.date
                }
            };
            
            return this.logActivity(activityData);
        } catch (error) {
            console.error('Error logging appointment activity:', error);
            throw error;
        }
    },
    
    // Log a resource activity
    async logResourceActivity(action, resourceId, details = {}) {
        try {
            // Get resource information
            const resourceDoc = await db.collection('resources').doc(resourceId).get();
            const resourceData = resourceDoc.exists ? resourceDoc.data() : {};
            
            // Get uploader information
            let uploaderName = 'Unknown user';
            if (resourceData.uploadedBy) {
                const uploaderDoc = await db.collection('users').doc(resourceData.uploadedBy).get();
                if (uploaderDoc.exists) {
                    uploaderName = uploaderDoc.data().name || uploaderDoc.data().email;
                }
            }
            
            const activityData = {
                type: 'resource',
                action,
                targetId: resourceId,
                targetName: resourceData.title || 'Resource',
                targetType: resourceData.category || 'resource',
                details: {
                    ...details,
                    uploaderName,
                    fileType: resourceData.fileType,
                    externalUrl: resourceData.externalUrl
                }
            };
            
            return this.logActivity(activityData);
        } catch (error) {
            console.error('Error logging resource activity:', error);
            throw error;
        }
    },
    
    // Log a setting activity
    async logSettingActivity(action, settingType, details = {}) {
        try {
            const activityData = {
                type: 'setting',
                action,
                targetId: settingType,
                targetName: `${settingType.charAt(0).toUpperCase()}${settingType.slice(1)} Settings`,
                targetType: 'setting',
                details
            };
            
            return this.logActivity(activityData);
        } catch (error) {
            console.error('Error logging setting activity:', error);
            throw error;
        }
    },
    
    // Render activities in the activity container
    renderActivities(activities, containerId) {
        const container = document.getElementById(containerId || 'recentActivityContainer');
        
        if (!container) return;
        
        if (activities.length === 0) {
            container.innerHTML = '<p class="no-data-message">No recent activities found.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            // Get icon based on type
            let icon = '';
            switch (activity.type) {
                case 'user':
                    icon = '<i class="fas fa-user"></i>';
                    break;
                case 'appointment':
                    icon = '<i class="fas fa-calendar-check"></i>';
                    break;
                case 'resource':
                    icon = '<i class="fas fa-file-alt"></i>';
                    break;
                case 'setting':
                    icon = '<i class="fas fa-cog"></i>';
                    break;
                default:
                    icon = '<i class="fas fa-info-circle"></i>';
            }
            
            // Format timestamp
            const timestamp = activity.timestamp ? formatDate(activity.timestamp) : 'Unknown time';
            
            // Create activity message
            let message = '';
            switch (activity.type) {
                case 'user':
                    message = this.formatUserActivity(activity);
                    break;
                case 'appointment':
                    message = this.formatAppointmentActivity(activity);
                    break;
                case 'resource':
                    message = this.formatResourceActivity(activity);
                    break;
                case 'setting':
                    message = this.formatSettingActivity(activity);
                    break;
                default:
                    message = `Activity: ${activity.action}`;
            }
            
            activityItem.innerHTML = `
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <p class="activity-message">${message}</p>
                    <p class="activity-time">${timestamp}</p>
                    <p class="activity-user">by ${activity.userEmail}</p>
                </div>
            `;
            
            container.appendChild(activityItem);
        });
    },
    
    // Format user activity message
    formatUserActivity(activity) {
        switch (activity.action) {
            case 'create':
                return `Created new ${activity.targetType} account: ${activity.targetName}`;
            case 'update':
                return `Updated ${activity.targetType} account: ${activity.targetName}`;
            case 'delete':
                return `Deleted ${activity.targetType} account: ${activity.targetName}`;
            case 'password-change':
                return `Changed password for ${activity.targetName}`;
            default:
                return `${activity.action} user: ${activity.targetName}`;
        }
    },
    
    // Format appointment activity message
    formatAppointmentActivity(activity) {
        const { studentName, counselorName } = activity.details;
        
        switch (activity.action) {
            case 'create':
                return `Created new appointment between ${studentName} and ${counselorName}`;
            case 'update':
                return `Updated appointment: ${activity.targetName}`;
            case 'delete':
                return `Deleted appointment: ${activity.targetName}`;
            case 'confirm':
                return `Confirmed appointment between ${studentName} and ${counselorName}`;
            case 'cancel':
                return `Cancelled appointment between ${studentName} and ${counselorName}`;
            case 'complete':
                return `Completed appointment between ${studentName} and ${counselorName}`;
            default:
                return `${activity.action} appointment: ${activity.targetName}`;
        }
    },
    
    // Format resource activity message
    formatResourceActivity(activity) {
        const { uploaderName } = activity.details;
        
        switch (activity.action) {
            case 'upload':
                return `Uploaded new resource: ${activity.targetName}`;
            case 'update':
                return `Updated resource: ${activity.targetName}`;
            case 'delete':
                return `Deleted resource: ${activity.targetName}`;
            case 'download':
                return `Downloaded resource: ${activity.targetName}`;
            default:
                return `${activity.action} resource: ${activity.targetName}`;
        }
    },
    
    // Format setting activity message
    formatSettingActivity(activity) {
        switch (activity.action) {
            case 'update':
                return `Updated ${activity.targetName}`;
            default:
                return `${activity.action} settings: ${activity.targetName}`;
        }
    }
};

// Load recent activities to dashboard
function loadRecentActivity() {
    activityTracker.getRecentActivities(5)
        .then(activities => {
            activityTracker.renderActivities(activities, 'recentActivityContainer');
        })
        .catch(error => {
            console.error('Error loading recent activities:', error);
            document.getElementById('recentActivityContainer').innerHTML = 
                `<p class="error-message">Error loading activities: ${error.message}</p>`;
        });
}

// Load upcoming appointments for dashboard
function loadUpcomingAppointmentsForDashboard() {
    // Get current date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get date for 7 days from now
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Use a simpler query that doesn't require as many composite indexes
    db.collection('appointments')
        .orderBy('date')
        .limit(20)  // Get more than we need to filter client-side
        .get()
        .then(async snapshot => {
            const container = document.getElementById('upcomingAppointmentsContainer');
            
            if (!container) return;
            
            if (snapshot.empty) {
                container.innerHTML = '<p class="no-data-message">No upcoming appointments found.</p>';
                return;
            }
            
            // Filter in JavaScript instead of using complex Firestore queries
            // while indexes are being built
            let appointments = [];
            for (const doc of snapshot.docs) {
                const appointment = {
                    id: doc.id,
                    ...doc.data()
                };
                
                const appointmentDate = appointment.date.toDate();
                
                // Filter by our criteria on the client side
                if (appointmentDate >= today && 
                    appointmentDate < nextWeek && 
                    (appointment.status === 'pending' || appointment.status === 'confirmed')) {
                    
                    // Get student data
                    try {
                        const studentDoc = await db.collection('users').doc(appointment.studentId).get();
                        appointment.studentName = studentDoc.exists 
                            ? studentDoc.data().name || studentDoc.data().email 
                            : 'Unknown Student';
                    } catch (error) {
                        appointment.studentName = 'Unknown Student';
                    }
                    
                    // Get counselor data
                    try {
                        const counselorDoc = await db.collection('users').doc(appointment.counselorId).get();
                        appointment.counselorName = counselorDoc.exists 
                            ? counselorDoc.data().name || counselorDoc.data().email 
                            : 'Unknown Counselor';
                    } catch (error) {
                        appointment.counselorName = 'Unknown Counselor';
                    }
                    
                    appointments.push(appointment);
                }
            }
            
            // Sort by date (ascending) and take only 5
            appointments.sort((a, b) => a.date.toDate() - b.date.toDate());
            appointments = appointments.slice(0, 5);
            
            if (appointments.length === 0) {
                container.innerHTML = '<p class="no-data-message">No upcoming appointments for the next 7 days.</p>';
                return;
            }
            
            // Create HTML for appointments
            let html = '<div class="upcoming-appointments">';
            
            appointments.forEach(appointment => {
                const appointmentDate = appointment.date.toDate();
                const formattedDate = appointmentDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const statusClass = appointment.status === 'confirmed' ? 'confirmed' : 'pending';
                
                html += `
                    <div class="appointment-item">
                        <div class="appointment-date">
                            <div class="date-badge ${statusClass}">
                                <span class="day">${appointmentDate.getDate()}</span>
                                <span class="month">${appointmentDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <span class="time">${formattedTime}</span>
                        </div>
                        <div class="appointment-details">
                            <h4>${appointment.title || 'Counseling Session'}</h4>
                            <p><strong>Student:</strong> ${appointment.studentName}</p>
                            <p><strong>Counselor:</strong> ${appointment.counselorName}</p>
                            <p><strong>Status:</strong> <span class="status-${appointment.status}">${appointment.status}</span></p>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading upcoming appointments:', error);
            const container = document.getElementById('upcomingAppointmentsContainer');
            
            if (!container) return;
            
            // Show a user-friendly message and link to create the index
            if (error && error.message && error.message.includes('requires an index')) {
                container.innerHTML = `
                    <div class="error-message">
                        <h3>Firestore Index Required</h3>
                        <p>This dashboard requires a Firestore index that hasn't been created yet.</p>
                        <p>As the administrator, you need to create this index in the Firebase Console.</p>
                        <p>Click the link below to create the required index:</p>
                        <a href="${error.message.match(/https:\/\/console\.firebase\.google\.com[^"]+/)[0]}" 
                           target="_blank" class="btn primary-btn">Create Index</a>
                        <p>After creating the index, wait a few minutes for it to be built, then refresh this page.</p>
                    </div>
                `;
            } else {
                container.innerHTML = `<p class="error-message">Error loading appointments: ${error.message}</p>`;
            }
        });
}

// Expose to global scope
window.activityTracker = activityTracker;
window.loadRecentActivity = loadRecentActivity;
window.loadUpcomingAppointmentsForDashboard = loadUpcomingAppointmentsForDashboard; 