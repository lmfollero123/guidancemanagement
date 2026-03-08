// Users Management Module
const usersModule = (() => {
    // Private variables and methods
    const usersCollection = db.collection('users');
    const errorContainer = document.getElementById('userError');
    
    // Get all users
    const getAllUsers = async (role = null) => {
        try {
            let query = usersCollection;
            
            // Filter by role if provided
            if (role && role !== 'all') {
                query = query.where('role', '==', role);
            }
            
            // Order by creation date
            query = query.orderBy('createdAt', 'desc');
            
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
    
    // Get user by ID
    const getUserById = async (userId) => {
        try {
            const doc = await usersCollection.doc(userId).get();
            
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } else {
                throw new Error('User not found');
            }
        } catch (error) {
            handleError(error, errorContainer);
            return null;
        }
    };
    
    // Update user (admin only)
    const updateUser = async (userId, updateData) => {
        try {
            // Get current user data
            const currentUser = await getUserById(userId);
            
            if (!currentUser) {
                throw new Error('User not found');
            }
            
            // Prevent changing email (would require re-authentication)
            delete updateData.email;
            
            // Update the document
            await usersCollection.doc(userId).update(updateData);
            
            return true;
        } catch (error) {
            handleError(error, errorContainer);
            return false;
        }
    };
    
    // Create new user (admin only)
    const createUser = async (userData, password) => {
        try {
            // Validate user data
            if (!userData.email || !userData.name || !userData.role || !password) {
                throw new Error('Missing required user data');
            }
            
            // Create user in Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(userData.email, password);
            
            // Update profile with name
            await userCredential.user.updateProfile({
                displayName: userData.name
            });
            
            // Create user document in Firestore
            await usersCollection.doc(userCredential.user.uid).set({
                ...userData,
                createdAt: timestamp
            });
            
            // Notify all admins of new user registration
            const adminsSnap = await usersCollection.where('role', '==', 'admin').get();
            for (const adminDoc of adminsSnap.docs) {
                await createNotification({
                    toUid: adminDoc.id,
                    message: `New user registered: ${userData.name} (${userData.role})`,
                    type: 'admin',
                    link: '',
                });
            }
            
            // Log out the admin after creating a new user
            await auth.signOut();
            
            // Sign back in as admin
            await auth.signInWithEmailAndPassword(userData.adminEmail, userData.adminPassword);
            
            return {
                id: userCredential.user.uid,
                ...userData
            };
        } catch (error) {
            handleError(error, errorContainer);
            return null;
        }
    };
    
    // Delete user (admin only)
    const deleteUser = async (userId) => {
        try {
            // Delete user document from Firestore
            await usersCollection.doc(userId).delete();
            
            // Note: Deleting from Authentication requires Firebase Admin SDK on server
            // We can mark the user as "deleted" in Firestore instead
            
            return true;
        } catch (error) {
            handleError(error, errorContainer);
            return false;
        }
    };
    
    // Render users to UI
    const renderUsers = (users, containerId) => {
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<p class="no-data-message">No users found.</p>';
            return;
        }
        
        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Date Created</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Add users to table
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', user.id);
            
            // Format date
            const formattedDate = formatDate(user.createdAt);
            
            // Create row HTML
            tr.innerHTML = `
                <td>${user.name || 'No Name'}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${formattedDate}</td>
                <td class="actions">
                    <button class="btn secondary-btn edit-user-btn" data-id="${user.id}">Edit</button>
                    <button class="btn danger-btn delete-user-btn" data-id="${user.id}">Delete</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        
        // Clear container and append table
        container.innerHTML = '';
        container.appendChild(table);
        
        // Add event listeners
        addUserEventListeners();
    };
    
    // Add event listeners to user buttons
    const addUserEventListeners = () => {
        // Edit buttons
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.getAttribute('data-id');
                const user = await getUserById(userId);
                
                if (user) {
                    // Show edit user form
                    showEditUserForm(user);
                }
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.getAttribute('data-id');
                
                if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                    const success = await deleteUser(userId);
                    
                    if (success) {
                        // Refresh the user list
                        loadUsers();
                    }
                }
            });
        });
    };
    
    // Show form to edit user
    const showEditUserForm = (user) => {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        // Create modal content
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit User</h2>
                <form id="editUserForm" class="user-form">
                    <input type="hidden" id="userId" value="${user.id}">
                    
                    <div class="form-group">
                        <label for="name">Name:</label>
                        <input type="text" id="name" value="${user.name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" value="${user.email}" disabled>
                        <small>Email cannot be changed</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="role">Role:</label>
                        <select id="role" required>
                            <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                            <option value="counselor" ${user.role === 'counselor' ? 'selected' : ''}>Counselor</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn primary-btn">Update User</button>
                    <p id="editUserError" class="error-message"></p>
                </form>
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
        
        // Add form submit event
        const editForm = document.getElementById('editUserForm');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userId = editForm.userId.value;
            const name = editForm.name.value;
            const role = editForm.role.value;
            
            const updateData = {
                name,
                role
            };
            
            const success = await updateUser(userId, updateData);
            
            if (success) {
                document.body.removeChild(modal);
                loadUsers();
            }
        });
    };
    
    // Show form to create new user
    const showCreateUserForm = () => {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        // Create modal content
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Create New User</h2>
                <form id="createUserForm" class="user-form">
                    <div class="form-group">
                        <label for="name">Name:</label>
                        <input type="text" id="name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" required>
                        <small>Minimum 6 characters</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="role">Role:</label>
                        <select id="role" required>
                            <option value="student">Student</option>
                            <option value="counselor">Counselor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn primary-btn">Create User</button>
                    <p id="createUserError" class="error-message"></p>
                </form>
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
        
        // Add form submit event
        const createForm = document.getElementById('createUserForm');
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = createForm.name.value;
            const email = createForm.email.value;
            const password = createForm.password.value;
            const role = createForm.role.value;
            
            // Get admin credentials for re-authentication after creating user
            const adminUser = auth.currentUser;
            
            if (!adminUser) {
                alert('You need to be logged in as an admin to create users.');
                return;
            }
            
            const adminEmail = adminUser.email;
            const adminPassword = prompt('Please enter your admin password to confirm:');
            
            if (!adminPassword) {
                return;
            }
            
            const userData = {
                name,
                email,
                role,
                adminEmail,
                adminPassword
            };
            
            const newUser = await createUser(userData, password);
            
            if (newUser) {
                document.body.removeChild(modal);
                loadUsers();
            }
        });
    };
    
    // Load users
    const loadUsers = async (role = null) => {
        const users = await getAllUsers(role);
        renderUsers(users, 'usersContainer');
    };
    
    // Filter users by role
    const setupRoleFilter = () => {
        const roleFilter = document.getElementById('roleFilter');
        
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                const selectedRole = roleFilter.value;
                loadUsers(selectedRole);
            });
        }
    };
    
    // Setup create user button
    const setupCreateUserButton = () => {
        const createUserBtn = document.getElementById('createUserBtn');
        
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => {
                showCreateUserForm();
            });
        }
    };
    
    // Initialize users module
    const initializeUsersModule = () => {
        setupRoleFilter();
        setupCreateUserButton();
        loadUsers();
    };
    
    // Notification helper (if not present)
    async function createNotification({ toUid, message, type = 'status', link = '', extra = {} }) {
        try {
            await db.collection('notifications').add({
                toUid,
                message,
                type,
                link: link || '',
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                ...extra
            });
        } catch (err) {
            console.error('Error creating notification:', err);
        }
    }
    
    // Public API
    return {
        getAllUsers,
        getUserById,
        updateUser,
        createUser,
        deleteUser,
        renderUsers,
        loadUsers,
        showEditUserForm,
        showCreateUserForm,
        initializeUsersModule
    };
})();

// Export module
if (typeof window !== 'undefined') {
    window.usersModule = usersModule;
} 