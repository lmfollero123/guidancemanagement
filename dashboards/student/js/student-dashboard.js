/**
 * Student Dashboard Main Script
 * Implements the UI interactions and functionality
 */

// DOM Elements
const navLinks = document.querySelectorAll('.sidebar-menu a[data-section]');
const sections = document.querySelectorAll('.section');
const logoutBtn = document.getElementById('logout-btn');
const studentNameElement = document.getElementById('student-name');
const currentDateElement = document.getElementById('current-date');
const upcomingCountElement = document.getElementById('upcoming-count');
const pastCountElement = document.getElementById('past-count');
const resourceCountElement = document.getElementById('resource-count');
const profileNameElement = document.getElementById('profile-name');
const profileEmailElement = document.getElementById('profile-email');
const profileProgramElement = document.getElementById('profile-program');
const profileYearElement = document.getElementById('profile-year');
const profileAvatarElements = document.querySelectorAll('#profile-avatar, #user-avatar');
const noUpcomingAppointmentsElement = document.getElementById('no-upcoming-appointments');
const upcomingAppointmentsContainer = document.getElementById('upcoming-appointments-container');
const noRecentResourcesElement = document.getElementById('no-recent-resources');
const recentResourcesContainer = document.getElementById('recent-resources-container');
const newAppointmentBtn = document.getElementById('new-appointment-btn');
const appointmentModal = document.getElementById('appointment-modal');
const closeAppointmentModal = document.getElementById('close-appointment-modal');
const appointmentForm = document.getElementById('appointment-form');
const appointmentCounselor = document.getElementById('appointment-counselor');
const appointmentDate = document.getElementById('appointment-date');
const appointmentTime = document.getElementById('appointment-time');
const appointmentReason = document.getElementById('appointment-reason');
const appointmentError = document.getElementById('appointment-error');
const appointmentTabs = document.querySelectorAll('.appointment-tab');
const appointmentTabContents = document.querySelectorAll('.appointment-tab-content');
const upcomingAppointmentsList = document.getElementById('upcoming-appointments-list');
const pastAppointmentsList = document.getElementById('past-appointments-list');
const cancelledAppointmentsList = document.getElementById('cancelled-appointments-list');
const noUpcomingAppointmentsTab = document.getElementById('no-upcoming-appointments-tab');
const noPastAppointments = document.getElementById('no-past-appointments');
const noCancelledAppointments = document.getElementById('no-cancelled-appointments');
const resourceSearch = document.getElementById('resource-search');
const resourceCategoryFilter = document.getElementById('resource-category-filter');
const resourcesContainer = document.getElementById('resources-container');
const noResourcesMessage = document.getElementById('no-resources-message');
const resourceModal = document.getElementById('resource-modal');
const closeResourceModal = document.getElementById('close-resource-modal');
const resourceTitle = document.getElementById('resource-title');
const resourceDescription = document.getElementById('resource-description');
const resourceCategory = document.getElementById('resource-category');
const resourceAuthor = document.getElementById('resource-author');
const resourceDate = document.getElementById('resource-date');
const resourceFileContainer = document.getElementById('resource-file-container');
const resourceFileName = document.getElementById('resource-file-name');
const downloadResource = document.getElementById('download-resource');
const resourceUrlContainer = document.getElementById('resource-url-container');
const resourceUrl = document.getElementById('resource-url');
const profileTabs = document.querySelectorAll('.profile-tab');
const profileTabContents = document.querySelectorAll('.profile-tab-content');
const profileForm = document.getElementById('profile-form');
const editName = document.getElementById('edit-name');
const editEmail = document.getElementById('edit-email');
const editProgram = document.getElementById('edit-program');
const editYear = document.getElementById('edit-year');
const editContact = document.getElementById('edit-contact');
const passwordForm = document.getElementById('password-form');
const currentPassword = document.getElementById('current-password');
const newPassword = document.getElementById('new-password');
const confirmPassword = document.getElementById('confirm-password');
const passwordError = document.getElementById('password-error');
const approvedAppointmentsList = document.getElementById('approved-appointments-list');
const noApprovedAppointments = document.getElementById('no-approved-appointments');

// Application State
let resourcesData = [];
let filteredResources = [];
let categories = [];
let currentUserData = null;

// --- Notifications Logic ---
let notificationsUnsubscribe = null;
function setupNotifications(studentUid) {
  const bell = document.getElementById('notificationsBell');
  const badge = document.getElementById('notificationsBadge');
  const dropdown = document.getElementById('notificationsDropdown');
  const closeBtn = document.getElementById('closeNotificationsDropdown');
  const listDiv = document.getElementById('notificationsList');

  // Show/hide dropdown
  if (bell) {
    bell.onclick = function(e) {
      e.stopPropagation();
      if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      if (dropdown.style.display === 'block') {
        // Mark all as read
        markAllNotificationsRead(studentUid);
        if (badge) badge.style.display = 'none';
      }
    };
  }
  if (closeBtn) {
    closeBtn.onclick = function() {
      if (dropdown) dropdown.style.display = 'none';
    };
  }
  document.addEventListener('click', function(e) {
    if (!dropdown || !dropdown.contains(e.target) && e.target !== bell) {
      if (dropdown) dropdown.style.display = 'none';
    }
  });

  // Listen for notifications
  if (notificationsUnsubscribe) notificationsUnsubscribe();
  notificationsUnsubscribe = db.collection('notifications')
    .where('toUid', '==', studentUid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {
      let unread = 0;
      let html = '';
      if (snapshot.empty) {
        html = '<div class="no-data-message">No notifications.</div>';
      } else {
        html = '<ul style="list-style:none;padding:0;">';
        snapshot.forEach(doc => {
          const n = doc.data();
          const isUnread = !n.read;
          if (isUnread) unread++;
          let icon = '<i class="fas fa-bell"></i>';
          if (n.type === 'appointment') icon = '<i class="fas fa-calendar-alt" style="color:#5b7cfa"></i>';
          if (n.type === 'status') icon = '<i class="fas fa-info-circle" style="color:#27ae60"></i>';
          if (n.type === 'resource') icon = '<i class="fas fa-book" style="color:#f39c12"></i>';
          html += `<li style="margin-bottom:0.85rem;display:flex;align-items:flex-start;gap:0.75rem;${isUnread ? 'background:#f4f6fb;' : ''}padding:0.5rem 0;border-bottom:1px solid #eee;">
            ${icon}
            <span style="flex:1;">
              <span style="font-weight:${isUnread ? 'bold' : 'normal'};">${n.message}</span><br>
              <span style="font-size:0.92em;color:#888;">${n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : ''}</span>
            </span>
            ${n.link ? `<a href="${n.link}" style="color:#5b7cfa;font-size:1.1em;margin-left:0.5rem;" target="_blank"><i class='fas fa-arrow-right'></i></a>` : ''}
          </li>`;
        });
        html += '</ul>';
      }
      if (listDiv) listDiv.innerHTML = html;
      // Show/hide badge
      if (unread > 0) {
        if (badge) badge.textContent = unread;
        if (badge) badge.style.display = 'inline-block';
      } else {
        if (badge) badge.style.display = 'none';
      }
    });
}
async function markAllNotificationsRead(studentUid) {
  // Mark all unread notifications as read
  const snap = await db.collection('notifications')
    .where('toUid', '==', studentUid)
    .where('read', '==', false)
    .get();
  const batch = db.batch();
  snap.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });
  if (!snap.empty) await batch.commit();
}
// Set up notifications after auth
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    setupNotifications(user.uid);
  }
});

// Initialize Dashboard
async function initializeDashboard() {
    try {
        // Check if user is a student
        const authResult = await AuthHelper.checkUserRole('student');
        
        if (!authResult) {
            // Auth helper will handle redirects if needed
            return;
        }
        
        // Store current user data
        currentUserData = authResult.userData;
        
        // Display user information
        displayUserInfo(currentUserData);
        
        // Load dashboard data
        await loadDashboardData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Set current date
        setCurrentDate();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        AuthHelper.addDebugMessage(`Error: ${error.message}`);
    }
}

