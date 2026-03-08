// Admin Dashboard JavaScript

// DOM elements for navigation
const dashboardLink = document.querySelector('.sidebar-menu li:nth-child(1) a');
const usersLink = document.getElementById('usersLink');
const appointmentsLink = document.getElementById('appointmentsLink');
const resourcesLink = document.getElementById('resourcesLink');
const settingsLink = document.getElementById('settingsLink');
const profileLink = document.getElementById('profileLink');

// DOM elements for sections
const dashboardSection = document.getElementById('dashboardSection');
const usersSection = document.getElementById('usersSection');
const appointmentsSection = document.getElementById('appointmentsSection');
const resourcesSection = document.getElementById('resourcesSection');
const settingsSection = document.getElementById('settingsSection');
const profileSection = document.getElementById('profileSection');

// DOM elements for user management
const roleFilter = document.getElementById('roleFilter');
const createUserBtn = document.getElementById('createUserBtn');
const createUserModal = document.getElementById('createUserModal');
const createUserForm = document.getElementById('createUserForm');
const userError = document.getElementById('userError');

// DOM elements for appointment management
const statusFilter = document.getElementById('statusFilter');
const dateFilter = document.getElementById('dateFilter');

// DOM elements for resource management
const categoryFilter = document.getElementById('categoryFilter');
const counselorFilter = document.getElementById('counselorFilter');
const uploadResourceBtn = document.getElementById('uploadResourceBtn');
const resourceModal = document.getElementById('resourceModal');
const resourceForm = document.getElementById('resourceForm');
const resourceFormError = document.getElementById('resourceFormError');

// DOM elements for settings
const generalSettingsForm = document.getElementById('generalSettingsForm');
const appointmentSettingsForm = document.getElementById('appointmentSettingsForm');
const categorySettingsForm = document.getElementById('categorySettingsForm');
const addCategoryBtn = document.getElementById('addCategoryBtn');

// DOM elements for profile
const updateProfileBtn = document.getElementById('updateProfileBtn');
const changePasswordForm = document.getElementById('changePasswordForm');
const passwordError = document.getElementById('passwordError');
const closeButtons = document.querySelectorAll('.close');

// Application state
let currentUserData = null;

// --- Appointments Pagination & Search ---
let appointmentsSearchTerm = '';
let appointmentsCurrentPage = 1;
const APPOINTMENTS_PER_PAGE = 10;
let appointmentsCache = [];

// --- Resources Pagination & Search ---
let resourcesSearchTerm = '';
let resourcesCurrentPage = 1;
const RESOURCES_PER_PAGE = 10;
let resourcesCache = [];
let lastDeletedResources = [];

function filterAppointmentsBySearch(appointments, term) {
    if (!term) return appointments;
    const t = term.toLowerCase();
    return appointments.filter(a =>
        (a.studentName && a.studentName.toLowerCase().includes(t)) ||
        (a.counselorName && a.counselorName.toLowerCase().includes(t))
    );
}

function paginateAppointments(appointments, page = 1, perPage = APPOINTMENTS_PER_PAGE) {
    const total = appointments.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
        appointments: appointments.slice(start, end),
        total,
        totalPages,
        page
    };
}

function renderAppointmentsPaginationControls(totalPages, page, onPageChange) {
    let controls = document.getElementById('appointmentsPagination');
    if (!controls) {
        controls = document.createElement('div');
        controls.id = 'appointmentsPagination';
        controls.style.display = 'flex';
        controls.style.justifyContent = 'center';
        controls.style.margin = '20px 0';
        controls.style.gap = '8px';
        document.getElementById('appointmentsContainer').parentNode.appendChild(controls);
    }
    controls.innerHTML = '';
    if (totalPages <= 1) {
        controls.style.display = 'none';
        return;
    }
    controls.style.display = 'flex';
    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.className = 'btn secondary-btn';
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => onPageChange(page - 1);
    controls.appendChild(prevBtn);
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'btn' + (i === page ? ' primary-btn' : ' secondary-btn');
        btn.disabled = i === page;
        btn.onclick = () => onPageChange(i);
        controls.appendChild(btn);
    }
    // Next
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'btn secondary-btn';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => onPageChange(page + 1);
    controls.appendChild(nextBtn);
}

// Check for authorized access
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is admin
        const authResult = await AuthHelper.checkUserRole('admin');
        
        if (authResult) {
            // Store user data
            currentUserData = authResult.userData;
            
            // Initialize admin dashboard
            initializeAdminDashboard();
            // Setup Announcements tab after dashboard and DOM are ready
            setupAdminNavigationAnnouncements(currentUserData);
            await loadProfileData();
            // Update sidebar avatar and name on load
            updateSidebarUserInfo(auth.currentUser);
        }
    } catch (error) {
        console.error("Error initializing admin dashboard:", error);
        document.body.innerHTML = `<div style="padding: 20px; text-align: center;">
            <h2>Authentication Error</h2>
            <p>${error.message}</p>
            <p>Please check the console for more details.</p>
            <a href="../../index.html">Return to Login</a>
        </div>`;
    }
});

// Initialize Dashboard
function initializeAdminDashboard() {
    // Set up navigation
    setupNavigation();
    
    // Set up user management
    setupUserManagement();
    
    // Set up appointment management
    setupAppointmentManagement();
    
    // Set up resource management
    setupResourceManagement();
    
    // Set up settings
    setupSettings();
    
    // Set up profile
    setupProfile();
    
    // Load initial dashboard data
    loadDashboardData();
    
    // Set up modal close buttons
    if (typeof closeButtons !== 'undefined' && closeButtons && typeof closeButtons.forEach === 'function') {
        closeButtons.forEach(button => {
            if (button && typeof button.addEventListener === 'function') {
                button.addEventListener('click', () => {
                    // Find the closest parent with class 'modal'
                    const modal = button.closest('.modal');
                    if (modal) {
                        closeModalWithAnimation(modal);
                    }
                });
            } else {
                console.warn('A close button is missing or not an element:', button);
            }
        });
    } else {
        console.warn('closeButtons is not defined or not iterable.');
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const createUserModal = document.getElementById('createUserModal');
        const resourceModal = document.getElementById('resourceModal');
        if (createUserModal && e.target === createUserModal) {
            closeModalWithAnimation(createUserModal);
        }
        if (resourceModal && e.target === resourceModal) {
            closeModalWithAnimation(resourceModal);
        }
        // Announcement modal
        const announcementModal = document.getElementById('announcementModal');
        if (announcementModal && e.target === announcementModal) {
            closeModalWithAnimation(announcementModal);
        }
    });
}

// --- Section Fade Transition Helper ---
function transitionToSection(newSection) {
  const sections = document.querySelectorAll('.section');
  const activeSection = document.querySelector('.section.active');
  if (activeSection && activeSection !== newSection) {
    // Fade out current
    activeSection.classList.remove('active');
    activeSection.style.opacity = 0;
    setTimeout(() => {
      activeSection.style.display = 'none';
      // Fade in new
      newSection.style.display = 'block';
      setTimeout(() => {
        newSection.classList.add('active');
        newSection.style.opacity = 1;
      }, 10);
    }, 300); // match CSS transition duration
  } else {
    // No active section, just show new
    newSection.style.display = 'block';
    setTimeout(() => {
      newSection.classList.add('active');
      newSection.style.opacity = 1;
    }, 10);
  }
}

