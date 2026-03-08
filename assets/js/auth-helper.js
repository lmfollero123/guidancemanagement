/**
 * Auth Helper Module
 * Provides consistent authentication handling across all dashboards
 */

console.log('AuthHelper loaded:', window.location.pathname);

const AuthHelper = (function() {
    // Wait for auth state to be resolved
    const waitForAuth = function(timeout = 10000) {
        return new Promise((resolve, reject) => {
            // First try to get current user directly
            const user = auth.currentUser;
            if (user) {
                resolve(user);
                return;
            }
            // Set up a timeout to reject the promise
            const timeoutId = setTimeout(() => {
                unsubscribe();
                reject(new Error('Auth initialization timed out'));
            }, timeout);
            // Set up a listener for auth state changes
            const unsubscribe = auth.onAuthStateChanged((user) => {
                clearTimeout(timeoutId);
                unsubscribe();
                resolve(user);
            }, (error) => {
                clearTimeout(timeoutId);
                unsubscribe();
                reject(error);
            });
        });
    };
    
    // Check user role
    const checkUserRole = async function(requiredRole) {
        try {
            const user = await waitForAuth();
            if (!user) {
                return null;
            }
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                return null;
            }
            const userData = userDoc.data();
            const userRole = userData.role;
            if (requiredRole && userRole !== requiredRole) {
                return null;
            }
            return {
                user: user,
                userData: userData
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return null;
        }
    };
    
    // Redirect to login page
    const redirectToLogin = function() {
        const currentPath = window.location.pathname;
        const basePath = currentPath.includes('/dashboards/') ? '../../' : './';
        window.location.href = basePath + 'index.html';
    };
    
    // Redirect to appropriate dashboard
    const redirectToDashboard = function(role) {
        if (!role) {
            redirectToLogin();
            return;
        }
        // Check if we're already on the counselor dashboard
        const onCounselorDashboard = sessionStorage.getItem('onCounselorDashboard') === 'true';
        if (role === 'counselor' && onCounselorDashboard) {
            console.log('AuthHelper: Already on counselor dashboard, not redirecting');
            return;
        }
        const currentPath = window.location.pathname;
        const basePath = currentPath.includes('/dashboards/') ? '../' : './dashboards/';
        console.log('AuthHelper: Redirecting to', role, 'dashboard');
        console.log('AuthHelper: Current path:', currentPath);
        console.log('AuthHelper: Base path:', basePath);
        switch (role) {
            case 'admin':
                window.location.href = basePath + 'admin/index.html';
                break;
            case 'counselor':
                window.location.href = basePath + 'counselor/index.html';
                break;
            case 'student':
                window.location.href = basePath + 'student/index.html';
                break;
            default:
                redirectToLogin();
        }
    };
    
    // Sign out
    const signOut = async function() {
        try {
            await auth.signOut();
            redirectToLogin();
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            return false;
        }
    };
    
    // Return public methods (no debug UI methods)
    return {
        checkUserRole: checkUserRole,
        redirectToLogin: redirectToLogin,
        redirectToDashboard: redirectToDashboard,
        signOut: signOut
    };
})(); 