// Display User Information
function displayUserInfo(userData) {
    // Set user name
    if (studentNameElement) studentNameElement.textContent = userData.name;
    if (profileNameElement) profileNameElement.textContent = userData.name;
    if (profileEmailElement) profileEmailElement.textContent = userData.email;
    
    // Set profile fields
    if (profileProgramElement) profileProgramElement.innerHTML = `Program: <span>${userData.program || 'N/A'}</span>`;
    if (profileYearElement) profileYearElement.innerHTML = `Year/Grade: <span>${userData.year || 'N/A'}</span>`;
    
    // Set form fields
    if (editName) editName.value = userData.name;
    if (editEmail) editEmail.value = userData.email;
    if (editProgram) editProgram.value = userData.program || '';
    if (editYear) editYear.value = userData.year || '';
    if (editContact) editContact.value = userData.contactNumber || '';
    
    // Set avatar
    if (userData.photoURL) {
        profileAvatarElements.forEach(avatar => {
            if (avatar) avatar.src = userData.photoURL;
        });
    }
}

// Set Current Date
function setCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    if (currentDateElement) currentDateElement.textContent = today.toLocaleDateString('en-US', options);
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load dashboard statistics
        await loadDashboardStatistics();
        
        // Load upcoming appointments
        await loadUpcomingAppointments();
        
        // Load recent resources
        await loadRecentResources();
        
        // Load counselors
        await loadCounselors();
        
        // Load resource categories
        await loadResourceCategories();
        
        // Load recent activity feed
        await loadActivityFeed();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load Dashboard Statistics
async function loadDashboardStatistics() {
    try {
        // Get upcoming appointments count
        const upcomingAppointments = await Appointments.getUpcomingAppointments();
        upcomingCountElement.textContent = upcomingAppointments.length;
        
        // Get past appointments count
        const pastAppointments = await Appointments.getPastAppointments();
        pastCountElement.textContent = pastAppointments.length;
        
        // Get resources count
        const resources = await Resources.getAllResources();
        resourceCountElement.textContent = resources.length;
        resourcesData = resources;
        
        // Load analytics charts
        await loadDashboardCharts();
    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
    }
}

// Load Upcoming Appointments
async function loadUpcomingAppointments() {
    try {
        const upcomingAppointments = await Appointments.getUpcomingAppointments();
        
        if (upcomingAppointments.length === 0) {
            if (noUpcomingAppointmentsElement) noUpcomingAppointmentsElement.style.display = 'block';
            return;
        }
        
        if (noUpcomingAppointmentsElement) noUpcomingAppointmentsElement.style.display = 'none';
        
        // Sort by date
        upcomingAppointments.sort((a, b) => a.appointmentDate.toDate() - b.appointmentDate.toDate());
        
        // Display only up to 3 appointments
        const appointmentsToShow = upcomingAppointments.slice(0, 3);
        
        // Clear container
        if (upcomingAppointmentsContainer) upcomingAppointmentsContainer.innerHTML = '';
        
        // Add appointments to container
        appointmentsToShow.forEach(appointment => {
            const appointmentDate = appointment.appointmentDate.toDate();
            const dateString = appointmentDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            
            const timeString = appointmentDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            
            const statusClass = appointment.status === 'pending' ? 'status-pending' : 'status-confirmed';
            const statusText = appointment.status === 'pending' ? 'Pending' : 'Confirmed';
            
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'appointment-item';
            appointmentElement.innerHTML = `
                <div class="appointment-details">
                    <p class="appointment-title"><span class="${statusClass}">${statusText}</span></p>
                    <p class="appointment-date"><i class="fas fa-calendar"></i> ${dateString} at ${timeString}</p>
                    <p class="appointment-counselor"><i class="fas fa-user"></i> With ${appointment.counselorName}</p>
                </div>
            `;
            
            upcomingAppointmentsContainer.appendChild(appointmentElement);
        });
        
    } catch (error) {
        console.error('Error loading upcoming appointments:', error);
    }
}

// Load Recent Resources
async function loadRecentResources() {
    try {
        const recentResources = await Resources.getRecentResources(3);
        
        if (recentResources.length === 0) {
            if (noRecentResourcesElement) noRecentResourcesElement.style.display = 'block';
            return;
        }
        
        if (noRecentResourcesElement) noRecentResourcesElement.style.display = 'none';
        
        // Clear container
        if (recentResourcesContainer) recentResourcesContainer.innerHTML = '';
        
        // Add resources to container
        recentResources.forEach(resource => {
            const resourceDate = resource.createdAt.toDate();
            const dateString = resourceDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            const resourceElement = document.createElement('div');
            resourceElement.className = 'resource-item';
            resourceElement.innerHTML = `
                <div class="resource-details">
                    <h4>${resource.title}</h4>
                    <p class="resource-category">${resource.category}</p>
                    <p class="resource-date">Added: ${dateString}</p>
                </div>
                <button class="view-resource-btn secondary-btn" data-id="${resource.id}">View</button>
            `;
            
            recentResourcesContainer.appendChild(resourceElement);
            
            // Add event listener
            const viewButton = resourceElement.querySelector('.view-resource-btn');
            viewButton.addEventListener('click', () => {
                openResourceModal(resource.id);
            });
        });
        
    } catch (error) {
        console.error('Error loading recent resources:', error);
    }
}

// Load Counselors
async function loadCounselors() {
    try {
        const counselors = await Appointments.getCounselors();
        
        // Clear select element
        if (appointmentCounselor) appointmentCounselor.innerHTML = '<option value="" disabled selected>Choose a counselor</option>';
        
        // Add counselors to select element
        counselors.forEach(counselor => {
            const option = document.createElement('option');
            option.value = counselor.id;
            option.textContent = counselor.name;
            option.dataset.name = counselor.name;
            appointmentCounselor.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading counselors:', error);
    }
}

// Load Resource Categories
async function loadResourceCategories() {
    try {
        categories = await Resources.getResourceCategories();
        
        // Clear select element
        if (resourceCategoryFilter) resourceCategoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        // Add categories to select element
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            resourceCategoryFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading resource categories:', error);
    }
}

// Load Activity Feed
async function loadActivityFeed() {
    const feedDiv = document.getElementById('activityFeed');
    if (!feedDiv) return;
    feedDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading activity...';
    try {
        const user = auth.currentUser;
        if (!user) { feedDiv.innerHTML = 'Not logged in.'; return; }
        const snap = await db.collection('activity')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        if (snap.empty) {
            feedDiv.innerHTML = '<div class="no-data-message">No recent activity.</div>';
            return;
        }
        let html = '<ul style="list-style:none;padding:0;">';
        snap.forEach(doc => {
            const a = doc.data();
            let icon = '<i class="fas fa-bolt" style="color:#5b7cfa"></i>';
            let action = a.action || 'Activity';
            if (action.includes('appointment')) icon = '<i class="fas fa-calendar-alt" style="color:#5b7cfa"></i>';
            if (action.includes('resource')) icon = '<i class="fas fa-book" style="color:#f39c12"></i>';
            html += `<li style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.75rem;">
                ${icon}
                <span><b>${action.replace(/_/g,' ')}</b><br><span style='font-size:0.95em;color:#888;'>${a.timestamp && a.timestamp.toDate ? a.timestamp.toDate().toLocaleString() : ''}</span></span>
            </li>`;
        });
        html += '</ul>';
        feedDiv.innerHTML = html;
    } catch (err) {
        feedDiv.innerHTML = '<div class="no-data-message">Error loading activity.</div>';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    if (navLinks) {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetSection = this.getAttribute('data-section');
                
                // Remove active class from all links
                navLinks.forEach(link => link.classList.remove('active'));
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Hide all sections
                sections.forEach(section => section.classList.remove('active'));
                
                // Show target section
                const newSection = document.getElementById(`${targetSection}-section`);
                if (newSection) {
                    transitionToSection(newSection);
                }
                
                // Load section data if needed
                if (targetSection === 'appointments') {
                    loadAppointmentsSection();
                } else if (targetSection === 'resources') {
                    // Always reload resources section on navigation
                    loadResourcesSection();
                } else if (targetSection === 'home') {
                    loadHomeSection();
                }
            });
        });
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await AuthHelper.signOut();
        });
    }
    
    // New Appointment
    if (newAppointmentBtn) {
        newAppointmentBtn.addEventListener('click', function() {
            resetAppointmentForm();
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            if (appointmentDate) appointmentDate.min = todayString;
            if (appointmentModal) {
                appointmentModal.style.display = 'block';
                const modalContent = appointmentModal.querySelector('.modal-content');
                if (modalContent) modalContent.classList.remove('modal-closing');
            }
        });
    }
    
    // Close Appointment Modal
    if (closeAppointmentModal) {
        closeAppointmentModal.addEventListener('click', function() {
            closeModalWithAnimation(appointmentModal);
            resetAppointmentForm();
        });
    }
    
    // Close Modal on Outside Click
    window.addEventListener('click', function(e) {
        if (e.target === appointmentModal) {
            closeModalWithAnimation(appointmentModal);
            resetAppointmentForm();
        }
        
        if (e.target === resourceModal) {
            closeModalWithAnimation(resourceModal);
        }
    });
    
    // Submit Appointment Form
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitAppointmentForm();
        });
    }
    
    // Appointment Tabs
    if (appointmentTabs) {
        appointmentTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                // Remove active class from all tabs
                appointmentTabs.forEach(tab => tab.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Hide all tab contents
                appointmentTabContents.forEach(content => content.classList.remove('active'));
                
                // Show target tab content
                document.getElementById(`${tabName}-tab`).classList.add('active');
                
                // Load tab data if needed
                if (tabName === 'upcoming' && upcomingAppointmentsList.children.length === 0) {
                    loadUpcomingAppointmentsTab();
                } else if (tabName === 'approved' && approvedAppointmentsList.children.length === 0) {
                    loadApprovedAppointmentsTab();
                } else if (tabName === 'past' && pastAppointmentsList.children.length === 0) {
                    loadPastAppointmentsTab();
                } else if (tabName === 'cancelled' && cancelledAppointmentsList.children.length === 0) {
                    loadCancelledAppointmentsTab();
                } else if (tabName === 'calendar' && !calendarInitialized) {
                    loadCalendarAppointments();
                }
            });
        });
    }
    
    // Resource Search and Filter
    if (resourceSearch) {
        resourceSearch.addEventListener('input', filterResources);
    }
    if (resourceCategoryFilter) {
        resourceCategoryFilter.addEventListener('change', filterResources);
    }
    
    // Close Resource Modal
    if (closeResourceModal) {
        closeResourceModal.addEventListener('click', function() {
            closeModalWithAnimation(resourceModal);
        });
    }
    
    // Profile Tabs
    if (profileTabs) {
        profileTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                // Remove active class from all tabs and contents
                profileTabs.forEach(tab => tab.classList.remove('active'));
                profileTabContents.forEach(content => content.classList.remove('active'));
                // Add active class to clicked tab and corresponding content
                this.classList.add('active');
                const content = document.getElementById(`${tabName}-tab`);
                if (content) content.classList.add('active');
            });
        });
    }
    
    // Profile Form
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Prevent default form submission immediately
            await updateProfile();
            return false; // Extra safety to prevent reload
        });
    }
    
    // Password Form
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await changePassword();
        });
    }
}