// Setup Navigation
function setupNavigation() {
    const navLinks = [
        { id: 'nav-dashboard', section: 'dashboardSection' },
        { id: 'nav-appointments', section: 'appointmentsSection' },
        { id: 'nav-announcements', section: 'section-announcements' },
        { id: 'nav-resources', section: 'resourcesSection' },
        { id: 'nav-users', section: 'usersSection' },
        { id: 'nav-profile', section: 'profileSection' }
    ];
    navLinks.forEach(({ id, section }) => {
        const link = document.getElementById(id);
        const sec = document.getElementById(section);
        if (link && sec) {
            link.addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                // Fade transition between sections
                transitionToSection(sec);
                // Load data for Appointments, Resources, Users
                if (id === 'nav-appointments') loadAllAppointments();
                if (id === 'nav-resources') loadAllResources();
                if (id === 'nav-users' && typeof usersModule !== 'undefined' && usersModule.loadUsers) usersModule.loadUsers();
            });
        }
    });
    // Logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            AuthHelper.signOut();
        });
    }
}

// Show active section
function showSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.classList.remove('active'));
    
    // Show the selected section
    section.classList.add('active');
}

// Set active link
function setActiveLink(link) {
    // Remove active class from all links
    const links = document.querySelectorAll('.sidebar-menu a');
    links.forEach(l => l.classList.remove('active'));
    
    // Add active class to selected link
    link.classList.add('active');
}

// Setup User Management
function setupUserManagement() {
    // Role Filter Change
    if (roleFilter) {
        roleFilter.addEventListener('change', () => {
            const role = roleFilter.value;
            usersModule.loadUsers(role);
        });
    }
    
    // Create User Button
    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => {
            showCreateUserModal();
        });
    }
    
    // Create User Form Submission
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = createUserForm.createName.value;
            const email = createUserForm.createEmail.value;
            const password = createUserForm.createPassword.value;
            const role = createUserForm.createRole.value;
            
            try {
                // Get admin credentials for re-authentication after creating user
                const adminUser = auth.currentUser;
                
                if (!adminUser) {
                    throw new Error('You need to be logged in as an admin to create users.');
                }
                
                const userData = {
                    name,
                    email,
                    role
                };
                
                // Create user
                const newUser = await usersModule.createUser(userData, password);
                
                if (newUser) {
                    // Close modal
                    closeModalWithAnimation(createUserModal);
                    
                    // Reset form
                    createUserForm.reset();
                    
                    // Refresh users list
                    usersModule.loadUsers(roleFilter.value);
                    
                    // If on dashboard, refresh dashboard data
                    if (dashboardSection.classList.contains('active')) {
                        loadDashboardData();
                    }
                    
                    // Show success message
                    alert(`User ${name} (${role}) created successfully.`);
                }
            } catch (error) {
                console.error('Error creating user:', error);
                document.getElementById('createUserError').textContent = error.message;
            }
        });
    }
}

// Show Create User Modal
function showCreateUserModal() {
    // Reset form
    createUserForm.reset();
    document.getElementById('createUserError').textContent = '';
    
    // Show modal
    createUserModal.style.display = 'block';
}

// Setup Appointment Management
function setupAppointmentManagement() {
    // Status Filter Change
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            filterAppointments();
        });
    }
    
    // Date Filter Change
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            filterAppointments();
        });
    }
}

// Filter Appointments by Status and Date
function filterAppointments() {
    const status = statusFilter.value;
    const date = dateFilter.value ? new Date(dateFilter.value) : null;
    
    loadAllAppointments(status, date);
}

// Load All Appointments
async function loadAllAppointments(status = null, date = null) {
    try {
        // Get appointments with status filter if provided
        const appointments = await appointmentsModule.getAllAppointments(status);
        renderAppointmentsWithUserInfo(appointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
        
        // Check for the specific index error
        if (error && error.message && error.message.includes('requires an index')) {
            const appointmentsContainer = document.getElementById('appointmentsContainer');
            if (appointmentsContainer) {
                appointmentsContainer.innerHTML = `
                    <div class="error-message">
                        <h3>Firestore Index Required</h3>
                        <p>This query requires a Firestore index that hasn't been created yet.</p>
                        <p>As the administrator, you need to create this index in the Firebase Console.</p>
                        <p>Click the link in the browser console error message to create the required index.</p>
                        <p>After creating the index, wait a few minutes for it to be built, then refresh this page.</p>
                    </div>
                `;
            }
        } else {
            const appointmentsContainer = document.getElementById('appointmentsContainer');
            if (appointmentsContainer) {
                appointmentsContainer.innerHTML = `<div class="error-message">Error loading appointments: ${error.message}</div>`;
            }
        }
    }
}

// --- Bulk Actions for Appointments ---
let lastDeletedAppointments = [];

function showAppointmentsBulkBar(selectedIds, allAppointments) {
    let bulkBar = document.getElementById('appointmentsBulkBar');
    if (!bulkBar) {
        bulkBar = document.createElement('div');
        bulkBar.id = 'appointmentsBulkBar';
        bulkBar.style.display = 'none';
        bulkBar.style.background = '#f8f9fa';
        bulkBar.style.padding = '10px';
        bulkBar.style.marginBottom = '10px';
        bulkBar.innerHTML = `
            <span id="appointmentsBulkSelectedCount">0 selected</span>
            <button class="btn danger-btn" id="bulkDeleteAppointmentsBtn">Delete Selected</button>
            <button class="btn primary-btn" id="bulkConfirmAppointmentsBtn">Confirm Selected</button>
            <button class="btn secondary-btn" id="bulkCancelAppointmentsBtn">Cancel Selected</button>
        `;
        document.getElementById('appointmentsContainer').parentNode.insertBefore(bulkBar, document.getElementById('appointmentsContainer'));
    }
    document.getElementById('appointmentsBulkSelectedCount').textContent = `${selectedIds.length} selected`;
    bulkBar.style.display = selectedIds.length > 0 ? 'block' : 'none';

    // Bulk Delete
    document.getElementById('bulkDeleteAppointmentsBtn').onclick = async function() {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} appointment(s)? This cannot be undone.`)) return;
        try {
            lastDeletedAppointments = allAppointments.filter(a => selectedIds.includes(a.id));
            await Promise.all(selectedIds.map(id => appointmentsModule.deleteAppointment(id)));
            loadAllAppointments(statusFilter.value, dateFilter.value ? new Date(dateFilter.value) : null);
            alert('Selected appointments deleted!');
        } catch (err) {
            alert('Error deleting appointments: ' + err.message);
        }
    };
    // Bulk Confirm
    document.getElementById('bulkConfirmAppointmentsBtn').onclick = async function() {
        if (selectedIds.length === 0) return;
        if (!confirm(`Confirm ${selectedIds.length} appointment(s)?`)) return;
        try {
            await Promise.all(selectedIds.map(id => appointmentsModule.updateAppointment(id, { status: 'confirmed' })));
            loadAllAppointments(statusFilter.value, dateFilter.value ? new Date(dateFilter.value) : null);
            alert('Selected appointments confirmed!');
        } catch (err) {
            alert('Error confirming appointments: ' + err.message);
        }
    };
    // Bulk Cancel
    document.getElementById('bulkCancelAppointmentsBtn').onclick = async function() {
        if (selectedIds.length === 0) return;
        const reason = prompt('Enter a reason for cancellation (applies to all selected):');
        if (reason === null) return;
        try {
            await Promise.all(selectedIds.map(id => appointmentsModule.cancelAppointment(id, reason)));
            loadAllAppointments(statusFilter.value, dateFilter.value ? new Date(dateFilter.value) : null);
            alert('Selected appointments cancelled!');
        } catch (err) {
            alert('Error cancelling appointments: ' + err.message);
        }
    };
}

// Patch renderAppointmentsWithUserInfo to add checkboxes and bulk actions
async function renderAppointmentsWithUserInfo(appointments) {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;

    // Add search box if not present
    let searchBox = document.getElementById('appointmentsSearchBox');
    if (!searchBox) {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'search-box';
        searchDiv.innerHTML = `
            <input type="text" id="appointmentsSearchBox" placeholder="Search by student or counselor..." style="margin-bottom:10px;width:60%;max-width:300px;">
        `;
        container.parentNode.insertBefore(searchDiv, container);
        searchBox = document.getElementById('appointmentsSearchBox');
        searchBox.addEventListener('input', function() {
            appointmentsSearchTerm = searchBox.value;
            appointmentsCurrentPage = 1;
            renderAppointmentsWithUserInfo(appointmentsCache);
        });
    }
    appointmentsCache = appointments;
    let filtered = filterAppointmentsBySearch(appointments, appointmentsSearchTerm);
    const {appointments: pageAppointments, total, totalPages} = paginateAppointments(filtered, appointmentsCurrentPage, APPOINTMENTS_PER_PAGE);
    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-data-message">No appointments found.</p>';
        renderAppointmentsPaginationControls(1, 1, () => {});
        showAppointmentsBulkBar([], filtered);
        return;
    }
    renderAppointmentsPaginationControls(totalPages, appointmentsCurrentPage, (newPage) => {
        appointmentsCurrentPage = newPage;
        renderAppointmentsWithUserInfo(appointmentsCache);
    });

    // Create table
    const table = document.createElement('table');
    table.className = 'data-table';
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th><input type="checkbox" id="selectAllAppointments"></th>
            <th>Title</th>
            <th>Student</th>
            <th>Counselor</th>
            <th>Date & Time</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    // Create table body
    const tbody = document.createElement('tbody');
    pageAppointments.forEach(appointment => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', appointment.id);
        const formattedDate = formatDate(appointment.appointmentDate);
        tr.innerHTML = `
            <td><input type="checkbox" class="appointmentRowCheckbox" data-id="${appointment.id}"></td>
            <td>${appointment.title || 'Counseling Session'}</td>
            <td>${appointment.studentName}</td>
            <td>${appointment.counselorName}</td>
            <td>${formattedDate}</td>
            <td><span class="status-${appointment.status}">${appointment.status}</span></td>
            <td class="actions">
                <button class="btn secondary-btn view-appointment-btn" data-id="${appointment.id}">View</button>
                <button class="btn danger-btn delete-appointment-btn" data-id="${appointment.id}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    // Clear container and append table
    container.innerHTML = '';
    container.appendChild(table);

    // Bulk selection logic
    const checkboxes = container.querySelectorAll('.appointmentRowCheckbox');
    const selectAll = container.querySelector('#selectAllAppointments');
    let selectedIds = [];
    function updateBulkBar() {
        selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.getAttribute('data-id'));
        showAppointmentsBulkBar(selectedIds, filtered);
    }
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateBulkBar);
    });
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            checkboxes.forEach(cb => { cb.checked = selectAll.checked; });
            updateBulkBar();
        });
    }
    updateBulkBar();

    // Add event listeners
    document.querySelectorAll('.view-appointment-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const appointmentId = e.target.getAttribute('data-id');
            const appointment = appointmentsCache.find(a => a.id === appointmentId);
            if (appointment) {
                showAppointmentDetails(appointment);
            }
        });
    });
    document.querySelectorAll('.delete-appointment-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const appointmentId = e.target.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
                const success = await appointmentsModule.deleteAppointment(appointmentId);
                if (success) {
                    loadAllAppointments(statusFilter.value, dateFilter.value ? new Date(dateFilter.value) : null);
                    if (dashboardSection.classList.contains('active')) {
                        loadDashboardData();
                    }
                }
            }
        });
    });
}

