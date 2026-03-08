// Add a basic handleError function if not already defined
const errorContainer = document.getElementById('userError');
const usersCollection = db.collection('users');
function handleError(error, errorContainer) {
    console.error('Error:', error);
    if (errorContainer) {
        errorContainer.textContent = error.message || 'An error occurred';
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Store all loaded users for filtering
let allUsersCache = [];
let lastDeletedUsers = [];

// Pagination state
let currentPage = 1;
const USERS_PER_PAGE = 10;
let paginatedUsers = [];

function paginateUsers(users, page = 1, perPage = USERS_PER_PAGE) {
    const total = users.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
        users: users.slice(start, end),
        total,
        totalPages,
        page
    };
}

function renderPaginationControls(totalPages, page, onPageChange) {
    let controls = document.getElementById('userPagination');
    if (!controls) {
        controls = document.createElement('div');
        controls.id = 'userPagination';
        controls.style.display = 'flex';
        controls.style.justifyContent = 'center';
        controls.style.margin = '20px 0';
        controls.style.gap = '8px';
        document.getElementById('usersContainer').parentNode.appendChild(controls);
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

// Patch getAllUsers to log loaded users for debugging
const getAllUsers = async (role = null) => {
    try {
        let query = usersCollection;
        if (role && role !== 'all') {
            query = query.where('role', '==', role);
        }
        query = query.orderBy('createdAt', 'desc');
        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        allUsersCache = users; // Cache for filtering
        console.log('Loaded users:', users); // Debug log
        return users;
    } catch (error) {
        handleError(error, errorContainer);
        return [];
    }
};

// Helper: filter users by search term
function filterUsersBySearch(users, searchTerm) {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user =>
        (user.name && user.name.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term))
    );
}

// Toast notification for undo
function showUndoToast(message, undoCallback) {
    let toast = document.getElementById('undoToast');
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.id = 'undoToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '16px 32px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    toast.style.zIndex = 9999;
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.innerHTML = `
        <span style="margin-right:20px;">${message}</span>
        <button id="undoBtn" style="background:#5b7cfa;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Undo</button>
    `;
    document.body.appendChild(toast);
    let undone = false;
    document.getElementById('undoBtn').onclick = async function() {
        undone = true;
        toast.remove();
        await undoCallback();
    };
    setTimeout(() => {
        if (!undone) toast.remove();
    }, 7000);
}

// Patch renderUsers to log users being rendered and display them in the UI
const renderUsers = (users, containerId, page = 1) => {
    console.log('Rendering users:', users); // Debug log
    const container = document.getElementById(containerId);
    if (!container) return;

    // Add search box if not present
    let searchBox = document.getElementById('userSearchBox');
    if (!searchBox) {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'search-box';
        searchDiv.innerHTML = `
            <input type="text" id="userSearchBox" placeholder="Search users by name or email..." style="margin-bottom:10px;width:60%;max-width:300px;">
        `;
        container.parentNode.insertBefore(searchDiv, container);
        searchBox = document.getElementById('userSearchBox');
        searchBox.addEventListener('input', function() {
            const filtered = filterUsersBySearch(allUsersCache, searchBox.value);
            currentPage = 1;
            renderUsers(filtered, containerId, 1);
        });
    }

    // Add bulk action bar if not present
    let bulkBar = document.getElementById('userBulkBar');
    if (!bulkBar) {
        bulkBar = document.createElement('div');
        bulkBar.id = 'userBulkBar';
        bulkBar.style.display = 'none';
        bulkBar.style.background = '#f8f9fa';
        bulkBar.style.padding = '10px';
        bulkBar.style.marginBottom = '10px';
        bulkBar.innerHTML = `
            <span id="bulkSelectedCount">0 selected</span>
            <button class="btn danger-btn" id="bulkDeleteBtn">Delete Selected</button>
            <select id="bulkRoleSelect" style="margin-left:10px;">
                <option value="">Change Role...</option>
                <option value="student">Student</option>
                <option value="counselor">Counselor</option>
                <option value="admin">Admin</option>
            </select>
            <button class="btn primary-btn" id="bulkChangeRoleBtn">Apply</button>
        `;
        container.parentNode.insertBefore(bulkBar, container);
    }

    if (users.length === 0) {
        container.innerHTML = '<p class="no-data-message">No users found.</p>';
        bulkBar.style.display = 'none';
        renderPaginationControls(1, 1, () => {});
        return;
    }

    // Pagination logic
    const {users: pageUsers, total, totalPages} = paginateUsers(users, page, USERS_PER_PAGE);
    paginatedUsers = pageUsers;
    currentPage = page;
    renderPaginationControls(totalPages, page, (newPage) => renderUsers(users, containerId, newPage));

    // Create table
    const table = document.createElement('table');
    table.className = 'data-table';

    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th><input type="checkbox" id="selectAllUsers"></th>
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
    pageUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', user.id);
        // Format date
        let formattedDate = 'N/A';
        if (user.createdAt && user.createdAt.toDate) {
            formattedDate = user.createdAt.toDate().toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
        tr.innerHTML = `
            <td><input type="checkbox" class="userRowCheckbox" data-id="${user.id}"></td>
            <td>${user.name || 'No Name'}</td>
            <td>${user.email || ''}</td>
            <td>${user.role || ''}</td>
            <td>${formattedDate}</td>
            <td class="actions">
                <button class="btn secondary-btn edit-user-btn" data-id="${user.id}">Edit</button>
                <button class="btn danger-btn delete-user-btn" data-id="${user.id}">Delete</button>
                <button class="btn primary-btn reset-password-btn" data-id="${user.id}" data-email="${user.email}">Reset Password</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // Clear container and append table
    container.innerHTML = '';
    container.appendChild(table);

    // Bulk selection logic
    const checkboxes = container.querySelectorAll('.userRowCheckbox');
    const selectAll = container.querySelector('#selectAllUsers');
    let selectedIds = [];
    function updateBulkBar() {
        selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.getAttribute('data-id'));
        document.getElementById('bulkSelectedCount').textContent = `${selectedIds.length} selected`;
        bulkBar.style.display = selectedIds.length > 0 ? 'block' : 'none';
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

    // Add event listeners for delete
    container.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            if (!userId) return;
            if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
            try {
                // Save user data for undo
                const userToDelete = pageUsers.find(u => u.id === userId) || users.find(u => u.id === userId);
                lastDeletedUsers = [userToDelete];
                await usersCollection.doc(userId).delete();
                loadUsers();
                showUndoToast('User deleted.', async () => {
                    // Restore user
                    if (lastDeletedUsers.length > 0) {
                        const u = lastDeletedUsers[0];
                        const {id, ...data} = u;
                        await usersCollection.doc(id).set(data);
                        loadUsers();
                        alert('User restored!');
                    }
                });
            } catch (err) {
                alert('Error deleting user: ' + err.message);
            }
        });
    });

    // Bulk delete
    document.getElementById('bulkDeleteBtn').onclick = async function() {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} user(s)? This cannot be undone.`)) return;
        try {
            lastDeletedUsers = users.filter(u => selectedIds.includes(u.id));
            await Promise.all(selectedIds.map(id => usersCollection.doc(id).delete()));
            loadUsers();
            showUndoToast(`${selectedIds.length} user(s) deleted.`, async () => {
                // Restore users
                for (const u of lastDeletedUsers) {
                    const {id, ...data} = u;
                    await usersCollection.doc(id).set(data);
                }
                loadUsers();
                alert('Users restored!');
            });
        } catch (err) {
            alert('Error deleting users: ' + err.message);
        }
    };

    // Bulk change role
    document.getElementById('bulkChangeRoleBtn').onclick = async function() {
        const newRole = document.getElementById('bulkRoleSelect').value;
        if (!newRole) return alert('Select a role to apply.');
        if (selectedIds.length === 0) return;
        if (!confirm(`Change role of ${selectedIds.length} user(s) to ${newRole}?`)) return;
        try {
            await Promise.all(selectedIds.map(id => usersCollection.doc(id).update({ role: newRole })));
            loadUsers();
            alert('Roles updated!');
        } catch (err) {
            alert('Error updating roles: ' + err.message);
        }
    };

    // Add event listeners for edit
    container.querySelectorAll('.edit-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            const user = pageUsers.find(u => u.id === userId) || users.find(u => u.id === userId);
            if (!user) return;

            // Create modal
            let modal = document.getElementById('editUserRoleModal');
            if (modal) modal.remove();
            modal = document.createElement('div');
            modal.id = 'editUserRoleModal';
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" id="closeEditUserRoleModal">&times;</span>
                    <h2>Edit User</h2>
                    <form id="editUserRoleForm">
                        <div class="form-group">
                            <label for="editUserName">Name:</label>
                            <input type="text" id="editUserName" value="${user.name || ''}" required>
                        </div>
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
            document.getElementById('closeEditUserRoleModal').onclick = () => modal.remove();
            modal.onclick = (evt) => { if (evt.target === modal) modal.remove(); };

            // Handle form submit
            document.getElementById('editUserRoleForm').onsubmit = async (evt) => {
                evt.preventDefault();
                const newName = document.getElementById('editUserName').value;
                const newRole = document.getElementById('editUserRoleSelect').value;
                const errorElem = document.getElementById('editUserRoleError');
                errorElem.textContent = '';
                try {
                    await usersCollection.doc(user.id).update({ name: newName, role: newRole });
                    modal.remove();
                    // Refresh user list
                    loadUsers();
                    alert('User updated successfully!');
                } catch (err) {
                    errorElem.textContent = err.message;
                }
            };
        });
    });

    // Add event listeners for reset password
    container.querySelectorAll('.reset-password-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const email = e.target.getAttribute('data-email');
            if (!email) return alert('No email found for this user.');
            if (!confirm(`Send password reset email to ${email}?`)) return;
            try {
                await auth.sendPasswordResetEmail(email);
                alert('Password reset email sent!');
            } catch (err) {
                alert('Error sending password reset email: ' + err.message);
            }
        });
    });
};

// Add a working loadUsers method
const loadUsers = async (role = null) => {
    const users = await getAllUsers(role);
    renderUsers(users, 'usersContainer', 1);
};

// Attach usersModule to window with loadUsers
const usersModule = {
    getAllUsers,
    renderUsers,
    loadUsers,
    getUserCount: async function(role = null) {
        try {
            let query = db.collection('users');
            if (role) {
                query = query.where('role', '==', role);
            }
            const snapshot = await query.get();
            return snapshot.size;
        } catch (error) {
            console.error('Error getting user count:', error);
            return 0;
        }
    },
    // ... add other methods as needed ...
};

if (typeof window !== 'undefined') {
    window.usersModule = usersModule;
} 