// Load Appointments Section
async function loadAppointmentsSection() {
    // Load first tab by default
    await loadUpcomingAppointmentsTab();
}

// Load Upcoming Appointments Tab
async function loadUpcomingAppointmentsTab() {
    try {
        const upcomingAppointments = await Appointments.getUpcomingAppointments();
        if (upcomingAppointments.length === 0) {
            if (noUpcomingAppointmentsTab) noUpcomingAppointmentsTab.style.display = 'block';
            upcomingAppointmentsList.innerHTML = '';
            return;
        }
        if (noUpcomingAppointmentsTab) noUpcomingAppointmentsTab.style.display = 'none';
        // Sort by date
        upcomingAppointments.sort((a, b) => a.appointmentDate.toDate() - b.appointmentDate.toDate());
        // Clear container
        upcomingAppointmentsList.innerHTML = '';
        // Add appointments to container
        upcomingAppointments.forEach(appointment => {
            const appointmentDate = appointment.appointmentDate.toDate();
            const dateString = appointmentDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            const timeString = appointmentDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            const statusClass = appointment.status === 'pending' ? 'status-pending' : 'status-confirmed';
            const statusText = appointment.status === 'pending' ? 'Pending' : 'Confirmed';
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'appointment-item';
            appointmentElement.innerHTML = `
                <div class="appointment-details">
                    <p class="appointment-title"><span class="${statusClass}">${statusText}</span></p>
                    <p class="appointment-date"><i class="fas fa-calendar"></i> ${dateString} at ${timeString}</p>
                    <p class="appointment-counselor"><i class="fas fa-user"></i> With ${appointment.counselorName}</p>
                    <p class="appointment-reason"><strong>Reason:</strong> ${appointment.reason}</p>
                    ${appointment.notes ? `<p class="appointment-notes"><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                </div>
                <div class="appointment-actions">
                    <button class="danger-btn cancel-appointment-btn" data-id="${appointment.id}">Cancel</button>
                </div>
            `;
            // Make the whole appointment item clickable (except the cancel button)
            appointmentElement.style.cursor = 'pointer';
            appointmentElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('cancel-appointment-btn')) return;
                showAppointmentDetailsModal(appointment);
            });
            upcomingAppointmentsList.appendChild(appointmentElement);
            // Add event listener for cancel button
            const cancelButton = appointmentElement.querySelector('.cancel-appointment-btn');
            cancelButton.addEventListener('click', async () => {
                if (confirm('Are you sure you want to cancel this appointment?')) {
                    const success = await Appointments.cancelAppointment(appointment.id);
                    if (success) {
                        alert('Appointment cancelled successfully');
                        await loadUpcomingAppointmentsTab();
                        await loadDashboardStatistics();
                        await loadUpcomingAppointments();
                    } else {
                        alert('Failed to cancel appointment');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading upcoming appointments tab:', error);
    }
}

// Load Past Appointments Tab
async function loadPastAppointmentsTab() {
    try {
        const pastAppointments = await Appointments.getPastAppointments();
        if (pastAppointments.length === 0) {
            if (noPastAppointments) noPastAppointments.style.display = 'block';
            pastAppointmentsList.innerHTML = '';
            return;
        }
        if (noPastAppointments) noPastAppointments.style.display = 'none';
        // Sort by date (most recent first)
        pastAppointments.sort((a, b) => b.appointmentDate.toDate() - a.appointmentDate.toDate());
        // Clear container
        pastAppointmentsList.innerHTML = '';
        // Add appointments to container
        pastAppointments.forEach(appointment => {
            const appointmentDate = appointment.appointmentDate.toDate();
            const dateString = appointmentDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            const timeString = appointmentDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'appointment-item';
            appointmentElement.innerHTML = `
                <div class="appointment-details">
                    <p class="appointment-title"><span class="status-completed">Completed</span></p>
                    <p class="appointment-date"><i class="fas fa-calendar"></i> ${dateString} at ${timeString}</p>
                    <p class="appointment-counselor"><i class="fas fa-user"></i> With ${appointment.counselorName}</p>
                    <p class="appointment-reason"><strong>Reason:</strong> ${appointment.reason}</p>
                    ${appointment.notes ? `<p class="appointment-notes"><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                </div>
            `;
            // Make the whole appointment item clickable
            appointmentElement.style.cursor = 'pointer';
            appointmentElement.addEventListener('click', () => {
                showAppointmentDetailsModal(appointment);
            });
            pastAppointmentsList.appendChild(appointmentElement);
        });
    } catch (error) {
        console.error('Error loading past appointments tab:', error);
    }
}

// Load Cancelled Appointments Tab
async function loadCancelledAppointmentsTab() {
    try {
        const cancelledAppointments = await Appointments.getCancelledAppointments();
        if (cancelledAppointments.length === 0) {
            if (noCancelledAppointments) noCancelledAppointments.style.display = 'block';
            cancelledAppointmentsList.innerHTML = '';
            return;
        }
        if (noCancelledAppointments) noCancelledAppointments.style.display = 'none';
        // Sort by date (most recent first)
        cancelledAppointments.sort((a, b) => b.appointmentDate.toDate() - a.appointmentDate.toDate());
        // Clear container
        cancelledAppointmentsList.innerHTML = '';
        // Add appointments to container
        cancelledAppointments.forEach(appointment => {
            const appointmentDate = appointment.appointmentDate.toDate();
            const dateString = appointmentDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            const timeString = appointmentDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'appointment-item';
            appointmentElement.innerHTML = `
                <div class="appointment-details">
                    <p class="appointment-title"><span class="status-cancelled">Cancelled</span></p>
                    <p class="appointment-date"><i class="fas fa-calendar"></i> ${dateString} at ${timeString}</p>
                    <p class="appointment-counselor"><i class="fas fa-user"></i> With ${appointment.counselorName}</p>
                    <p class="appointment-reason"><strong>Reason:</strong> ${appointment.reason}</p>
                    ${appointment.notes ? `<p class="appointment-notes"><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                </div>
            `;
            // Make the whole appointment item clickable
            appointmentElement.style.cursor = 'pointer';
            appointmentElement.addEventListener('click', () => {
                showAppointmentDetailsModal(appointment);
            });
            cancelledAppointmentsList.appendChild(appointmentElement);
        });
    } catch (error) {
        console.error('Error loading cancelled appointments tab:', error);
    }
}

// Load Resources Section
async function loadResourcesSection() {
    try {
        // Always fetch latest resources
        resourcesData = await Resources.getAllResources();
        // Remove all filters for this patch: show all resources
        filteredResources = [...resourcesData];
        // Display resources
        displayResources(filteredResources);
    } catch (error) {
        console.error('Error loading resources section:', error);
        if (noResourcesMessage) noResourcesMessage.style.display = 'block';
        if (resourcesContainer) resourcesContainer.innerHTML = '';
    }
}

// Display Resources
function displayResources(resources) {
    // Always clear the container and remove the no-data-message before rendering
    if (resourcesContainer) {
        resourcesContainer.innerHTML = '';
    }
    if (!resources || resources.length === 0) {
        if (noResourcesMessage) {
            noResourcesMessage.style.display = 'block';
            resourcesContainer.appendChild(noResourcesMessage);
        }
        return;
    }
    if (noResourcesMessage) noResourcesMessage.style.display = 'none';
    resources.forEach(resource => {
        const resourceDate = resource.createdAt && resource.createdAt.toDate ? resource.createdAt.toDate() : new Date();
        const dateString = resourceDate.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        // File type icon
        let icon = '<i class="fas fa-file-alt"></i>';
        if (resource.fileType) {
            if (resource.fileType.includes('pdf')) icon = '<i class="fas fa-file-pdf" style="color:#e74c3c"></i>';
            else if (resource.fileType.includes('doc')) icon = '<i class="fas fa-file-word" style="color:#2980b9"></i>';
            else if (resource.fileType.includes('ppt')) icon = '<i class="fas fa-file-powerpoint" style="color:#e67e22"></i>';
            else if (resource.fileType.includes('xls')) icon = '<i class="fas fa-file-excel" style="color:#27ae60"></i>';
            else if (resource.fileType.includes('jpg') || resource.fileType.includes('png')) icon = '<i class="fas fa-file-image" style="color:#5b7cfa"></i>';
        }
        const resourceElement = document.createElement('div');
        resourceElement.className = 'resource-card';
        resourceElement.innerHTML = `
            <div class="resource-card-header">
                <span class="file-icon">${icon}</span>
                <h3 class="resource-title">${resource.title || 'Untitled'}</h3>
                <span class="resource-category">${resource.category || 'Uncategorized'}</span>
            </div>
            <div class="resource-card-body">
                <p class="resource-description">${resource.description || ''}</p>
                <div class="resource-footer">
                    <span class="resource-date">Added: ${dateString}</span>
                    <a href="#" class="resource-link view-resource-btn" data-id="${resource.id}">View Details</a>
                </div>
            </div>
        `;
        resourcesContainer.appendChild(resourceElement);
        // Add event listener
        const viewButton = resourceElement.querySelector('.view-resource-btn');
        viewButton.addEventListener('click', (e) => {
            e.preventDefault();
            openResourceModal(resource.id);
        });
    });
}

// Filter Resources
function filterResources() {
    const searchTerm = resourceSearch.value.toLowerCase();
    const categoryFilter = resourceCategoryFilter.value;
    filteredResources = resourcesData.filter(resource => {
        const matchesSearch = (resource.title || '').toLowerCase().includes(searchTerm) ||
                             (resource.description || '').toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === '' || resource.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    displayResources(filteredResources);
}

// Open Resource Modal
async function openResourceModal(resourceId) {
    try {
        const resource = await Resources.getResourceById(resourceId);
        if (!resource) {
            alert('Resource not found');
            return;
        }
        // Set resource details
        if (resourceTitle) resourceTitle.textContent = resource.title || 'Untitled';
        if (resourceDescription) resourceDescription.textContent = resource.description || '';
        if (resourceCategory) resourceCategory.textContent = resource.category || 'Uncategorized';
        if (resourceAuthor) resourceAuthor.textContent = resource.authorName || 'Counselor';
        if (resourceDate) {
            const resourceDateObj = resource.createdAt && resource.createdAt.toDate ? resource.createdAt.toDate() : new Date();
            resourceDate.textContent = resourceDateObj.toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
            });
        }
        // --- Preview logic ---
        let previewHtml = '';
        if (resource.fileUrl && resource.fileType) {
            if (["jpg","jpeg","png"].includes(resource.fileType)) {
                previewHtml = `<img src="${resource.fileUrl}" alt="Preview" style="max-width:350px;max-height:350px;display:block;margin:0 auto 1rem auto;border-radius:8px;box-shadow:0 2px 8px rgba(44,62,80,0.12);">`;
            } else if (resource.fileType === 'pdf') {
                previewHtml = `<iframe src="${resource.fileUrl}#toolbar=0" style="width:350px;height:400px;border:none;border-radius:8px;box-shadow:0 2px 8px rgba(44,62,80,0.12);margin-bottom:1rem;"></iframe>`;
            }
        }
        // Insert preview above details
        const detailsDiv = resourceModal.querySelector('.resource-details');
        if (detailsDiv) {
            detailsDiv.insertAdjacentHTML('afterbegin', previewHtml);
        }
        // Handle file URL if exists
        if (resource.fileUrl) {
            if (resourceFileContainer) resourceFileContainer.style.display = 'block';
            if (resourceFileName) resourceFileName.textContent = resource.fileName || 'Download File';
            if (downloadResource) downloadResource.onclick = async () => {
                window.open(resource.fileUrl, '_blank');
            };
        } else {
            if (resourceFileContainer) resourceFileContainer.style.display = 'none';
        }
        // Handle external URL if exists
        if (resource.externalUrl) {
            if (resourceUrlContainer) resourceUrlContainer.style.display = 'block';
            if (resourceUrl) resourceUrl.href = resource.externalUrl;
        } else {
            if (resourceUrlContainer) resourceUrlContainer.style.display = 'none';
        }
        // Show modal
        if (resourceModal) {
            resourceModal.style.display = 'block';
            const modalContent = resourceModal.querySelector('.modal-content');
            if (modalContent) modalContent.classList.remove('modal-closing');
        }
    } catch (error) {
        console.error('Error opening resource modal:', error);
        alert('Error loading resource details.');
    }
}

// Reset Appointment Form
function resetAppointmentForm() {
    if (appointmentForm) appointmentForm.reset();
    if (appointmentError) appointmentError.style.display = 'none';
}

// Submit Appointment Form
async function submitAppointmentForm() {
    try {
        // Validate form
        if (!appointmentCounselor.value || !appointmentDate.value || !appointmentTime.value || !appointmentReason.value) {
            if (appointmentError) appointmentError.textContent = 'Please fill in all required fields';
            if (appointmentError) appointmentError.style.display = 'block';
            return;
        }
        // Validate date
        const selectedDate = new Date(appointmentDate.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            if (appointmentError) appointmentError.textContent = 'Please select a future date';
            if (appointmentError) appointmentError.style.display = 'block';
            return;
        }
        // Prevent double booking: check for existing appointment
        const conflictSnap = await db.collection('appointments')
            .where('counselorId', '==', appointmentCounselor.value)
            .where('date', '==', appointmentDate.value)
            .where('time', '==', appointmentTime.value)
            .where('status', 'in', ['pending', 'approved', 'confirmed'])
            .get();
        if (!conflictSnap.empty) {
            if (appointmentError) appointmentError.textContent = 'This time slot is already booked for the selected counselor. Please choose another time.';
            if (appointmentError) appointmentError.style.display = 'block';
            return;
        }
        // Create appointment data
        const appointmentData = {
            counselorId: appointmentCounselor.value,
            counselorName: appointmentCounselor.options[appointmentCounselor.selectedIndex].textContent,
            date: appointmentDate.value,
            time: appointmentTime.value,
            reason: appointmentReason.value,
            notes: document.getElementById('appointment-notes').value
        };
        // Create appointment
        const appointmentId = await Appointments.createAppointment(appointmentData);
        if (appointmentId) {
            alert('Appointment requested successfully');
            closeModalWithAnimation(appointmentModal);
            resetAppointmentForm();
            // Reload dashboard data
            await loadDashboardStatistics();
            await loadUpcomingAppointments();
            // If appointments tab is active, reload it
            if (document.getElementById('appointments-section').classList.contains('active')) {
                await loadUpcomingAppointmentsTab();
            }
        } else {
            if (appointmentError) appointmentError.textContent = 'Failed to create appointment';
            if (appointmentError) appointmentError.style.display = 'block';
        }
    } catch (error) {
        console.error('Error submitting appointment form:', error);
        if (appointmentError) appointmentError.textContent = 'An error occurred: ' + error.message;
        if (appointmentError) appointmentError.style.display = 'block';
    }
}

// --- Toast Notification Helper ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.style.display='none';">&times;</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.35s forwards';
        setTimeout(() => { toast.remove(); }, 350);
    }, 3200);
}

// Update Profile
async function updateProfile() {
    try {
        // Validate form
        if (!editName.value) {
            showToast('Please enter your name', 'error');
            return;
        }
        // Only update the name field
        const profileData = {
            name: editName.value
        };
        console.log('[Profile Update] Sending profileData:', profileData);
        // Update profile
        const success = await UserProfile.updateProfile(profileData);
        console.log('[Profile Update] Update result:', success);
        if (success) {
            showToast('Profile updated successfully', 'success');
            // Update displayed name
            if (studentNameElement) studentNameElement.textContent = profileData.name;
            if (profileNameElement) profileNameElement.textContent = profileData.name;
        } else {
            showToast('Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('[Profile Update] Error updating profile:', error);
        showToast('An error occurred: ' + error.message, 'error');
    }
}

// Change Password
async function changePassword() {
    try {
        // Validate form
        if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
            if (passwordError) passwordError.textContent = 'Please fill in all fields';
            if (passwordError) passwordError.style.display = 'block';
            return;
        }
        
        if (newPassword.value !== confirmPassword.value) {
            if (passwordError) passwordError.textContent = 'New passwords do not match';
            if (passwordError) passwordError.style.display = 'block';
            return;
        }
        
        if (newPassword.value.length < 6) {
            if (passwordError) passwordError.textContent = 'New password must be at least 6 characters';
            if (passwordError) passwordError.style.display = 'block';
            return;
        }
        
        // Change password
        const success = await UserProfile.changePassword(currentPassword.value, newPassword.value);
        
        if (success) {
            showToast('Password changed successfully', 'success');
            passwordForm.reset();
            if (passwordError) passwordError.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error changing password:', error);
        
        let errorMessage;
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage = 'Current password is incorrect';
                break;
            default:
                errorMessage = error.message;
        }
        
        if (passwordError) passwordError.textContent = errorMessage;
        if (passwordError) passwordError.style.display = 'block';
        showToast(errorMessage, 'error');
    }
}

// --- Dashboard Analytics Charts ---
let appointmentsTrendsChart = null;
let appointmentsStatusChart = null;
async function loadDashboardCharts() {
    // Destroy previous charts if they exist
    if (window.Chart) {
        if (appointmentsTrendsChart) appointmentsTrendsChart.destroy();
        if (appointmentsStatusChart) appointmentsStatusChart.destroy();
    }
    // Fetch all appointments for this student
    const user = auth.currentUser;
    if (!user) return;
    const apptSnap = await db.collection('appointments')
        .where('studentId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();
    const appts = apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Debug: log all appointments
    console.log('Student appointments for chart:', appts.map(a => ({id: a.id, status: a.status, date: a.date, appointmentDate: a.appointmentDate})));
    // --- Appointments Trend (last 6 months) ---
    const months = [];
    const monthLabels = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthLabels.push(label);
        months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
    }
    // Count appointments per month (support both 'date' and 'appointmentDate')
    const monthCounts = months.map(({ y, m }) =>
        appts.filter(a => {
            let apptYear, apptMonth;
            if (a.date && typeof a.date === 'string') {
                const [yy, mm] = a.date.split('-');
                apptYear = parseInt(yy);
                apptMonth = parseInt(mm);
            } else if (a.appointmentDate && a.appointmentDate.toDate) {
                const d = a.appointmentDate.toDate();
                apptYear = d.getFullYear();
                apptMonth = d.getMonth() + 1;
            } else {
                return false;
            }
            return apptYear === y && apptMonth === m;
        }).length
    );
    const ctxTrends = document.getElementById('appointmentsTrendsChart').getContext('2d');
    appointmentsTrendsChart = new Chart(ctxTrends, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Appointments',
                data: monthCounts,
                borderColor: '#5b7cfa',
                backgroundColor: 'rgba(91,124,250,0.12)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#5b7cfa',
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision:0 } } },
            responsive: true,
            maintainAspectRatio: true,
        }
    });
    // --- Status Breakdown ---
    const statusCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    appts.forEach(a => {
        const s = (a.status || '').toLowerCase();
        if (statusCounts[s] !== undefined) statusCounts[s]++;
    });
    // Debug: log status counts
    console.log('Status counts for chart:', statusCounts);
    const ctxStatus = document.getElementById('appointmentsStatusChart').getContext('2d');
    appointmentsStatusChart = new Chart(ctxStatus, {
        type: 'pie',
        data: {
            labels: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
            datasets: [{
                data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected, statusCounts.cancelled],
                backgroundColor: ['#f39c12','#27ae60','#e74c3c','#888'],
                borderWidth: 1
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } },
            responsive: true,
            maintainAspectRatio: true,
        }
    });
}

// Load Approved Appointments Tab
async function loadApprovedAppointmentsTab() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        // Fetch all appointments for this student (like dashboard calendar)
        const snapshot = await db.collection('appointments')
            .where('studentId', '==', user.uid)
            .orderBy('appointmentDate')
            .get();
        let allAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Debug: log all fetched appointments
        console.log('[DEBUG] All appointments fetched for Approved tab:', allAppointments);
        // Filter for approved/confirmed status
        let approvedAppointments = allAppointments.filter(a => {
            const status = (a.status || '').toLowerCase();
            return status === 'approved' || status === 'confirmed';
        });
        // Debug: log filtered approved/confirmed appointments
        console.log('[DEBUG] Filtered approved/confirmed appointments:', approvedAppointments);
        if (approvedAppointments.length === 0) {
            if (noApprovedAppointments) noApprovedAppointments.style.display = 'block';
            if (approvedAppointmentsList) approvedAppointmentsList.innerHTML = '';
            return;
        }
        if (noApprovedAppointments) noApprovedAppointments.style.display = 'none';
        if (approvedAppointmentsList) approvedAppointmentsList.innerHTML = '';
        approvedAppointments.forEach(appointment => {
            let appointmentDate = null;
            let dateConversionError = null;
            if (appointment.appointmentDate && typeof appointment.appointmentDate.toDate === 'function') {
                try {
                    appointmentDate = appointment.appointmentDate.toDate();
                } catch (err) {
                    dateConversionError = err;
                }
            } else if (typeof appointment.appointmentDate === 'string' || typeof appointment.appointmentDate === 'number') {
                appointmentDate = new Date(appointment.appointmentDate);
            } else {
                return;
            }
            if (dateConversionError || isNaN(appointmentDate.getTime())) {
                return;
            }
            const dateString = appointmentDate.toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
            });
            const timeString = appointmentDate.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', hour12: true
            });
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'appointment-item';
            appointmentElement.innerHTML = `
                <div class="appointment-details">
                    <p class="appointment-title"><span class="status-confirmed">Approved</span></p>
                    <p class="appointment-date"><i class="fas fa-calendar"></i> ${dateString} at ${timeString}</p>
                    <p class="appointment-counselor"><i class="fas fa-user"></i> With ${appointment.counselorName}</p>
                    <p class="appointment-reason"><strong>Reason:</strong> ${appointment.reason}</p>
                    ${appointment.notes ? `<p class="appointment-notes"><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                </div>
            `;
            // Make the whole appointment item clickable
            appointmentElement.style.cursor = 'pointer';
            appointmentElement.addEventListener('click', () => {
                showAppointmentDetailsModal(appointment);
            });
            approvedAppointmentsList.appendChild(appointmentElement);
        });
    } catch (error) {
        console.error('Error loading approved appointments tab:', error);
    }
}

// --- Calendar Logic ---
let calendarInitialized = false;
let calendarInstance = null;

async function loadCalendarAppointments() {
    const calendarEl = document.getElementById('appointments-calendar');
    if (!calendarEl) return;
    calendarEl.innerHTML = '';
    // Fetch all appointments for this student
    const user = auth.currentUser;
    if (!user) return;
    const snapshot = await db.collection('appointments')
        .where('studentId', '==', user.uid)
        .orderBy('appointmentDate')
        .get();
    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Debug log
    console.log('[DEBUG] All appointments for calendar:', appointments.map(a => ({id: a.id, status: a.status, appointmentDate: a.appointmentDate, reason: a.reason, counselorName: a.counselorName, type: typeof a.appointmentDate})));
    const statusColors = {
        approved: '#27ae60',
        pending: '#f39c12',
        scheduled: '#5b7cfa',
        confirmed: '#5b7cfa',
        rejected: '#e74c3c',
        cancelled: '#888'
    };
    const events = appointments.map(appt => {
        // Log the full appointment object
        console.log('[DEBUG] Calendar appointment object:', appt);
        let start = null;
        let dateConversionError = null;
        if (appt.appointmentDate && typeof appt.appointmentDate.toDate === 'function') {
            try {
            start = appt.appointmentDate.toDate();
                console.log('[DEBUG] calendar appointmentDate.toDate():', start, 'type:', typeof start);
            } catch (err) {
                dateConversionError = err;
                console.error('[ERROR] calendar appointmentDate.toDate() failed:', err, appt.appointmentDate);
            }
        } else if (typeof appt.appointmentDate === 'string' || typeof appt.appointmentDate === 'number') {
            start = new Date(appt.appointmentDate);
            console.log('[DEBUG] calendar appointmentDate as Date:', start, 'type:', typeof start);
        } else {
            console.warn('[WARN] Skipping calendar event with invalid appointmentDate:', appt.id, appt.appointmentDate, typeof appt.appointmentDate);
            return null;
        }
        if (dateConversionError || isNaN(start.getTime())) {
            console.warn('[WARN] Skipping calendar event with unparseable date:', appt.id, appt.appointmentDate);
            return null;
        }
        const status = (appt.status || 'pending').toLowerCase();
        return {
            id: appt.id,
            title: appt.reason || 'Appointment',
            start,
            backgroundColor: statusColors[status] || '#5b7cfa',
            borderColor: statusColors[status] || '#5b7cfa',
            extendedProps: { appt }
        };
    }).filter(Boolean);
    // Initialize FullCalendar
    if (window.studentCalendarInstance) window.studentCalendarInstance.destroy();
    window.studentCalendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 600,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events,
        eventClick: function(info) {
            const appt = info.event.extendedProps.appt;
            if (appt) showAppointmentDetailsModal(appt);
        },
        eventDisplay: 'block',
        nowIndicator: true,
        selectable: false,
        editable: false,
        dayMaxEvents: true
    });
    window.studentCalendarInstance.render();
}

