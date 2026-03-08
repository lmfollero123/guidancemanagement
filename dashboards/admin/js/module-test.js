/**
 * Module Test Script with Auto-Fix Functionality
 * Verifies that all required modules are properly defined and creates fallbacks if needed
 * This helps prevent JavaScript errors when modules aren't loading properly
 */

(function() {
    console.log('Module Test with Auto-Fix:');
    console.log('=========================');
    
    // Test Firebase and Auth
    console.log('Firebase:', typeof firebase !== 'undefined' ? 'LOADED ✅' : 'MISSING ❌');
    console.log('Firebase Auth:', typeof firebase !== 'undefined' && firebase.auth ? 'LOADED ✅' : 'MISSING ❌');
    console.log('Firebase Firestore:', typeof firebase !== 'undefined' && firebase.firestore ? 'LOADED ✅' : 'MISSING ❌');
    console.log('Firebase Storage:', typeof firebase !== 'undefined' && firebase.storage ? 'LOADED ✅' : 'MISSING ❌');
    
    // Test Auth Helper
    console.log('AuthHelper:', typeof AuthHelper !== 'undefined' ? 'LOADED ✅' : 'MISSING ❌');
    
    // Test Required Modules
    console.log('Users Module:', typeof usersModule !== 'undefined' ? 'LOADED ✅' : 'MISSING ❌');
    console.log('Appointments Module:', typeof appointmentsModule !== 'undefined' ? 'LOADED ✅' : 'MISSING ❌');
    console.log('Resources Module:', typeof resourcesModule !== 'undefined' ? 'LOADED ✅' : 'MISSING ❌');
    console.log('loadSettings Function:', typeof loadSettings === 'function' ? 'LOADED ✅' : 'MISSING ❌');
    
    // Test Database Access
    console.log('DB Object:', typeof db !== 'undefined' ? 'LOADED ✅' : 'MISSING ❌');
    
    // Auto-fix section for missing modules
    
    // Fix for usersModule if missing
    if (typeof usersModule === 'undefined' || usersModule === null) {
        console.warn('⚠️ Creating backup usersModule');
        window.usersModule = {
            getUserCount: async function(role = null) {
                try {
                    let query = db.collection('users');
                    if (role) {
                        query = query.where('role', '==', role);
                    }
                    const snapshot = await query.get();
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting user count:', error);
                    return 0;
                }
            },
            loadUsers: function() {
                console.log('Backup user loader called');
                const container = document.getElementById('usersContainer');
                if (container) {
                    container.innerHTML = '<p>Users loading function unavailable</p>';
                }
            }
        };
    }
    
    // Fix for appointmentsModule if missing
    if (typeof appointmentsModule === 'undefined' || appointmentsModule === null) {
        console.warn('⚠️ Creating backup appointmentsModule');
        window.appointmentsModule = {
            getAppointmentCount: async function(status = null) {
                try {
                    let query = db.collection('appointments');
                    if (status) {
                        query = query.where('status', '==', status);
                    }
                    const snapshot = await query.get();
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting appointment count:', error);
                    return 0;
                }
            },
            getTodayAppointmentCount: async function() {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    
                    const snapshot = await db.collection('appointments')
                        .where('date', '>=', today)
                        .where('date', '<', tomorrow)
                        .get();
                    
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting today appointment count:', error);
                    return 0;
                }
            }
        };
    }
    
    // Fix for resourcesModule if missing
    if (typeof resourcesModule === 'undefined' || resourcesModule === null) {
        console.warn('⚠️ Creating backup resourcesModule');
        window.resourcesModule = {
            getResourceCount: async function() {
                try {
                    const snapshot = await db.collection('resources').get();
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting resource count:', error);
                    return 0;
                }
            },
            loadResources: function() {
                console.log('Backup resource loader called');
                const container = document.getElementById('resourcesContainer');
                if (container) {
                    container.innerHTML = '<p>Resources loading function unavailable</p>';
                }
            }
        };
    }
    
    // Fix for loadSettings function if missing
    if (typeof loadSettings === 'undefined') {
        console.warn('⚠️ Creating backup loadSettings function');
        window.loadSettings = function() {
            console.log('Backup settings loader called');
            // Simple implementation
            document.querySelectorAll('.settings-tab-content').forEach(tab => {
                tab.innerHTML += '<p>Settings functionality is temporarily unavailable</p>';
            });
        };
    }
    
    // Fix for loadRecentActivity function if missing
    if (typeof loadRecentActivity === 'undefined') {
        console.warn('⚠️ Creating backup loadRecentActivity function');
        window.loadRecentActivity = function() {
            const container = document.getElementById('recentActivityContainer');
            if (container) {
                container.innerHTML = '<p>Recent activity loading is temporarily unavailable</p>';
            }
        };
    }
    
    // Fix for loadUpcomingAppointmentsForDashboard function if missing
    if (typeof loadUpcomingAppointmentsForDashboard === 'undefined') {
        console.warn('⚠️ Creating backup loadUpcomingAppointmentsForDashboard function');
        window.loadUpcomingAppointmentsForDashboard = function() {
            const container = document.getElementById('upcomingAppointmentsContainer');
            if (container) {
                container.innerHTML = '<p>Upcoming appointments loading is temporarily unavailable</p>';
            }
        };
    }
    
    console.log('Module Auto-Fix Complete');
    console.log('=========================');
})();