// Show appointment details in a modal
function showAppointmentDetails(appointment) {
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
                <p><strong>Student:</strong> ${appointment.studentName}</p>
                <p><strong>Counselor:</strong> ${appointment.counselorName}</p>
                <p><strong>Date & Time:</strong> ${formattedDate}</p>
                <p><strong>Duration:</strong> ${appointment.duration || '1 hour'}</p>
                <p><strong>Status:</strong> <span class="status-${appointment.status}">${appointment.status}</span></p>
                ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
                ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                ${appointment.cancelReason ? `<p><strong>Cancellation Reason:</strong> ${appointment.cancelReason}</p>` : ''}
                <p><strong>Created:</strong> ${formatDate(appointment.createdAt)}</p>
                <p><strong>Last Updated:</strong> ${formatDate(appointment.updatedAt)}</p>
            </div>
            <div class="modal-actions">
                ${appointment.status === 'pending' ? `
                    <button class="btn primary-btn confirm-appointment-btn" data-id="${appointment.id}">Confirm</button>
                ` : ''}
                ${appointment.status !== 'cancelled' ? `
                    <button class="btn danger-btn cancel-appointment-btn" data-id="${appointment.id}">Cancel</button>
                ` : ''}
                <button class="btn danger-btn delete-appointment-btn" data-id="${appointment.id}">Delete</button>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Add close event
    modal.querySelector('.close').addEventListener('click', () => {
        closeModalWithAnimation(modal);
    });
    
    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalWithAnimation(modal);
        }
    });
    
    // Confirm appointment
    const confirmBtn = modal.querySelector('.confirm-appointment-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const appointmentId = confirmBtn.getAttribute('data-id');
            const success = await appointmentsModule.updateAppointment(appointmentId, { status: 'confirmed' });
            
            if (success) {
                closeModalWithAnimation(modal);
                loadAllAppointments(statusFilter.value, dateFilter.value ? new Date(dateFilter.value) : null);
            }
        });
    }
    
    // Cancel appointment
    const cancelBtn = modal.querySelector('.cancel-appointment-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            const appointmentId = cancelBtn.getAttribute('data-id');
            const cancelReason = prompt('Please provide a reason for cancellation (admin action):');
            
            if (cancelReason !== null) {
                const success = await appointmentsModule.cancelAppointment(appointmentId, cancelReason);
                
                if (success) {
                    closeModalWithAnimation(modal);
                    loadAllAppointments(statusFilter.value, dateFilter.value ? new Date(dateFilter.value) : null);
                }
            }
        });
    }
    
    // Delete appointment
    const deleteBtn = modal.querySelector('.delete-appointment-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const appointmentId = deleteBtn.getAttribute('data-id');
            
            if (confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
                const success = await appointmentsModule.deleteAppointment(appointmentId);
                
                if (success) {
                    closeModalWithAnimation(modal);
                    loadAllAppointments(statusFilter.value, dateFilter.value ? new Date(dateFilter.value) : null);
                }
            }
        });
    }
}

// Setup Resource Management
function setupResourceManagement() {
    // Category Filter Change
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            filterResources();
        });
    }
    
    // Counselor Filter Change
    if (counselorFilter) {
        counselorFilter.addEventListener('change', () => {
            filterResources();
        });
    }
    
    // Upload Resource Button
    if (uploadResourceBtn) {
        uploadResourceBtn.addEventListener('click', () => {
            showResourceModal();
        });
    }
    
    // Resource Form Submission
    if (resourceForm) {
        resourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const title = resourceForm.resourceTitle.value;
                const description = resourceForm.resourceDescription.value;
                const category = resourceForm.resourceCategory.value;
                const externalUrl = resourceForm.resourceUrl.value;
                if (!title || !category || !externalUrl) {
                    throw new Error('Please provide a title, category, and an external URL.');
                }
                const resourceData = {
                    title,
                    description,
                    category,
                    externalUrl,
                    uploadedBy: auth.currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                // Save external URL resource only
                const resourceId = await resourcesModule.addResource(resourceData);
                if (resourceId) {
                    closeModalWithAnimation(resourceModal);
                    resourceForm.reset();
                    loadAllResources();
                    alert('Resource link added successfully.');
                }
            } catch (error) {
                console.error('Error adding resource:', error);
                resourceFormError.textContent = error.message;
            }
        });
    }
}

