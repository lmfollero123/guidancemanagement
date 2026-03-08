// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const closeButtons = document.querySelectorAll('.close');

// Show Login Modal
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });
}

// Show Register Modal
if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        registerModal.style.display = 'block';
    });
}

// Close Modals
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
    }
    if (e.target === registerModal) {
        registerModal.style.display = 'none';
    }
});

// Handle Login Form Submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get user credentials
        const email = loginForm.loginEmail.value;
        const password = loginForm.loginPassword.value;
        
        try {
            // Sign in user
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Signed in UID:', userCredential.user.uid);
            
            // Clear form and close modal
            loginForm.reset();
            loginModal.style.display = 'none';
            loginError.textContent = '';
            
            // Check user role and redirect to appropriate dashboard
            const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
            console.log('User doc exists:', userDoc.exists, 'Doc data:', userDoc.data());
            if (userDoc.exists) {
                const userData = userDoc.data();
                redirectToDashboard(userData.role);
            } else {
                // If user document doesn't exist, create one and set role to student by default
                await db.collection('users').doc(userCredential.user.uid).set({
                    email: userCredential.user.email,
                    role: 'student',
                    createdAt: timestamp
                });
                redirectToDashboard('student');
            }
        } catch (error) {
            loginError.textContent = error.message;
        }
    });
}

// Handle Register Form Submission
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get user details
        const name = registerForm.registerName.value;
        const email = registerForm.registerEmail.value;
        const password = registerForm.registerPassword.value;
        // Force role to 'student' regardless of form value
        const role = 'student';
        
        try {
            // Create user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Update profile with name
            await userCredential.user.updateProfile({
                displayName: name
            });
            
            // Create user document in Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                role: role,
                createdAt: timestamp
            });
            
            // Clear form and close modal
            registerForm.reset();
            registerModal.style.display = 'none';
            registerError.textContent = '';
            
            // Redirect to appropriate dashboard
            redirectToDashboard(role);
        } catch (error) {
            registerError.textContent = error.message;
        }
    });
}

// Only run this on the login page!
if (
  window.location.pathname.endsWith('index.html') ||
  window.location.pathname === '/' ||
  window.location.pathname.endsWith('/FINAL/') // adjust as needed for your root
) {
  auth.onAuthStateChanged(user => {
    // Prevent redirect loops with a flag
    const isLoginPage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/');
    
    // Check if we're on the counselor dashboard
    const onCounselorDashboard = sessionStorage.getItem('onCounselorDashboard') === 'true';
    
    console.log('Auth state changed in auth.js:', user ? 'User is logged in' : 'No user logged in');
    console.log('Is login page:', isLoginPage);
    console.log('On counselor dashboard:', onCounselorDashboard);
    
    if (user) {
        // User is logged in
        getUserRole(user.uid)
            .then(role => {
                console.log('User role in auth.js:', role);
                
                // Only redirect if on the login page AND not already on the counselor dashboard
                if (isLoginPage && !onCounselorDashboard) {
                    console.log('Redirecting to dashboard from login page');
                    redirectToDashboard(role);
                } else {
                    console.log('Not redirecting - already on correct page');
                }
            })
            .catch(error => console.error('Error getting user role:', error));
    } else {
        // User is logged out
        // Only redirect if on a dashboard page and not the login page
        if (window.location.href.includes('dashboards') && !isLoginPage) {
            console.log('Not logged in - redirecting from dashboard to login');
            sessionStorage.removeItem('onCounselorDashboard');
            window.location.href = '../../index.html';
        }
    }
  });
}

// Get user role from Firestore
async function getUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().role;
        } else {
            console.error('User document does not exist');
            return null;
        }
    } catch (error) {
        console.error('Error getting user document:', error);
        throw error;
    }
}

// Redirect to appropriate dashboard based on role
function redirectToDashboard(role) {
    // Determine base path more reliably
    let basePath = '';
    const currentPath = window.location.pathname;
    
    console.log('Current path in redirectToDashboard:', currentPath);
    
    if (currentPath.includes('/dashboards/')) {
        // If already in dashboards, go up one level
        basePath = '../';
    } else {
        // If on main index or elsewhere
        basePath = 'dashboards/';
    }
    
    console.log('Base path for redirect:', basePath);
    
    // Check if we're already on the right dashboard
    const onAdminDashboard = currentPath.includes('/dashboards/admin/');
    const onCounselorDashboard = currentPath.includes('/dashboards/counselor/');
    const onStudentDashboard = currentPath.includes('/dashboards/student/');
    
    let targetPath = '';
    
    switch (role) {
        case 'student':
            targetPath = basePath + 'student/index.html';
            if (onStudentDashboard) {
                console.log('Already on student dashboard, not redirecting');
                return;
            }
            break;
        case 'counselor':
            targetPath = basePath + 'counselor/index.html';
            if (onCounselorDashboard) {
                console.log('Already on counselor dashboard, not redirecting');
                return;
            }
            break;
        case 'admin':
            targetPath = basePath + 'admin/index.html';
            if (onAdminDashboard) {
                console.log('Already on admin dashboard, not redirecting');
                return;
            }
            break;
        default:
            targetPath = basePath + 'student/index.html';
    }
    
    console.log('Redirecting to:', targetPath);
    window.location.href = targetPath;
}

// Check if user has permission to access a specific page
async function checkUserPermission(allowedRoles) {
    const user = auth.currentUser;
    
    if (!user) {
        // If no user is logged in, redirect to home page
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const role = await getUserRole(user.uid);
        
        if (!allowedRoles.includes(role)) {
            // If user's role is not allowed, redirect to their dashboard
            redirectToDashboard(role);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking user permission:', error);
        window.location.href = '../index.html';
        return false;
    }
}

// Log out function
function logOut() {
    auth.signOut()
        .then(() => {
            window.location.href = '../index.html';
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
} 