/**
 * Module Testing & Error Recovery Script
 * This script checks for missing modules and re-initializes them if needed
 */

// Function to check if all required modules are defined
function checkAndFixModules() {
    console.log("🔍 Checking for module initialization issues...");
    
    // Fix for the usersModule if missing
    if (typeof usersModule === 'undefined' || usersModule === null) {
        console.warn("⚠️ usersModule not found - initializing backup");
        window.usersModule = {
            getUserCount: async function(role) {
                console.log(`Getting user count for role: ${role}`);
                try {
                    let query = db.collection('users');
                    if (role) {
                        query = query.where('role', '==', role);
                    }
                    const snapshot = await query.get();
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting user count:', error);
                    return 0;
                }
            },
            loadUsers: function(role) {
                console.log(`Loading users with role: ${role}`);
                // Implementation omitted for brevity
                const container = document.getElementById('usersContainer');
                if (container) {
                    container.innerHTML = '<p>User loading in progress...</p>';
                }
            }
        };
    }
    
    // Fix for the appointmentsModule if missing
    if (typeof appointmentsModule === 'undefined' || appointmentsModule === null) {
        console.warn("⚠️ appointmentsModule not found - initializing backup");
        window.appointmentsModule = {
            getAppointmentCount: async function(status) {
                console.log(`Getting appointment count for status: ${status}`);
                try {
                    let query = db.collection('appointments');
                    if (status) {
                        query = query.where('status', '==', status);
                    }
                    const snapshot = await query.get();
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting appointment count:', error);
                    return 0;
                }
            },
            getTodayAppointmentCount: async function() {
                console.log('Getting today appointment count');
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    
                    const snapshot = await db.collection('appointments')
                        .where('date', '>=', today)
                        .where('date', '<', tomorrow)
                        .get();
                    
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting today appointment count:', error);
                    return 0;
                }
            }
        };
    }
    
    // Fix for the resourcesModule if missing
    if (typeof resourcesModule === 'undefined' || resourcesModule === null) {
        console.warn("⚠️ resourcesModule not found - initializing backup");
        window.resourcesModule = {
            getResourceCount: async function() {
                console.log('Getting resource count');
                try {
                    const snapshot = await db.collection('resources').get();
                    return snapshot.docs.length;
                } catch (error) {
                    console.error('Error getting resource count:', error);
                    return 0;
                }
            },
            loadResources: function() {
                console.log('Loading resources');
                // Implementation omitted for brevity
                const container = document.getElementById('resourcesContainer');
                if (container) {
                    container.innerHTML = '<p>Resource loading in progress...</p>';
                }
            }
        };
    }
    
    // Fix for the loadUpcomingAppointmentsForDashboard function if missing
    if (typeof loadUpcomingAppointmentsForDashboard === 'undefined') {
        console.warn("⚠️ loadUpcomingAppointmentsForDashboard not found - using the alternative");
        window.loadUpcomingAppointmentsForDashboard = function() {
            if (typeof loadUpcomingAppointmentsAlternative === 'function') {
                console.log("Using alternative appointment loader");
                loadUpcomingAppointmentsAlternative();
            } else {
                console.error("No appointment loader functions available");
                const container = document.getElementById('upcomingAppointmentsContainer');
                if (container) {
                    container.innerHTML = '<p class="error-message">Unable to load appointments due to missing module</p>';
                }
            }
        };
    }
    
    // Fix for loadSettings function if missing
    if (typeof loadSettings === 'undefined') {
        console.warn("⚠️ loadSettings not found - initializing backup");
        window.loadSettings = function() {
            console.log('Loading settings (backup implementation)');
            const container = document.querySelector('#settingsSection .settings-tab-content.active');
            if (container) {
                container.innerHTML += '<p>Settings functionality is being implemented.</p>';
            }
        };
    }
    
    console.log("✅ Module check complete");
}

// Run the check when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a moment for other scripts to initialize
    setTimeout(checkAndFixModules, 500);
}); 