// Show Resource Modal
function showResourceModal() {
    console.log('showResourceModal called'); // Debug log
    // Reset form
    resourceForm.reset();
    resourceFormError.textContent = '';

    // --- Patch: Populate category dropdown ---
    const resourceCategorySelect = document.getElementById('resourceCategory');
    if (resourceCategorySelect) {
        // Remove all options except the first
        while (resourceCategorySelect.options.length > 1) {
            resourceCategorySelect.remove(1);
        }
        console.log('Fetching categories from Firestore...'); // Debug log
        // Fetch categories from Firestore
        db.collection('resourceCategories').orderBy('name').get().then(snapshot => {
            console.log('Categories snapshot size:', snapshot.size); // Debug log
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log('Category doc:', data); // Debug log
                const option = document.createElement('option');
                option.value = data.name;
                option.textContent = data.name;
                resourceCategorySelect.appendChild(option);
            });
        }).catch(err => {
            console.error('Error loading categories for resource upload:', err);
        });
    }

    // Show modal
    resourceModal.style.display = 'block';
}

// Filter Resources by Category and Counselor
function filterResources() {
    const category = categoryFilter.value;
    const counselorId = counselorFilter.value;
    
    loadAllResources();
}

// Load Counselors for Filter
async function loadCounselorsForFilter() {
    if (!counselorFilter) return;
    try {
        const counselors = await usersModule.getAllUsers('counselor');
        // Clear existing options except the first one
        while (counselorFilter.options.length > 1) {
            counselorFilter.remove(1);
        }
        // Add counselors to filter
        counselors.forEach(counselor => {
            const option = document.createElement('option');
            option.value = counselor.id;
            option.textContent = counselor.name || counselor.email;
            counselorFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading counselors:', error);
    }
}

// Helper to get all resources and add counselorName
async function getAllResourcesWithUploader() {
    if (!resourcesModule.getAllResources) {
        console.error('resourcesModule.getAllResources is not available. Check that js/modules/resources.js is loaded and resourcesModule is defined.');
        alert('Resource loading error: resourcesModule.getAllResources is not available.');
        return [];
    }
    const resources = await resourcesModule.getAllResources();
    // For each resource, fetch counselor name
    const enhanced = await Promise.all(resources.map(async (r) => {
        let counselorName = '';
        if (r.counselorId) {
            try {
                const user = await usersModule.getUserById(r.counselorId);
                counselorName = user ? (user.name || user.email) : '';
            } catch {}
        }
        return { ...r, counselorName };
    }));
    return enhanced;
}

// Patch loadAllResources to use the helper
async function loadAllResources() {
    const resources = await getAllResourcesWithUploader();
    resourcesCache = resources;
    renderResourcesTable(resourcesCache);
}

// Setup Settings
function setupSettings() {
    // General Settings Form Submission
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const schoolName = generalSettingsForm.schoolName.value;
                const systemName = generalSettingsForm.systemName.value;
                const contactEmail = generalSettingsForm.contactEmail.value;
                const themeColor = generalSettingsForm.themeColor.value;
                
                const settings = {
                    schoolName,
                    systemName,
                    contactEmail,
                    themeColor,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: auth.currentUser.uid
                };
                
                const success = await settingsModule.updateGeneralSettings(settings);
                
                if (success) {
                    alert('General settings updated successfully.');
                }
            } catch (error) {
                console.error('Error updating general settings:', error);
                document.getElementById('generalSettingsError').textContent = error.message;
            }
        });
    }
    
    // Appointment Settings Form Submission
    if (appointmentSettingsForm) {
        appointmentSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const minNoticeHours = parseInt(appointmentSettingsForm.minNoticeHours.value);
                const maxAppointmentDuration = parseInt(appointmentSettingsForm.maxAppointmentDuration.value);
                const workingHoursStart = appointmentSettingsForm.workingHoursStart.value;
                const workingHoursEnd = appointmentSettingsForm.workingHoursEnd.value;
                const allowWeekends = appointmentSettingsForm.allowWeekends.checked;
                
                const settings = {
                    minNoticeHours,
                    maxAppointmentDuration,
                    workingHoursStart,
                    workingHoursEnd,
                    allowWeekends,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: auth.currentUser.uid
                };
                
                const success = await settingsModule.updateAppointmentSettings(settings);
                
                if (success) {
                    alert('Appointment settings updated successfully.');
                }
            } catch (error) {
                console.error('Error updating appointment settings:', error);
                document.getElementById('appointmentSettingsError').textContent = error.message;
            }
        });
    }
    
    // Category Form Submission
    if (categorySettingsForm) {
        let isSubmittingCategory = false;
        categorySettingsForm.onsubmit = async function(e) {
            e.preventDefault();
            if (isSubmittingCategory) return; // Prevent double submit
            isSubmittingCategory = true;
            try {
                const categoryName = document.getElementById('newCategoryName').value;
                const categoryDescription = document.getElementById('newCategoryDescription').value;
                if (!categoryName) {
                    throw new Error('Category name is required.');
                }
                const categoryData = {
                    name: categoryName,
                    description: categoryDescription || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser.uid
                };
                // Only use settingsModule to add category
                const success = await settingsModule.addResourceCategory(categoryData);
                if (success) {
                    // Reset form
                    document.getElementById('newCategoryName').value = '';
                    document.getElementById('newCategoryDescription').value = '';
                    // Refresh categories
                    loadResourceCategories();
                    alert('Category added successfully.');
                }
            } catch (error) {
                console.error('Error adding category:', error);
                document.getElementById('categoryError').textContent = error.message;
            }
            isSubmittingCategory = false;
        };
    }
    
    // If Add Category Button exists, set up event listener
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            document.getElementById('addCategorySection').style.display = 'block';
        });
    }

    // Always load categories when settings are set up
    loadResourceCategories();
}