// --- Student Appointment Details Modal ---
function showAppointmentDetailsModal(appt) {
    // Remove any existing modal
    let modal = document.getElementById('studentAppointmentDetailsModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'studentAppointmentDetailsModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px;min-width:320px;position:relative;max-height:90vh;overflow-y:auto;">
            <button class="close" id="closeStudentAppointmentDetailsModal" type="button" aria-label="Close">&times;</button>
            <h2 style="margin-top:0;margin-bottom:1.2rem;font-size:1.25rem;font-weight:700;letter-spacing:0.5px;">Appointment Details</h2>
            <div style="margin-bottom:0.5rem;"><b>Counselor:</b> ${appt.counselorName || 'N/A'}</div>
            <div style="margin-bottom:0.5rem;"><b>Date:</b> ${appt.date || (appt.appointmentDate && appt.appointmentDate.toDate ? appt.appointmentDate.toDate().toLocaleDateString() : 'N/A')}</div>
            <div style="margin-bottom:0.5rem;"><b>Time:</b> ${appt.time || (appt.appointmentDate && appt.appointmentDate.toDate ? appt.appointmentDate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A')}</div>
            <div style="margin-bottom:0.5rem;"><b>Status:</b> <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${appt.status === 'approved' ? '#27ae60' : appt.status === 'rejected' ? '#e74c3c' : appt.status === 'cancelled' ? '#888' : '#f39c12'};color:#fff;font-size:0.95em;">${appt.status || 'N/A'}</span></div>
            <div style="margin-bottom:0.5rem;"><b>Reason:</b> ${appt.reason || ''}</div>
            <div style="margin-bottom:0.5rem;"><b>Notes:</b> ${appt.notes || appt.note || ''}</div>
            <div style="margin-bottom:0.5rem;"><b>Created At:</b> ${(appt.createdAt && appt.createdAt.toDate) ? appt.createdAt.toDate().toLocaleString() : ''}</div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeStudentAppointmentDetailsModal').onclick = () => closeModalWithAnimation(modal);
    modal.onclick = e => { if (e.target === modal) closeModalWithAnimation(modal); };
}

// --- Home Section Dynamic Content ---
async function loadHomeSection() {
    // Set student name
    const user = auth.currentUser;
    if (user) {
        const name = user.displayName || (window._studentUserData && window._studentUserData.name) || 'Student';
        const nameEls = [document.getElementById('home-student-name'), document.getElementById('student-name')];
        nameEls.forEach(el => { if (el) el.textContent = name; });
    }
    // Announcements
    const annDiv = document.getElementById('home-announcements');
    if (annDiv) {
        annDiv.innerHTML = '<div class="no-data-message">Loading announcements...</div>';
        const snap = await db.collection('announcements')
            .where('audience', 'in', ['student', 'all'])
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        if (snap.empty) {
            annDiv.innerHTML = '<div class="no-data-message">No announcements at this time.</div>';
        } else {
            annDiv.innerHTML = '';
            snap.forEach(doc => {
                const a = doc.data();
                const dateStr = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleDateString() : '';
                annDiv.innerHTML += `
                    <div class="announcement-card">
                        <strong>${a.title || 'Announcement'}</strong>
                        <p>${a.message || ''}</p>
                        <span style="color:#888;font-size:0.95em;">Posted by ${a.author || 'Admin'} • ${dateStr}</span>
                    </div>
                `;
            });
        }
    }
    // Quick Stats
    const upCountEl = document.getElementById('home-upcoming-count');
    const resCountEl = document.getElementById('home-resource-count');
    if (upCountEl) upCountEl.textContent = '...';
    if (resCountEl) resCountEl.textContent = '...';
    // Upcoming appointments
    let upCount = 0;
    if (user) {
        const now = new Date();
        const upSnap = await db.collection('appointments')
            .where('studentId', '==', user.uid)
            .where('status', 'in', ['pending', 'confirmed', 'approved'])
            .where('appointmentDate', '>=', now)
            .get();
        upCount = upSnap.size;
    }
    if (upCountEl) upCountEl.textContent = upCount;
    // Resources
    const resSnap = await db.collection('resources').get();
    if (resCountEl) resCountEl.textContent = resSnap.size;
    // Recent Activity (last 5 appointments/resources)
    const actDiv = document.getElementById('home-activity-feed');
    if (actDiv) {
        actDiv.innerHTML = '<div class="no-data-message">Loading activity...</div>';
        let activity = [];
        // Appointments
        if (user) {
            const apptSnap = await db.collection('appointments')
                .where('studentId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();
            apptSnap.forEach(doc => {
                const a = doc.data();
                activity.push({
                    type: 'appointment',
                    date: a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : null,
                    desc: `Appointment (${a.status || 'pending'}) with ${a.counselorName || 'counselor'}`
                });
            });
        }
        // Resources
        const resSnap2 = await db.collection('resources').orderBy('createdAt', 'desc').limit(2).get();
        resSnap2.forEach(doc => {
            const r = doc.data();
            activity.push({
                type: 'resource',
                date: r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : null,
                desc: `New resource: ${r.title || 'Untitled'}`
            });
        });
        // Sort by date desc
        activity = activity.filter(a => a.date).sort((a, b) => b.date - a.date).slice(0, 5);
        if (activity.length === 0) {
            actDiv.innerHTML = '<div class="no-data-message">No recent activity.</div>';
        } else {
            actDiv.innerHTML = '<ul style="list-style:none;padding:0;">' +
                activity.map(a => `<li style="margin-bottom:0.85rem;display:flex;align-items:center;gap:0.75rem;">
                    ${a.type === 'appointment' ? '<i class=\'fas fa-calendar-check\' style=\'color:#5b7cfa\'></i>' : '<i class=\'fas fa-book\' style=\'color:#27ae60\'></i>'}
                    <span><b>${a.desc}</b><br><span style='font-size:0.95em;color:#888;'>${a.date ? a.date.toLocaleString() : ''}</span></span>
                </li>`).join('') + '</ul>';
        }
    }
    // Quick Actions
    const bookBtn = document.getElementById('home-book-appointment-btn');
    if (bookBtn) bookBtn.onclick = () => {
        // Open appointment modal
        if (typeof openAppointmentModal === 'function') openAppointmentModal();
        // Switch to appointments section
        const sec = document.querySelector('[data-section="appointments"]');
        if (sec) sec.click();
    };
    const calBtn = document.getElementById('home-view-calendar-btn');
    if (calBtn) calBtn.onclick = null;
}

// Run on page load if Home is active
if (document.getElementById('home-section')?.classList.contains('active')) {
    loadHomeSection();
}
// Optionally, add logic to reload Home section when navigating to it
const homeNav = document.querySelector('[data-section="home"]');
if (homeNav) {
    homeNav.addEventListener('click', () => {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('home-section').classList.add('active');
        loadHomeSection();
    });
}

// --- Modal Animation Helper ---
function closeModalWithAnimation(modal) {
    if (!modal) return;
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('modal-closing');
        modalContent.addEventListener('animationend', function handler() {
            modalContent.classList.remove('modal-closing');
            modal.style.display = 'none';
            modalContent.removeEventListener('animationend', handler);
        });
    } else {
        modal.style.display = 'none';
    }
}

// --- Section Fade Transition Helper ---
function transitionToSection(newSection) {
    const sections = document.querySelectorAll('.section');
    const current = document.querySelector('.section.active');
    if (current && current !== newSection) {
        current.classList.remove('active');
        current.classList.add('fade-out');
        current.style.opacity = 0;
        setTimeout(() => {
            current.style.display = 'none';
            current.classList.remove('fade-out');
            newSection.style.display = 'block';
            newSection.classList.add('fade-in');
            setTimeout(() => {
                newSection.classList.add('active');
                newSection.style.opacity = 1;
                newSection.classList.remove('fade-in');
            }, 450); // match fadeInSection duration
        }, 350); // match fadeOutSection duration
    } else {
        newSection.style.display = 'block';
        newSection.classList.add('fade-in');
        setTimeout(() => {
            newSection.classList.add('active');
            newSection.style.opacity = 1;
            newSection.classList.remove('fade-in');
        }, 450);
    }
    // Hide all other sections
    sections.forEach(sec => {
        if (sec !== newSection) {
            sec.classList.remove('active');
            sec.style.opacity = 0;
            sec.style.display = 'none';
            sec.classList.remove('fade-in', 'fade-out');
        }
    });
}

// --- Sidebar Avatar/Name Update Helper ---
function updateSidebarUserInfo(user) {
    const name = user.displayName || user.name || user.email || 'Student';
    const avatarUrl = user.photoURL
        ? user.photoURL
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5b7cfa&color=fff&size=128`;
    const nameEl = document.getElementById('sidebarUserName');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.src = avatarUrl;
    // Also update top bar if needed
    const topNameEl = document.getElementById('student-name');
    const topAvatarEl = document.getElementById('user-avatar');
    if (topNameEl) topNameEl.textContent = name;
    if (topAvatarEl) topAvatarEl.src = avatarUrl;
}

// --- Sidebar Collapse/Expand Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.collapsible-sidebar');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const collapseIcon = document.getElementById('sidebarCollapseIcon');
  const navLinks = document.querySelectorAll('.sidebar-link');

  // Restore state from localStorage (desktop only)
  function setSidebarCollapsed(collapsed) {
    if (!sidebar) return;
    if (collapsed) {
      sidebar.classList.add('collapsed');
      if (collapseIcon) collapseIcon.style.transform = 'rotate(180deg)';
      localStorage.setItem('studentSidebarCollapsed', 'true');
    } else {
      sidebar.classList.remove('collapsed');
      if (collapseIcon) collapseIcon.style.transform = '';
      localStorage.setItem('studentSidebarCollapsed', 'false');
    }
  }
  function isMobile() {
    return window.innerWidth <= 900;
  }
  // Collapse/expand logic
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isMobile()) {
        sidebar.classList.toggle('open');
      } else {
        setSidebarCollapsed(!sidebar.classList.contains('collapsed'));
      }
    });
  }
  // Restore sidebar state on desktop
  if (sidebar && !isMobile() && localStorage.getItem('studentSidebarCollapsed') === 'true') {
    setSidebarCollapsed(true);
  }
  // Remove overlay/sidebar open on resize to desktop
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      sidebar.classList.remove('open');
      if (localStorage.getItem('studentSidebarCollapsed') === 'true') {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    }
  });
  // Close sidebar on nav link click (mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (isMobile()) {
        sidebar.classList.remove('open');
      }
    });
  });

  // --- Navigation Section Switching ---
  const sectionMap = {
    'nav-dashboard': 'dashboard-section',
    'nav-appointments': 'appointments-section',
    'nav-announcements': 'home-section', // Home/Announcements section
    'nav-resources': 'resources-section',
    'nav-profile': 'profile-section',
  };
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // Show the correct section
      Object.values(sectionMap).forEach(secId => {
        const sec = document.getElementById(secId);
        if (sec) sec.classList.remove('active');
      });
      const targetId = sectionMap[link.id];
      if (targetId) {
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');
      }
    });
  });
});

// Initialize Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Ensure only students can access
    initializeDashboard();
    // On page load, update sidebar avatar and name with latest Firestore data
    AuthHelper.checkUserRole('student').then(result => {
        if (result && result.user && result.userData) {
            updateSidebarUserInfo({
                displayName: result.user.displayName || result.userData.name,
                name: result.userData.name,
                email: result.user.email,
                photoURL: result.user.photoURL || result.userData.photoURL
            });
        }
        // Always show Home/Announcements section as default
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const homeSection = document.getElementById('home-section');
        if (homeSection) homeSection.classList.add('active');
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        const navAnnouncements = document.getElementById('nav-announcements');
        if (navAnnouncements) navAnnouncements.classList.add('active');
        loadHomeSection();
    });
    // Personalize welcome banner
    const welcomeName = document.getElementById('dashboard-welcome-name');
    const welcomeAvatar = document.getElementById('dashboard-welcome-avatar-img');
    const user = auth.currentUser;
    if (user) {
        const name = user.displayName || (window._studentUserData && window._studentUserData.name) || 'Student';
        if (welcomeName) welcomeName.textContent = name;
        if (welcomeAvatar) welcomeAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5b7cfa&color=fff&size=128`;
    }
    // Rotating motivational/wellness tips
    const tips = [
        "Your mental health matters. Take a deep breath and keep going!",
        "Remember to take breaks and hydrate regularly!",
        "Progress, not perfection. Celebrate small wins!",
        "Reach out if you need support—you're not alone.",
        "Balance your studies with self-care and rest.",
        "A positive mindset brings positive things.",
        "You are stronger than you think!"
    ];
    let tipIdx = 0;
    const motivation = document.getElementById('dashboard-motivation');
    const wellnessTip = document.getElementById('wellness-tip');
    function rotateTip() {
        tipIdx = (tipIdx + 1) % tips.length;
        if (motivation) motivation.textContent = tips[tipIdx];
        if (wellnessTip) wellnessTip.textContent = tips[(tipIdx + 2) % tips.length];
    }
    setInterval(rotateTip, 7000);
    // Quick action buttons
    const quickBook = document.getElementById('dashboard-quick-book');
    if (quickBook) quickBook.onclick = () => {
        const apptNav = document.querySelector('.sidebar-menu a[data-section="appointments"]');
        if (apptNav) apptNav.click();
        if (typeof openAppointmentModal === 'function') openAppointmentModal();
    };
    const quickRes = document.getElementById('dashboard-quick-resources');
    if (quickRes) quickRes.onclick = () => {
        const resNav = document.getElementById('nav-resources');
        if (resNav) resNav.click();
    };
    // Animate stat counters
    function animateCounter(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        let count = 0;
        const step = Math.ceil(target / 30) || 1;
        const interval = setInterval(() => {
            count += step;
            if (count >= target) {
                el.textContent = target;
                clearInterval(interval);
            } else {
                el.textContent = count;
            }
        }, 18);
    }
    // Wait for stats to be loaded, then animate
    setTimeout(() => {
        animateCounter('upcoming-count', parseInt(document.getElementById('upcoming-count')?.textContent || '0'));
        animateCounter('past-count', parseInt(document.getElementById('past-count')?.textContent || '0'));
        animateCounter('resource-count', parseInt(document.getElementById('resource-count')?.textContent || '0'));
    }, 800);
    // --- Dashboard Mini Calendar & Wellness Widget Logic ---
    document.addEventListener('DOMContentLoaded', async () => {
        // Mini Calendar: show today's date
        const miniCalDate = document.getElementById('mini-calendar-date');
        if (miniCalDate) {
            const today = new Date();
            miniCalDate.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
        // Mini Calendar: show up to 2 upcoming appointments
        const miniCalUpcoming = document.getElementById('mini-calendar-upcoming');
        if (miniCalUpcoming && typeof Appointments !== 'undefined') {
            try {
                const appts = await Appointments.getUpcomingAppointments();
                if (!appts || appts.length === 0) {
                    miniCalUpcoming.innerHTML = '<span style="color:#b0b8d1;">No upcoming appointments.</span>';
                } else {
                    miniCalUpcoming.innerHTML = '';
                    appts.slice(0,2).forEach(appt => {
                        const date = appt.appointmentDate && appt.appointmentDate.toDate ? appt.appointmentDate.toDate() : new Date();
                        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                        miniCalUpcoming.innerHTML += `<div class="mini-calendar-appointment"><i class='fas fa-user'></i> ${appt.counselorName || 'Counselor'}<span style='margin-left:auto;'><i class='fas fa-clock'></i> ${time}</span></div>`;
                    });
                }
            } catch (err) {
                miniCalUpcoming.innerHTML = '<span style="color:#b0b8d1;">Unable to load appointments.</span>';
            }
        }
        // Wellness Widget: rotate tips
        const wellnessTips = [
            "Stay hydrated and take regular breaks!",
            "Remember to stretch and move around every hour.",
            "A positive mindset brings positive results.",
            "Don't hesitate to reach out for support.",
            "Balance your studies with self-care and rest.",
            "Progress, not perfection. Celebrate small wins!",
            "Your mental health matters. Take a deep breath and keep going!"
        ];
        let wellnessIdx = 0;
        const wellnessTipEl = document.getElementById('wellness-widget-tip');
        function rotateWellnessTip() {
            wellnessIdx = (wellnessIdx + 1) % wellnessTips.length;
            if (wellnessTipEl) wellnessTipEl.textContent = wellnessTips[wellnessIdx];
        }
        setInterval(rotateWellnessTip, 7000);
    });
});

// Global function to open the appointment modal with animation
function openAppointmentModal() {
    resetAppointmentForm();
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    if (appointmentDate) appointmentDate.min = todayString;
    if (appointmentModal) {
        appointmentModal.classList.add('show');
        appointmentModal.classList.remove('hide');
        appointmentModal.style.display = 'flex';
        const modalContent = appointmentModal.querySelector('.modal-content');
        if (modalContent) modalContent.classList.remove('modal-closing');
    }
}

// --- Unified Student Calendar Rendering ---
function renderStudentCalendar(targetElementId) {
    const calendarEl = document.getElementById(targetElementId);
    if (!calendarEl) return;
    // Destroy previous instance if exists
    if (calendarEl._calendarInstance) {
        calendarEl._calendarInstance.destroy();
        calendarEl._calendarInstance = null;
    }
    // Fetch all appointments for this student
    const user = auth.currentUser;
    if (!user) return;
    db.collection('appointments')
        .where('studentId', '==', user.uid)
        .orderBy('appointmentDate')
        .get()
        .then(snapshot => {
            const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const statusColors = {
                approved: '#27ae60',
                pending: '#f39c12',
                scheduled: '#5b7cfa',
                confirmed: '#5b7cfa',
                rejected: '#e74c3c',
                cancelled: '#888'
            };
            const events = appointments.map(appt => {
                let start = null;
                let dateConversionError = null;
                if (appt.appointmentDate && typeof appt.appointmentDate.toDate === 'function') {
                    try {
                        start = appt.appointmentDate.toDate();
                    } catch (err) {
                        dateConversionError = err;
                    }
                } else if (typeof appt.appointmentDate === 'string' || typeof appt.appointmentDate === 'number') {
                    start = new Date(appt.appointmentDate);
                } else {
                    return null;
                }
                if (dateConversionError || isNaN(start.getTime())) {
                    return null;
                }
                const status = (appt.status || 'pending').toLowerCase();
                return {
                    id: appt.id,
                    title: appt.reason || 'Appointment',
                    start,
                    backgroundColor: statusColors[status] || '#5b7cfa',
                    borderColor: statusColors[status] || '#5b7cfa',
                    extendedProps: { appt }
                };
            }).filter(Boolean);
            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                height: 400,
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                events,
                eventClick: function(info) {
                    const appt = info.event.extendedProps.appt;
                    if (appt) showAppointmentDetailsModal(appt);
                },
                eventDisplay: 'block',
                nowIndicator: true,
                selectable: false,
                editable: false,
                dayMaxEvents: true
            });
            calendar.render();
            calendarEl._calendarInstance = calendar;
        });
}

