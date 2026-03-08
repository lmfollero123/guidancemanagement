// Appointments Module
const appointmentsModule = (() => {
    // Private variables and methods
    const appointmentsCollection = db.collection('appointments');
    const errorContainer = document.getElementById('appointmentError');
    
    // Get appointments for a specific user (student or counselor)
    const getAppointmentsForUser = async (userId, role, status = null) => {
        try {
            let query = appointmentsCollection;
            
            // Filter by user role
            if (role === 'student') {
                query = query.where('studentId', '==', userId);
            } else if (role === 'counselor') {
                query = query.where('counselorId', '==', userId);
            }
            
            // Filter by status if provided
            if (status) {
                query = query.where('status', '==', status);
            }
            
            // Order by date
            query = query.orderBy('appointmentDate', 'desc');
            
            const snapshot = await query.get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            handleError(error, errorContainer);
            return [];
        }
    };
    
    // Get all appointments (for admin or counselor)
    const getAllAppointments = async (status = null) => {
        try {
            let query = appointmentsCollection;
            
            // Filter by status if provided
            if (status) {
                query = query.where('status', '==', status);
            }
            
            // Order by date
            query = query.orderBy('appointmentDate', 'desc');
            
            const snapshot = await query.get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            handleError(error, errorContainer);
            return [];
        }
    };
    
    // Get appointment by ID
    const getAppointmentById = async (appointmentId) => {
        try {
            const doc = await appointmentsCollection.doc(appointmentId).get();
            
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } else {
                throw new Error('Appointment not found');
            }
        } catch (error) {
            handleError(error, errorContainer);
            return null;
        }
    };
    
    // Create a new appointment
    const createAppointment = async (appointmentData) => {
        try {
            // Validate appointment data
            if (!appointmentData.studentId || !appointmentData.counselorId || !appointmentData.appointmentDate) {
                throw new Error('Missing required appointment data');
            }
            
            // Set default values
            const newAppointment = {
                ...appointmentData,
                status: 'pending',
                createdAt: timestamp,
                updatedAt: timestamp
            };
            
            // Add to collection
            const docRef = await appointmentsCollection.add(newAppointment);
            
            return {
                id: docRef.id,
                ...newAppointment
            };
        } catch (error) {
            handleError(error, errorContainer);
            return null;
        }
    };
    
    // Update appointment
    const updateAppointment = async (appointmentId, updateData) => {
        try {
            // Add updatedAt timestamp
            updateData.updatedAt = timestamp;
            
            // Prevent changing critical fields
            delete updateData.studentId;
            delete updateData.createdAt;
            
            // Update the document
            await appointmentsCollection.doc(appointmentId).update(updateData);
            
            return true;
        } catch (error) {
            handleError(error, errorContainer);
            return false;
        }
    };
    
    // Cancel appointment
    const cancelAppointment = async (appointmentId, cancelReason) => {
        try {
            await appointmentsCollection.doc(appointmentId).update({
                status: 'cancelled',
                cancelReason: cancelReason || 'No reason provided',
                updatedAt: timestamp
            });
            
            return true;
        } catch (error) {
            handleError(error, errorContainer);
            return false;
        }
    };
    
    // Delete appointment (admin only)
    const deleteAppointment = async (appointmentId) => {
        try {
            await appointmentsCollection.doc(appointmentId).delete();
            return true;
        } catch (error) {
            handleError(error, errorContainer);
            return false;
        }
    };
    
    // Render appointments to UI
    const renderAppointments = (appointments, containerId) => {
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        if (appointments.length === 0) {
            container.innerHTML = '<p class="no-data-message">No appointments found.</p>';
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Create appointment list
        const appointmentList = document.createElement('ul');
        appointmentList.className = 'appointment-list';
        
        // Add appointments to list
        appointments.forEach(appointment => {
            const li = document.createElement('li');
            li.className = 'appointment-item';
            li.setAttribute('data-id', appointment.id);
            
            // Format date
            const formattedDate = formatDate(appointment.appointmentDate);
            
            // Create HTML structure
            li.innerHTML = `
                <div class="appointment-header">
                    <h3 class="appointment-title">${appointment.title || 'Counseling Session'}</h3>
                    <span class="appointment-status status-${appointment.status}">${appointment.status}</span>
                </div>
                <div class="appointment-details">
                    <p><i class="fas fa-calendar"></i> ${formattedDate}</p>
                    <p><i class="fas fa-clock"></i> ${appointment.duration || '1 hour'}</p>
                    ${appointment.location ? `<p><i class="fas fa-map-marker-alt"></i> ${appointment.location}</p>` : ''}
                    ${appointment.notes ? `<p><i class="fas fa-sticky-note"></i> ${appointment.notes}</p>` : ''}
                </div>
                <div class="appointment-actions">
                    ${appointment.status === 'pending' ? `
                        <button class="btn primary-btn confirm-btn" data-id="${appointment.id}">Confirm</button>
                        <button class="btn danger-btn cancel-btn" data-id="${appointment.id}">Cancel</button>
                    ` : ''}
                    ${appointment.status === 'confirmed' ? `
                        <button class="btn danger-btn cancel-btn" data-id="${appointment.id}">Cancel</button>
                    ` : ''}
                    <button class="btn secondary-btn details-btn" data-id="${appointment.id}">Details</button>
                </div>
            `;
            
            appointmentList.appendChild(li);
        });
        
        container.appendChild(appointmentList);
        
        // Add event listeners
        addAppointmentEventListeners();
    };
    
    // Add event listeners to appointment buttons
    const addAppointmentEventListeners = () => {
        // Confirm buttons
        document.querySelectorAll('.confirm-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const appointmentId = e.target.getAttribute('data-id');
                const success = await updateAppointment(appointmentId, { status: 'confirmed' });
                
                if (success) {
                    // Refresh the UI
                    loadAppointmentsForCurrentUser();
                }
            });
        });
        
        // Cancel buttons
        document.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const appointmentId = e.target.getAttribute('data-id');
                
                // Prompt for cancel reason
                const cancelReason = prompt('Please provide a reason for cancellation:');
                
                if (cancelReason !== null) {
                    const success = await cancelAppointment(appointmentId, cancelReason);
                    
                    if (success) {
                        // Refresh the UI
                        loadAppointmentsForCurrentUser();
                    }
                }
            });
        });
        
        // Details buttons
        document.querySelectorAll('.details-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const appointmentId = e.target.getAttribute('data-id');
                const appointment = await getAppointmentById(appointmentId);
                
                if (appointment) {
                    // Show appointment details modal
                    showAppointmentDetails(appointment);
                }
            });
        });
    };
    
    // Show appointment details in a modal
    const showAppointmentDetails = (appointment) => {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        // Format date
        const formattedDate = formatDate(appointment.appointmentDate);
        
        // Create modal content
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Appointment Details</h2>
                <div class="appointment-details-full">
                    <p><strong>Title:</strong> ${appointment.title || 'Counseling Session'}</p>
                    <p><strong>Date & Time:</strong> ${formattedDate}</p>
                    <p><strong>Duration:</strong> ${appointment.duration || '1 hour'}</p>
                    <p><strong>Status:</strong> <span class="status-${appointment.status}">${appointment.status}</span></p>
                    ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
                    ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                    ${appointment.cancelReason ? `<p><strong>Cancellation Reason:</strong> ${appointment.cancelReason}</p>` : ''}
                    <p><strong>Created:</strong> ${formatDate(appointment.createdAt)}</p>
                    <p><strong>Last Updated:</strong> ${formatDate(appointment.updatedAt)}</p>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add close event
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    };
    
    // Load appointments for current user
    const loadAppointmentsForCurrentUser = async () => {
        const user = auth.currentUser;
        
        if (!user) return;
        
        // Get user role
        const role = await getUserRole(user.uid);
        
        let appointments = [];
        
        if (role === 'admin') {
            // Admins see all appointments
            appointments = await getAllAppointments();
        } else {
            // Students and counselors see their own appointments
            appointments = await getAppointmentsForUser(user.uid, role);
        }
        
        // Render appointments
        renderAppointments(appointments, 'appointmentsContainer');
    };
    
    // Public API
    return {
        getAppointmentsForUser,
        getAllAppointments,
        getAppointmentById,
        createAppointment,
        updateAppointment,
        cancelAppointment,
        deleteAppointment,
        renderAppointments,
        loadAppointmentsForCurrentUser
    };
})();

// Export module
if (typeof window !== 'undefined') {
    window.appointmentsModule = appointmentsModule;
} 