// Load Resource Categories
async function loadResourceCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = '<p class="no-data-message">Loading categories...</p>';
    try {
        const snapshot = await db.collection('resourceCategories').orderBy('name').get();
        if (snapshot.empty) {
            container.innerHTML = '<p class="no-data-message">No categories found.</p>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `
                <input type="text" value="${data.name}" data-id="${doc.id}" class="category-name-input" style="width:200px;">
                <input type="text" value="${data.description || ''}" data-id="${doc.id}" class="category-desc-input" style="width:300px;">
                <button class="btn primary-btn save-category-btn" data-id="${doc.id}">Save</button>
                <button class="btn danger-btn delete-category-btn" data-id="${doc.id}">Delete</button>
            `;
            container.appendChild(div);
        });
        // Add event listeners
        container.querySelectorAll('.save-category-btn').forEach(btn => {
            btn.onclick = async function() {
                const id = btn.getAttribute('data-id');
                const name = container.querySelector(`.category-name-input[data-id='${id}']`).value.trim();
                const description = container.querySelector(`.category-desc-input[data-id='${id}']`).value.trim();
                await db.collection('resourceCategories').doc(id).update({ name, description });
                loadResourceCategories();
            };
        });
        container.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.onclick = async function() {
                const id = btn.getAttribute('data-id');
                if (!confirm('Delete this category?')) return;
                await db.collection('resourceCategories').doc(id).delete();
                loadResourceCategories();
            };
        });
    } catch (err) {
        container.innerHTML = '<p class="no-data-message">Error loading categories.</p>';
    }
}

// Setup Profile
function setupProfile() {
    // Update Profile Button
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('profileName');
            const emailInput = document.getElementById('profileEmail');
            const profileError = document.getElementById('profileError');
            if (!nameInput || !emailInput) return;
            try {
                const name = nameInput.value.trim();
                if (!name) throw new Error('Name is required.');
                const user = auth.currentUser;
                if (!user) throw new Error('Not logged in.');
                // Update displayName in Firebase Auth
                await user.updateProfile({ displayName: name });
                // Update Firestore user doc
                await db.collection('users').doc(user.uid).update({ name });
                // Update UI
                const displayName = document.getElementById('userDisplayName');
                if (displayName) displayName.textContent = name;
                profileError.textContent = '';
                alert('Profile updated successfully.');
                // Reload profile data to ensure UI and local state are up to date
                await loadProfileData();
                // Update sidebar avatar and name after profile update
                updateSidebarUserInfo(auth.currentUser);
            } catch (error) {
                console.error('Error updating profile:', error);
                profileError.textContent = error.message;
            }
        });
    }

    // Change Password Form
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const passwordError = document.getElementById('passwordError');
            try {
                const currentPassword = changePasswordForm.currentPassword.value;
                const newPassword = changePasswordForm.newPassword.value;
                const confirmPassword = changePasswordForm.confirmPassword.value;
                if (!currentPassword || !newPassword || !confirmPassword) throw new Error('All fields are required.');
                if (newPassword !== confirmPassword) throw new Error('New passwords do not match.');
                if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
                const user = auth.currentUser;
                if (!user) throw new Error('Not logged in.');
                // Re-authenticate
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
                await user.reauthenticateWithCredential(credential);
                // Update password
                await user.updatePassword(newPassword);
                changePasswordForm.reset();
                passwordError.textContent = '';
                alert('Password changed successfully.');
            } catch (error) {
                console.error('Error changing password:', error);
                passwordError.textContent = error.message;
                showToast(error.message, 'error');
            }
        });
    }
}

// Load Profile Data
async function loadProfileData() {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('Not logged in.');
        }
        
        // Get user doc
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('User profile not found.');
        }
        
        const userData = userDoc.data();
        
        // Populate profile fields
        document.getElementById('profileName').value = userData.name || '';
        document.getElementById('profileEmail').value = userData.email || user.email || '';
        document.getElementById('profileRole').value = userData.role || 'admin';
        // Set avatar
        const avatarImg = document.getElementById('userAvatar');
        if (avatarImg) {
            if (userData.avatarUrl) {
                avatarImg.src = userData.avatarUrl;
            } else if (userData.name) {
                avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=5b7cfa&color=fff&size=128`;
            } else {
                avatarImg.src = '../../assets/img/default-avatar.png';
            }
        }
        // Update top bar display name
        const displayName = document.getElementById('userDisplayName');
        if (displayName) displayName.textContent = userData.name || user.displayName || user.email || 'Admin User';
        
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('profileError').textContent = error.message;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Get counts for dashboard stats
        const [students, counselors, pendingAppointments, todayAppointments, resources] = await Promise.all([
            usersModule.getUserCount('student'),
            usersModule.getUserCount('counselor'),
            appointmentsModule.getAppointmentCount('pending'),
            appointmentsModule.getTodayAppointmentCount(),
            resourcesModule.getResourceCount()
        ]);
        // Update dashboard stats
        const studentCountEl = document.getElementById('studentCount');
        if (studentCountEl) studentCountEl.textContent = students;
        const counselorCountEl = document.getElementById('counselorCount');
        if (counselorCountEl) counselorCountEl.textContent = counselors;
        const pendingAppointmentCountEl = document.getElementById('pendingAppointmentCount');
        if (pendingAppointmentCountEl) pendingAppointmentCountEl.textContent = pendingAppointments;
        const todayAppointmentCountEl = document.getElementById('todayAppointmentCount');
        if (todayAppointmentCountEl) todayAppointmentCountEl.textContent = todayAppointments;
        const resourceCountEl = document.getElementById('resourceCount');
        if (resourceCountEl) resourceCountEl.textContent = resources;
        // Load recent activity
        if (typeof loadRecentActivity === 'function') loadRecentActivity();
        // Try the standard function first, fall back to alternative if it fails
        try {
            // Load upcoming appointments for dashboard
            if (typeof loadUpcomingAppointmentsForDashboard === 'function') loadUpcomingAppointmentsForDashboard();
        } catch (error) {
            console.warn('Using alternative appointment loader due to error:', error);
            // Use the alternative implementation that doesn't require complex indexes
            if (typeof loadUpcomingAppointmentsAlternative === 'function') loadUpcomingAppointmentsAlternative();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        const dashboardErrorEl = document.getElementById('dashboardError');
        if (dashboardErrorEl) dashboardErrorEl.textContent = error.message;
    }
}

// Helper function to format dates
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    // If it's a Firebase Timestamp
    if (timestamp.toDate) {
        timestamp = timestamp.toDate();
    }
    
    // Format the date
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return new Date(timestamp).toLocaleDateString('en-US', options);
}

// Check user permission function (for in-dashboard permission checks)
async function checkUserPermission(allowedRoles) {
    try {
        // Use already authenticated user data if available
        if (currentUserData) {
            return allowedRoles.includes(currentUserData.role);
        }
        
        // Otherwise, perform full check
        const authResult = await AuthHelper.checkUserRole('admin');
        return authResult !== null;
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
}

// Log out function
document.getElementById('logoutLink').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        await auth.signOut();
        window.location.href = '../../index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out: ' + error.message);
    }
});