// --- Remove old calendar logic and use unified function ---
// Render calendar on page load and when dashboard section is shown
if (document.getElementById('appointments-calendar')) {
    renderStudentCalendar('appointments-calendar');
}
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('appointments-calendar')) {
        renderStudentCalendar('appointments-calendar');
    }
    // Optionally, re-render when switching to dashboard section
    const dashboardNav = document.getElementById('nav-dashboard');
    if (dashboardNav) {
        dashboardNav.addEventListener('click', () => {
            setTimeout(() => {
                if (document.getElementById('appointments-calendar')) {
                    renderStudentCalendar('appointments-calendar');
                }
            }, 300);
        });
    }
    // Re-render when switching to Appointments section and Calendar tab
    const appointmentsNav = document.getElementById('nav-appointments');
    if (appointmentsNav) {
        appointmentsNav.addEventListener('click', () => {
            setTimeout(() => {
                // Only render if Calendar tab is active
                const calendarTab = document.getElementById('calendar-tab');
                if (calendarTab && calendarTab.classList.contains('active')) {
                    renderStudentCalendar('appointments-calendar');
                }
            }, 300);
        });
    }
    // Also re-render when Calendar tab is clicked
    const calendarTabBtn = document.querySelector('.appointment-tab[data-tab="calendar"]');
    if (calendarTabBtn) {
        calendarTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                renderStudentCalendar('appointments-calendar');
                // After rendering, force FullCalendar to resize to fit the container
                setTimeout(() => {
                    const calendarEl = document.getElementById('appointments-calendar');
                    if (calendarEl && calendarEl._calendarInstance) {
                        calendarEl._calendarInstance.updateSize();
                    }
                }, 250);
            }, 200);
        });
    }
}); 