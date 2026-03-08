// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Guidance Management System: App initialized');
    
    // Detect if in dashboard
    const isDashboard = window.location.href.includes('dashboards');
    
    if (isDashboard) {
        initializeDashboard();
    } else {
        initializeHomePage();
    }
});

// Initialize dashboard
function initializeDashboard() {
    // Get current user
    const user = auth.currentUser;
    
    if (user) {
        // Display user info
        updateUserInfo(user);
        
        // Setup sidebar toggle for mobile
        setupSidebarToggle();
        
        // Setup logout button
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logOut();
            });
        }
    }
}

// Initialize home page
function initializeHomePage() {
    // Nothing special to initialize on home page yet
    console.log('Home page initialized');
}

// Update user info in dashboard
function updateUserInfo(user) {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement && user.displayName) {
        userNameElement.textContent = user.displayName;
    }
    
    if (userEmailElement && user.email) {
        userEmailElement.textContent = user.email;
    }
    
    if (userRoleElement) {
        getUserRole(user.uid)
            .then(role => {
                userRoleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            })
            .catch(error => console.error('Error getting user role:', error));
    }
}

// Setup sidebar toggle for mobile view
function setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}

// Format date for readable display
function formatDate(timestamp) {
    if (!timestamp) return 'No date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Shared function to handle API errors
function handleError(error, errorContainer) {
    console.error('Error:', error);
    if (errorContainer) {
        errorContainer.textContent = error.message || 'An error occurred';
        errorContainer.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
} 