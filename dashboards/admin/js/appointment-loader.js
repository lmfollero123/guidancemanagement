// Simplified appointment loader that doesn't require complex indices
// Use this while waiting for Firebase indices to build

// Load upcoming appointments for dashboard
function loadUpcomingAppointmentsAlternative() {
    // Get current date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get date for 7 days from now
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Use a simpler query that doesn't require composite indexes
    db.collection('appointments')
        .orderBy('appointmentDate')
        .limit(20)
        .get()
        .then(async snapshot => {
            const container = document.getElementById('upcomingAppointmentsContainer');
            
            if (!container) return;
            
            if (snapshot.empty) {
                container.innerHTML = '<p class="no-data-message">No appointments found.</p>';
                return;
            }
            
            // Filter on the client side
            let appointments = [];
            for (const doc of snapshot.docs) {
                const appointment = {
                    id: doc.id,
                    ...doc.data()
                };
                
                const appointmentDate = appointment.appointmentDate.toDate();
                
                // Filter by date and status
                if (appointmentDate >= today && 
                    appointmentDate < nextWeek && 
                    (appointment.status === 'pending' || appointment.status === 'confirmed')) {
                    
                    try {
                        // Get student data
                        const studentDoc = await db.collection('users').doc(appointment.studentId).get();
                        appointment.studentName = studentDoc.exists 
                            ? studentDoc.data().name || studentDoc.data().email 
                            : 'Unknown Student';
                            
                        // Get counselor data
                        const counselorDoc = await db.collection('users').doc(appointment.counselorId).get();
                        appointment.counselorName = counselorDoc.exists 
                            ? counselorDoc.data().name || counselorDoc.data().email 
                            : 'Unknown Counselor';
                            
                        appointments.push(appointment);
                    } catch (error) {
                        console.error('Error getting user data:', error);
                    }
                }
            }
            
            // Sort and limit
            appointments.sort((a, b) => a.appointmentDate.toDate() - b.appointmentDate.toDate());
            appointments = appointments.slice(0, 5);
            
            if (appointments.length === 0) {
                container.innerHTML = '<p class="no-data-message">No upcoming appointments for the next 7 days.</p>';
                return;
            }
            
            // Create HTML for appointments
            let html = '<div class="upcoming-appointments">';
            
            appointments.forEach(appointment => {
                const appointmentDate = appointment.appointmentDate.toDate();
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
            console.error('Error loading upcoming appointments alternative:', error);
            const container = document.getElementById('upcomingAppointmentsContainer');
            
            if (!container) return;
            
            container.innerHTML = `<p class="error-message">Error loading appointments: ${error.message}</p>`;
        });
}

// Export the function
window.loadUpcomingAppointmentsAlternative = loadUpcomingAppointmentsAlternative; 