// Add Edit User Role Modal logic
function showEditUserRoleModal(user) {
    // Remove any existing modal
    const existingModal = document.getElementById('editUserRoleModal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'editUserRoleModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" id="closeEditUserRoleModal">&times;</span>
            <h2>Edit User Role</h2>
            <form id="editUserRoleForm">
                <div class="form-group">
                    <label for="editUserRoleSelect">Role:</label>
                    <select id="editUserRoleSelect" required>
                        <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="counselor" ${user.role === 'counselor' ? 'selected' : ''}>Counselor</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <button type="submit" class="btn primary-btn">Save</button>
                <p id="editUserRoleError" class="error-message"></p>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal logic
    document.getElementById('closeEditUserRoleModal').onclick = () => closeModalWithAnimation(modal);
    modal.onclick = (e) => { if (e.target === modal) closeModalWithAnimation(modal); };

    // Handle form submit
    document.getElementById('editUserRoleForm').onsubmit = async (e) => {
        e.preventDefault();
        const newRole = document.getElementById('editUserRoleSelect').value;
        const errorElem = document.getElementById('editUserRoleError');
        errorElem.textContent = '';
        try {
            await db.collection('users').doc(user.id).update({ role: newRole });
            closeModalWithAnimation(modal);
            // Refresh user list
            if (typeof usersModule !== 'undefined' && usersModule.loadUsers) {
                usersModule.loadUsers();
            } else {
                location.reload();
            }
            alert('User role updated successfully!');
        } catch (err) {
            errorElem.textContent = err.message;
        }
    };
}

// Patch renderUsers to add Edit button
if (typeof usersModule !== 'undefined' && usersModule.renderUsers) {
    const origRenderUsers = usersModule.renderUsers;
    usersModule.renderUsers = function(users, containerId) {
        origRenderUsers.call(this, users, containerId);
        // Add Edit buttons
        const container = document.getElementById(containerId);
        if (!container) return;
        const rows = container.querySelectorAll('table.data-table tbody tr');
        users.forEach((user, idx) => {
            const row = rows[idx];
            if (!row) return;
            let actionsCell = row.querySelector('.actions');
            if (!actionsCell) return;
            // Add Edit button if not already present
            if (!actionsCell.querySelector('.edit-role-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'btn secondary-btn edit-role-btn';
                editBtn.textContent = 'Edit Role';
                editBtn.onclick = () => showEditUserRoleModal(user);
                actionsCell.insertBefore(editBtn, actionsCell.firstChild);
            }
        });
    };
}

// Force re-attach the real usersModule after all scripts are loaded
if (typeof window !== 'undefined' && typeof getAllUsers === 'function' && typeof renderUsers === 'function' && typeof loadUsers === 'function') {
    window.usersModule = {
        getAllUsers,
        renderUsers,
        loadUsers,
        // ... add other methods as needed ...
    };
}

// --- Add Create Test Appointment Button and Modal ---

// Add button to Appointments section if not present
function addTestAppointmentButton() {
    const section = document.getElementById('appointmentsSection');
    if (!section || document.getElementById('createTestAppointmentBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'createTestAppointmentBtn';
    btn.className = 'btn primary-btn';
    btn.style.marginBottom = '16px';
    btn.innerHTML = '<i class="fas fa-plus"></i> Create Test Appointment';
    section.insertBefore(btn, section.querySelector('.section-controls'));

    btn.onclick = showTestAppointmentModal;
}

// Show modal for creating test appointment
function showTestAppointmentModal() {
    // Remove existing modal if any
    let modal = document.getElementById('testAppointmentModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'testAppointmentModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" id="closeTestAppointmentModal">&times;</span>
            <h2>Create Test Appointment</h2>
            <form id="testAppointmentForm">
                <div class="form-group">
                    <label for="testStudentSelect">Student:</label>
                    <select id="testStudentSelect" required><option value="">Loading...</option></select>
                </div>
                <div class="form-group">
                    <label for="testCounselorSelect">Counselor:</label>
                    <select id="testCounselorSelect" required><option value="">Loading...</option></select>
                </div>
                <div class="form-group">
                    <label for="testDate">Date:</label>
                    <input type="date" id="testDate" required>
                </div>
                <div class="form-group">
                    <label for="testTime">Time:</label>
                    <input type="time" id="testTime" required>
                </div>
                <div class="form-group">
                    <label for="testNotes">Notes (optional):</label>
                    <textarea id="testNotes"></textarea>
                </div>
                <button type="submit" class="btn primary-btn">Create Appointment</button>
                <p id="testAppointmentError" class="error-message"></p>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal logic
    document.getElementById('closeTestAppointmentModal').onclick = () => closeModalWithAnimation(modal);
    modal.onclick = (evt) => { if (evt.target === modal) closeModalWithAnimation(modal); };

    // Load students and counselors
    loadTestUsers('student', 'testStudentSelect');
    loadTestUsers('counselor', 'testCounselorSelect');

    // Handle form submit
    document.getElementById('testAppointmentForm').onsubmit = async (e) => {
        e.preventDefault();
        const studentId = document.getElementById('testStudentSelect').value;
        const counselorId = document.getElementById('testCounselorSelect').value;
        const date = document.getElementById('testDate').value;
        const time = document.getElementById('testTime').value;
        const notes = document.getElementById('testNotes').value;
        const errorElem = document.getElementById('testAppointmentError');
        errorElem.textContent = '';
        if (!studentId || !counselorId || !date || !time) {
            errorElem.textContent = 'All fields except notes are required.';
            return;
        }
        try {
            // Compose Firestore Timestamp
            const [hour, minute] = time.split(':');
            const dt = new Date(date);
            dt.setHours(parseInt(hour), parseInt(minute), 0, 0);
            // Create appointment
            await db.collection('appointments').add({
                studentId,
                counselorId,
                appointmentDate: firebase.firestore.Timestamp.fromDate(dt),
                status: 'pending',
                notes: notes || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            closeModalWithAnimation(modal);
            alert('Test appointment created!');
            loadAllAppointments();
        } catch (err) {
            errorElem.textContent = err.message;
        }
    };
}

// Load users for select
async function loadTestUsers(role, selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Loading...</option>';
    try {
        const users = await usersModule.getAllUsers(role);
        select.innerHTML = '<option value="">Select...</option>';
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.name ? `${u.name} (${u.email})` : u.email;
            select.appendChild(opt);
        });
    } catch (err) {
        select.innerHTML = '<option value="">Error loading users</option>';
    }
}

// Add the button when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTestAppointmentButton);
} else {
    addTestAppointmentButton();
}

// --- Resources Management: Table/Grid, Filters, Search, Pagination, Bulk Actions ---
function filterResourcesBySearch(resources, term) {
    if (!term) return resources;
    const t = term.toLowerCase();
    return resources.filter(r =>
        (r.title && r.title.toLowerCase().includes(t)) ||
        (r.description && r.description.toLowerCase().includes(t))
    );
}

function paginateResources(resources, page = 1, perPage = RESOURCES_PER_PAGE) {
    const total = resources.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
        resources: resources.slice(start, end),
        total,
        totalPages,
        page
    };
}

function renderResourcesPaginationControls(totalPages, page, onPageChange) {
    let controls = document.getElementById('resourcesPagination');
    if (!controls) {
        controls = document.createElement('div');
        controls.id = 'resourcesPagination';
        controls.style.display = 'flex';
        controls.style.justifyContent = 'center';
        controls.style.margin = '20px 0';
        controls.style.gap = '8px';
        document.getElementById('resourcesContainer').parentNode.appendChild(controls);
    }
    controls.innerHTML = '';
    if (totalPages <= 1) {
        controls.style.display = 'none';
        return;
    }
    controls.style.display = 'flex';
    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.className = 'btn secondary-btn';
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => onPageChange(page - 1);
    controls.appendChild(prevBtn);
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'btn' + (i === page ? ' primary-btn' : ' secondary-btn');
        btn.disabled = i === page;
        btn.onclick = () => onPageChange(i);
        controls.appendChild(btn);
    }
    // Next
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'btn secondary-btn';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => onPageChange(page + 1);
    controls.appendChild(nextBtn);
}

function showResourcesBulkBar(selectedIds, allResources) {
    let bulkBar = document.getElementById('resourcesBulkBar');
    if (!bulkBar) {
        bulkBar = document.createElement('div');
        bulkBar.id = 'resourcesBulkBar';
        bulkBar.style.display = 'none';
        bulkBar.style.background = '#f8f9fa';
        bulkBar.style.padding = '10px';
        bulkBar.style.marginBottom = '10px';
        bulkBar.innerHTML = `
            <span id="resourcesBulkSelectedCount">0 selected</span>
            <button class="btn danger-btn" id="bulkDeleteResourcesBtn">Delete Selected</button>
        `;
        document.getElementById('resourcesContainer').parentNode.insertBefore(bulkBar, document.getElementById('resourcesContainer'));
    }
    document.getElementById('resourcesBulkSelectedCount').textContent = `${selectedIds.length} selected`;
    bulkBar.style.display = selectedIds.length > 0 ? 'block' : 'none';
    document.getElementById('bulkDeleteResourcesBtn').onclick = async function() {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} resource(s)? This cannot be undone.`)) return;
        try {
            lastDeletedResources = allResources.filter(r => selectedIds.includes(r.id));
            await Promise.all(selectedIds.map(id => resourcesModule.deleteResource(id)));
            loadAllResources();
            alert('Selected resources deleted!');
        } catch (err) {
            alert('Error deleting resources: ' + err.message);
        }
    };
}

async function renderResourcesTable(resources) {
    const container = document.getElementById('resourcesContainer');
    if (!container) return;
    // Add search box if not present
    let searchBox = document.getElementById('resourcesSearchBox');
    if (!searchBox) {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'search-box';
        searchDiv.innerHTML = `
            <input type="text" id="resourcesSearchBox" placeholder="Search resources by title or description..." style="margin-bottom:10px;width:60%;max-width:300px;">
        `;
        container.parentNode.insertBefore(searchDiv, container);
        searchBox = document.getElementById('resourcesSearchBox');
        searchBox.addEventListener('input', function() {
            resourcesSearchTerm = searchBox.value;
            resourcesCurrentPage = 1;
            renderResourcesTable(resourcesCache);
        });
    }
    resourcesCache = resources;
    let filtered = filterResourcesBySearch(resources, resourcesSearchTerm);
    const {resources: pageResources, total, totalPages} = paginateResources(filtered, resourcesCurrentPage, RESOURCES_PER_PAGE);
    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-data-message">No resources found.</p>';
        renderResourcesPaginationControls(1, 1, () => {});
        showResourcesBulkBar([], filtered);
        return;
    }
    renderResourcesPaginationControls(totalPages, resourcesCurrentPage, (newPage) => {
        resourcesCurrentPage = newPage;
        renderResourcesTable(resourcesCache);
    });
    // Create table
    const table = document.createElement('table');
    table.className = 'data-table';
    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th><input type="checkbox" id="selectAllResources"></th>
            <th>Title</th>
            <th>Description</th>
            <th>Category</th>
            <th>Uploader</th>
            <th>Date Added</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    // Table body
    const tbody = document.createElement('tbody');
    for (const resource of pageResources) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', resource.id);
        const formattedDate = formatDate(resource.createdAt);
        tr.innerHTML = `
            <td><input type="checkbox" class="resourceRowCheckbox" data-id="${resource.id}"></td>
            <td>${resource.title || ''}</td>
            <td>${resource.description || ''}</td>
            <td>${resource.category || ''}</td>
            <td>${resource.counselorName || ''}</td>
            <td>${formattedDate}</td>
            <td class="actions">
                <button class="btn secondary-btn edit-resource-btn" data-id="${resource.id}">Edit</button>
                <button class="btn danger-btn delete-resource-btn" data-id="${resource.id}">Delete</button>
                ${resource.fileUrl ? `<a href="${resource.fileUrl}" class="btn primary-btn" target="_blank">Download</a>` : resource.externalUrl ? `<a href="${resource.externalUrl}" class="btn primary-btn" target="_blank">Visit</a>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
    // Bulk selection logic
    const checkboxes = container.querySelectorAll('.resourceRowCheckbox');
    const selectAll = container.querySelector('#selectAllResources');
    let selectedIds = [];
    function updateBulkBar() {
        selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.getAttribute('data-id'));
        showResourcesBulkBar(selectedIds, filtered);
    }
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateBulkBar);
    });
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            checkboxes.forEach(cb => { cb.checked = selectAll.checked; });
            updateBulkBar();
        });
    }
    updateBulkBar();
    // Edit/Delete event listeners
    container.querySelectorAll('.edit-resource-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const resourceId = e.target.getAttribute('data-id');
            const resource = resourcesCache.find(r => r.id === resourceId);
            if (resource) showEditResourceModal(resource);
        });
    });
    container.querySelectorAll('.delete-resource-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const resourceId = e.target.getAttribute('data-id');
            if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;
            try {
                lastDeletedResources = [filtered.find(r => r.id === resourceId)];
                await resourcesModule.deleteResource(resourceId);
                loadAllResources();
                alert('Resource deleted!');
            } catch (err) {
                alert('Error deleting resource: ' + err.message);
            }
        });
    });
}

function loadSettings() {
    setupSettings();
    // --- Patch: Setup tab switching for settings tabs ---
    const tabItems = document.querySelectorAll('.settings-tab-item');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    // Remove any previous listeners by cloning nodes (idempotent)
    tabItems.forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });
    // Re-select after cloning
    const freshTabItems = document.querySelectorAll('.settings-tab-item');
    freshTabItems.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active from all tabs and contents
            freshTabItems.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            // Set active on clicked tab and corresponding content
            this.classList.add('active');
            const tabName = this.getAttribute('data-tab');
            // --- Robust patch: Find the content section whose id ends with tabName + 'Settings' (case-insensitive) ---
            let content = null;
            for (const c of tabContents) {
                if (c.id.toLowerCase() === (tabName + 'Settings').toLowerCase()) {
                    content = c;
                    break;
                }
            }
            if (!content) {
                // Try plural (add 's')
                for (const c of tabContents) {
                    if (c.id.toLowerCase() === (tabName + 'sSettings').toLowerCase()) {
                        content = c;
                        break;
                    }
                }
            }
            if (content) content.classList.add('active');
            // --- Patch: If categories tab, load categories ---
            if (tabName === 'categories') {
                loadResourceCategories();
            }
        });
    });
    // Always show the default tab (General)
    freshTabItems.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    if (freshTabItems[0]) freshTabItems[0].classList.add('active');
    if (tabContents[0]) tabContents[0].classList.add('active');
}

// --- Announcements Tab Logic ---
function setupAnnouncementsTab(user) {
  const navAnnouncements = document.getElementById('nav-announcements');
  const sectionAnnouncements = document.getElementById('section-announcements');
  if (!navAnnouncements || !sectionAnnouncements) {
    console.warn('Announcements tab or section not found in DOM.');
    return;
  }
  navAnnouncements.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
    navAnnouncements.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    sectionAnnouncements.classList.add('active');
    loadAnnouncementsList(user);
  });
  // Add Announcement button
  const addBtn = document.getElementById('addAnnouncementBtn');
  if (addBtn) {
    addBtn.onclick = () => openAnnouncementModal(user);
  } else {
    console.warn('addAnnouncementBtn not found in DOM.');
  }
}

async function loadAnnouncementsList(user) {
  const container = document.getElementById('announcementsListContainer');
  if (!container) return;
  container.innerHTML = '<div class="no-data-message">Loading announcements...</div>';
  const snap = await db.collection('announcements').orderBy('createdAt', 'desc').get();
  if (snap.empty) {
    container.innerHTML = '<div class="no-data-message">No announcements found.</div>';
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:1.5rem;">';
  snap.forEach(doc => {
    const a = doc.data();
    const id = doc.id;
    const dateStr = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : '';
    html += `<div class="announcement-card">
      <div style="font-size:1.15rem;font-weight:600;">${a.title || 'Announcement'}</div>
      <div style="margin:0.5rem 0 0.7rem 0;">${a.message || ''}</div>
      <div style="font-size:0.97em;color:#888;">By <b>${a.author || 'Admin'}</b> • ${dateStr} • <span style="background:#e0e4ea;color:#333;padding:2px 10px;border-radius:12px;font-size:0.93em;">${a.audience || 'all'}</span></div>
      <div style="position:absolute;top:1.2rem;right:1.2rem;display:flex;gap:0.5rem;">
        <button class="small-btn secondary-btn" onclick="window.editAnnouncement('${id}')"><i class='fas fa-edit'></i></button>
        <button class="small-btn danger-btn" onclick="window.deleteAnnouncement('${id}')"><i class='fas fa-trash'></i></button>
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// --- Announcement Modal Logic ---
function openAnnouncementModal(user, announcement = null) {
  const modal = document.getElementById('announcementModal');
  const form = document.getElementById('announcementForm');
  const titleInput = document.getElementById('announcementTitle');
  const msgInput = document.getElementById('announcementMessage');
  const audInput = document.getElementById('announcementAudience');
  const errorDiv = document.getElementById('announcementError');
  const modalTitle = document.getElementById('announcementModalTitle');
  const saveBtn = document.getElementById('saveAnnouncementBtn');
  if (!modal || !form || !titleInput || !msgInput || !audInput || !errorDiv || !modalTitle || !saveBtn) return;
  // Reset form
  form.reset();
  errorDiv.style.display = 'none';
  let editingId = null;
  if (announcement) {
    modalTitle.textContent = 'Edit Announcement';
    titleInput.value = announcement.title || '';
    msgInput.value = announcement.message || '';
    audInput.value = announcement.audience || 'all';
    editingId = announcement.id;
  } else {
    modalTitle.textContent = 'Add Announcement';
  }
  modal.style.display = 'block';
  // Close modal
  document.getElementById('closeAnnouncementModal').onclick = () => { closeModalWithAnimation(modal); };
  window.onclick = function(event) { if (event.target === modal) closeModalWithAnimation(modal); };
  // Submit
  form.onsubmit = async function(e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    const title = titleInput.value.trim();
    const message = msgInput.value.trim();
    const audience = audInput.value;
    if (!title || !message || !audience) {
      errorDiv.textContent = 'All fields are required.';
      errorDiv.style.display = 'block';
      return;
    }
    saveBtn.disabled = true;
    try {
      if (editingId) {
        // Edit
        await db.collection('announcements').doc(editingId).update({
          title, message, audience
        });
      } else {
        // Add
        await db.collection('announcements').add({
          title, message, audience,
          author: user.displayName || user.name || user.email || 'Admin',
          authorUid: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      closeModalWithAnimation(modal);
      loadAnnouncementsList(user);
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
    saveBtn.disabled = false;
  };
}
// Edit/delete helpers (window-scoped for inline onclick)
window.editAnnouncement = async function(id) {
  const doc = await db.collection('announcements').doc(id).get();
  if (!doc.exists) return;
  const a = doc.data();
  openAnnouncementModal(auth.currentUser, { ...a, id });
};
window.deleteAnnouncement = async function(id) {
  if (!confirm('Delete this announcement?')) return;
  try {
    await db.collection('announcements').doc(id).delete();
    const user = auth.currentUser;
    if (user) loadAnnouncementsList(user);
  } catch (err) {
    alert('Error deleting announcement: ' + err.message);
  }
};
// Patch navigation to set up Announcements tab after auth
function setupAdminNavigationAnnouncements(user) {
  setupAnnouncementsTab(user);
}

// --- Ensure data loads on page load if section is active ---
if (document.getElementById('appointmentsSection')?.classList.contains('active')) {
  loadAllAppointments();
}
if (document.getElementById('resourcesSection')?.classList.contains('active')) {
  loadAllResources();
}
if (document.getElementById('usersSection')?.classList.contains('active') && typeof usersModule !== 'undefined' && usersModule.loadUsers) {
  usersModule.loadUsers();
}

// --- Modal Closing Animation Helper ---
function closeModalWithAnimation(modal) {
  const content = modal.querySelector('.modal-content');
  if (!content) {
    modal.remove();
    return;
  }
  content.classList.add('modal-closing');
  content.addEventListener('animationend', () => {
    modal.remove();
  }, { once: true });
}

// On page load, ensure only the active section is visible and has correct opacity
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.section').forEach(s => {
    if (!s.classList.contains('active')) {
      s.style.display = 'none';
      s.style.opacity = 0;
    } else {
      s.style.display = 'block';
      s.style.opacity = 1;
    }
  });
});

// Helper to update sidebar avatar and name
function updateSidebarUserInfo(user) {
  const avatar = document.getElementById('sidebarUserAvatar');
  const nameSpan = document.getElementById('sidebarUserName');
  if (user) {
    const displayName = user.displayName || 'Admin User';
    let photoURL = user.photoURL;
    if (!photoURL) {
      // Use UI Avatars fallback
      photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5b7cfa&color=fff&size=128`;
    }
    if (avatar) avatar.src = photoURL;
    if (nameSpan) nameSpan.textContent = displayName;
  }
}

// --- Resource Edit Modal ---
function showEditResourceModal(resource) {
    // Remove any existing modal
    const existingModal = document.getElementById('editResourceModal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'editResourceModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px;">
            <span class="close" id="closeEditResourceModal">&times;</span>
            <h2>Edit Resource</h2>
            <form id="editResourceForm">
                <div class="form-group">
                    <label for="editResourceTitle">Title</label>
                    <input type="text" id="editResourceTitle" value="${resource.title || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editResourceDescription">Description</label>
                    <textarea id="editResourceDescription" rows="3">${resource.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editResourceCategory">Category</label>
                    <select id="editResourceCategory" required><option value="">Loading...</option></select>
                </div>
                <div class="form-group">
                    <label for="editResourceUrl">External URL</label>
                    <input type="url" id="editResourceUrl" value="${resource.externalUrl || ''}">
                </div>
                <button type="submit" class="btn primary-btn">Save Changes</button>
                <div class="error-message" id="editResourceError" style="display:none;"></div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Populate categories
    const catSelect = modal.querySelector('#editResourceCategory');
    catSelect.innerHTML = '<option value="">Loading...</option>';
    db.collection('resourceCategories').orderBy('name').get().then(snapshot => {
        catSelect.innerHTML = '<option value="">Select Category</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data.name;
            option.textContent = data.name;
            catSelect.appendChild(option);
        });
        catSelect.value = resource.category || '';
    });

    // Close modal logic
    modal.querySelector('#closeEditResourceModal').onclick = () => closeModalWithAnimation(modal);
    modal.onclick = (evt) => { if (evt.target === modal) closeModalWithAnimation(modal); };

    // Handle form submit
    modal.querySelector('#editResourceForm').onsubmit = async (e) => {
        e.preventDefault();
        const errorDiv = modal.querySelector('#editResourceError');
        errorDiv.style.display = 'none';
        const title = modal.querySelector('#editResourceTitle').value.trim();
        const description = modal.querySelector('#editResourceDescription').value.trim();
        const category = modal.querySelector('#editResourceCategory').value;
        const externalUrl = modal.querySelector('#editResourceUrl').value.trim();
        if (!title || !category) {
            errorDiv.textContent = 'Title and category are required.';
            errorDiv.style.display = 'block';
            return;
        }
        try {
            await db.collection('resources').doc(resource.id).update({
                title,
                description,
                category,
                externalUrl
            });
            closeModalWithAnimation(modal);
            loadAllResources();
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
        }
    };
}

// --- Toast Notification Helper ---
function showToast(message, type = 'info') {
    // Remove any existing toast
    const old = document.getElementById('dashboard-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'dashboard-toast';
    toast.style.cssText = `
        position: fixed;
        top: 32px;
        right: 32px;
        min-width: 260px;
        max-width: 350px;
        background: #fff;
        color: #222;
        border-left: 6px solid ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#5b7cfa'};
        box-shadow: 0 4px 16px rgba(44,62,80,0.15);
        border-radius: 10px;
        padding: 1.1rem 2.2rem 1.1rem 1.1rem;
        z-index: 9999;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 1rem;
        opacity: 0;
        transition: opacity 0.4s;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    `;
    toast.innerHTML = `
        <span style="font-size:1.5rem;color:${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#5b7cfa'};margin-top:2px;">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        </span>
        <span>${message}</span>
        <button style="background:none;border:none;color:#888;font-size:1.2rem;position:absolute;top:8px;right:12px;cursor:pointer;" onclick="this.parentNode.remove()">&times;</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = 1; }, 10);
    setTimeout(() => {
        if (toast.parentNode) toast.style.opacity = 0;
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
    }, 4000);
}