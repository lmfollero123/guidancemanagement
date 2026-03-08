// DOM Elements
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerName = document.getElementById('register-name');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerRole = document.getElementById('register-role');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const closeForgotModal = document.getElementById('close-forgot-modal');
const resetEmail = document.getElementById('reset-email');
const resetButton = document.getElementById('reset-button');
const resetError = document.getElementById('reset-error');
const resetSuccess = document.getElementById('reset-success');

// Tab switching functionality
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    clearErrors();
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    clearErrors();
});

// Forgot password modal
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordModal.style.display = 'block';
});

closeForgotModal.addEventListener('click', () => {
    forgotPasswordModal.style.display = 'none';
    resetEmail.value = '';
    resetError.style.display = 'none';
    resetSuccess.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === forgotPasswordModal) {
        forgotPasswordModal.style.display = 'none';
        resetEmail.value = '';
        resetError.style.display = 'none';
        resetSuccess.style.display = 'none';
    }
});

// Clear error messages
function clearErrors() {
    loginError.style.display = 'none';
    registerError.style.display = 'none';
}

// Login functionality
loginButton.addEventListener('click', () => {
    // Validate inputs
    if (!loginEmail.value || !loginPassword.value) {
        showError(loginError, 'Please fill in all fields');
        return;
    }
    
    // Show loading state
    loginButton.textContent = 'Logging in...';
    loginButton.disabled = true;
    
    // Attempt to sign in
    auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value)
        .then((userCredential) => {
            console.log('Signed in UID:', userCredential.user.uid);
            // Get user role from Firestore
            return db.collection('users').doc(userCredential.user.uid).get()
                .then((doc) => {
                    console.log('User doc exists:', doc.exists, 'Doc data:', doc.data());
                    if (doc.exists) {
                        const userData = doc.data();
                        const role = userData.role;
                        
                        // Redirect based on role
                        if (role === 'admin') {
                            window.location.href = 'dashboards/admin/index.html';
                        } else if (role === 'counselor') {
                            window.location.href = 'dashboards/counselor/index.html';
                        } else if (role === 'student') {
                            window.location.href = 'dashboards/student/index.html';
                        } else {
                            throw new Error('Invalid user role');
                        }
                    } else {
                        throw new Error('User data not found');
                    }
                });
        })
        .catch((error) => {
            console.error('Login error:', error);
            let errorMessage;
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Invalid email or password';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed login attempts. Please try again later';
                    break;
                default:
                    errorMessage = error.message;
            }
            showError(loginError, errorMessage);
            loginButton.textContent = 'Login';
            loginButton.disabled = false;
        });
});

// Registration functionality
registerButton.addEventListener('click', () => {
    // Validate inputs
    if (!registerName.value || !registerEmail.value || !registerPassword.value || !registerRole.value) {
        showError(registerError, 'Please fill in all fields');
        return;
    }
    
    if (registerPassword.value.length < 6) {
        showError(registerError, 'Password must be at least 6 characters');
        return;
    }
    
    // Show loading state
    registerButton.textContent = 'Registering...';
    registerButton.disabled = true;
    
    // Create user
    auth.createUserWithEmailAndPassword(registerEmail.value, registerPassword.value)
        .then((userCredential) => {
            // Add user to Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                name: registerName.value,
                email: registerEmail.value,
                role: registerRole.value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                // Add user to specific role collection
                return db.collection(registerRole.value + 's').doc(userCredential.user.uid).set({
                    name: registerName.value,
                    email: registerEmail.value,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }).then(() => {
                // Update user profile
                return userCredential.user.updateProfile({
                    displayName: registerName.value
                });
            }).then(() => {
                // Log activity
                return db.collection('activity').add({
                    action: 'user_registered',
                    userId: userCredential.user.uid,
                    userName: registerName.value,
                    userRole: registerRole.value,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }).then(() => {
                // Show success message and redirect
                alert('Registration successful! Please login with your credentials.');
                loginTab.click();
                registerName.value = '';
                registerEmail.value = '';
                registerPassword.value = '';
                registerRole.value = '';
            });
        })
        .catch((error) => {
            console.error('Registration error:', error);
            let errorMessage;
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email address is already in use';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak';
                    break;
                default:
                    errorMessage = error.message;
            }
            showError(registerError, errorMessage);
        }).finally(() => {
            registerButton.textContent = 'Register';
            registerButton.disabled = false;
        });
});

// Password reset functionality
resetButton.addEventListener('click', () => {
    // Validate input
    if (!resetEmail.value) {
        showError(resetError, 'Please enter your email address');
        return;
    }
    
    // Show loading state
    resetButton.textContent = 'Sending...';
    resetButton.disabled = true;
    resetError.style.display = 'none';
    resetSuccess.style.display = 'none';
    
    // Send password reset email
    auth.sendPasswordResetEmail(resetEmail.value)
        .then(() => {
            resetSuccess.style.display = 'block';
            resetEmail.value = '';
        })
        .catch((error) => {
            console.error('Password reset error:', error);
            let errorMessage;
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No user found with this email address';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                default:
                    errorMessage = error.message;
            }
            showError(resetError, errorMessage);
        }).finally(() => {
            resetButton.textContent = 'Send Reset Link';
            resetButton.disabled = false;
        });
});

// Helper function to show error messages
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// Only run this on the root login page!
if (
  window.location.pathname === '/index.html' ||
  window.location.pathname === '/' ||
  window.location.pathname.endsWith('/FINAL/') // adjust as needed for your root
) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('User is signed in (assets/js/auth.js):', user.email);
      
      // Get the current page path
      const currentPath = window.location.pathname;
      
      // Check if we're on the counselor dashboard
      const onCounselorDashboard = sessionStorage.getItem('onCounselorDashboard') === 'true';
      
      // Don't redirect if we're already in a dashboard or on the test page
      if (currentPath.includes('/dashboards/') || currentPath.includes('auth-test.html') || onCounselorDashboard) {
        console.log('Already in a dashboard or counselor dashboard, not redirecting');
        return;
      }
      
      // Only redirect from the login page
      if (!currentPath.endsWith('index.html') && !currentPath.endsWith('/')) {
        console.log('Not on login page, not redirecting');
        return;
      }
      
      // Create a debug message element
      const debugElement = document.createElement('div');
      debugElement.style.cssText = 'position: fixed; top: 0; left: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-family: monospace;';
      debugElement.innerHTML = 'User already signed in, redirecting to appropriate dashboard...';
      document.body.appendChild(debugElement);
      
      // Get user role from Firestore
      db.collection('users').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            const role = userData.role;
            
            debugElement.innerHTML += `<br>User role: ${role}`;
            console.log(`User logged in with role: ${role}`);
            
            // Redirect to appropriate dashboard
            setTimeout(() => {
              // Check again before redirecting to avoid race conditions
              if (sessionStorage.getItem('onCounselorDashboard') !== 'true') {
                console.log(`Redirecting to ${role} dashboard`);
                AuthHelper.redirectToDashboard(role);
              } else {
                console.log('Not redirecting - detected counselor dashboard flag');
              }
            }, 1000);
          } else {
            debugElement.innerHTML += '<br>No user data found in Firestore';
          }
        })
        .catch((error) => {
          debugElement.innerHTML += `<br>Error: ${error.message}`;
          console.error('Error getting user data:', error);
        });
    } else {
      console.log('No user is signed in');
    }
  });
} 