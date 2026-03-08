// Resources Module
const resourcesModule = (() => {
    // Private variables and methods
    const resourcesCollection = db.collection('resources');
    const errorContainer = document.getElementById('resourceError');
    
    console.log('[resources.js] Loaded: attaching resourcesModule to window');
    
    // Get all resources
    const getAllResources = async (category = null) => {
        try {
            let query = resourcesCollection;
            
            // Filter by category if provided
            if (category && category !== 'all') {
                query = query.where('category', '==', category);
            }
            
            // Order by date
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
    
    // Get resources by counselor
    const getResourcesByCounselor = async (counselorId, category = null) => {
        try {
            let query = resourcesCollection.where('counselorId', '==', counselorId);
            
            // Filter by category if provided
            if (category && category !== 'all') {
                query = query.where('category', '==', category);
            }
            
            // Order by date
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
    
    // Get resource by ID
    const getResourceById = async (resourceId) => {
        try {
            const doc = await resourcesCollection.doc(resourceId).get();
            
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } else {
                throw new Error('Resource not found');
            }
        } catch (error) {
            handleError(error, errorContainer);
            return null;
        }
    };
    
    // Create a new resource
    const createResource = async (resourceData, file = null) => {
        try {
            // Validate resource data
            if (!resourceData.title || !resourceData.category || !resourceData.counselorId) {
                throw new Error('Missing required resource data');
            }
            
            // Set default values
            const newResource = {
                ...resourceData,
                createdAt: timestamp,
                updatedAt: timestamp,
                fileUrl: null,
                fileName: null
            };
            
            // If file is provided, upload to Storage
            if (file) {
                const fileRef = storage.ref(`resources/${Date.now()}_${file.name}`);
                await fileRef.put(file);
                
                // Get download URL
                const fileUrl = await fileRef.getDownloadURL();
                
                // Add file info to resource
                newResource.fileUrl = fileUrl;
                newResource.fileName = file.name;
            }
            
            // Add to collection
            const docRef = await resourcesCollection.add(newResource);
            
            return {
                id: docRef.id,
                ...newResource
            };
        } catch (error) {
            handleError(error, errorContainer);
            return null;
        }
    };
    
    // Update resource
    const updateResource = async (resourceId, updateData, file = null) => {
        try {
            // Get current resource data
            const currentResource = await getResourceById(resourceId);
            
            if (!currentResource) {
                throw new Error('Resource not found');
            }
            
            // Add updatedAt timestamp
            updateData.updatedAt = timestamp;
            
            // Prevent changing critical fields
            delete updateData.counselorId;
            delete updateData.createdAt;
            
            // If file is provided, upload to Storage
            if (file) {
                // Delete old file if exists
                if (currentResource.fileUrl) {
                    try {
                        const oldFileRef = storage.refFromURL(currentResource.fileUrl);
                        await oldFileRef.delete();
                    } catch (error) {
                        console.error('Error deleting old file:', error);
                    }
                }
                
                const fileRef = storage.ref(`resources/${Date.now()}_${file.name}`);
                await fileRef.put(file);
                
                // Get download URL
                const fileUrl = await fileRef.getDownloadURL();
                
                // Add file info to resource
                updateData.fileUrl = fileUrl;
                updateData.fileName = file.name;
            }
            
            // Update the document
            await resourcesCollection.doc(resourceId).update(updateData);
            
            return true;
        } catch (error) {
            handleError(error, errorContainer);
            return false;
        }
    };
    
    // Delete resource
    const deleteResource = async (resourceId) => {
        try {
            // Get current resource data
            const resource = await getResourceById(resourceId);
            
            if (!resource) {
                throw new Error('Resource not found');
            }
            
            // Delete file from Storage if exists
            if (resource.fileUrl) {
                try {
                    const fileRef = storage.refFromURL(resource.fileUrl);
                    await fileRef.delete();
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }
            
            // Delete document
            await resourcesCollection.doc(resourceId).delete();
            
            return true;
        } catch (error) {
            handleError(error, errorContainer);
            return false;
        }
    };
    
    // Render resources to UI
    const renderResources = async (resources, containerId) => {
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        if (resources.length === 0) {
            container.innerHTML = '<p class="no-data-message">No resources found.</p>';
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Create resources grid
        const resourcesGrid = document.createElement('div');
        resourcesGrid.className = 'resources-grid';
        
        // Get counselor info for each resource
        const enhancedResources = await Promise.all(resources.map(async (resource) => {
            try {
                const counselorDoc = await db.collection('users').doc(resource.counselorId).get();
                const counselorName = counselorDoc.exists ? counselorDoc.data().name : 'Unknown Counselor';
                
                return {
                    ...resource,
                    counselorName
                };
            } catch (error) {
                console.error('Error getting counselor data:', error);
                return {
                    ...resource,
                    counselorName: 'Unknown Counselor'
                };
            }
        }));
        
        // Add resources to grid
        enhancedResources.forEach(resource => {
            const card = document.createElement('div');
            card.className = 'resource-card';
            card.setAttribute('data-id', resource.id);
            
            // Create file icon or image
            let filePreview = '';
            
            if (resource.fileUrl) {
                // Check if it's an image
                if (resource.fileName.match(/\.(jpeg|jpg|gif|png)$/i)) {
                    filePreview = `<img src="${resource.fileUrl}" alt="${resource.title}">`;
                } else {
                    filePreview = `<div class="file-icon"><i class="fas fa-file-alt"></i></div>`;
                }
            } else {
                filePreview = `<div class="file-icon"><i class="fas fa-link"></i></div>`;
            }
            
            // Format date
            const formattedDate = formatDate(resource.createdAt);
            
            // Create HTML structure
            card.innerHTML = `
                ${filePreview}
                <div class="resource-card-body">
                    <h3 class="resource-card-title">${resource.title}</h3>
                    <p class="resource-card-description">${resource.description || ''}</p>
                    <div class="resource-card-meta">
                        <span><i class="fas fa-tag"></i> ${resource.category}</span>
                        <span><i class="fas fa-user"></i> ${resource.counselorName}</span>
                    </div>
                    <div class="resource-card-actions">
                        ${resource.fileUrl ? `
                            <a href="${resource.fileUrl}" class="btn primary-btn" target="_blank">Download</a>
                        ` : resource.externalUrl ? `
                            <a href="${resource.externalUrl}" class="btn primary-btn" target="_blank">Visit</a>
                        ` : ''}
                        <button class="btn secondary-btn details-btn" data-id="${resource.id}">Details</button>
                    </div>
                </div>
            `;
            
            resourcesGrid.appendChild(card);
        });
        
        container.appendChild(resourcesGrid);
        
        // Add event listeners
        addResourceEventListeners();
    };
    
    // Add event listeners to resource buttons
    const addResourceEventListeners = () => {
        // Details buttons
        document.querySelectorAll('.details-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const resourceId = e.target.getAttribute('data-id');
                const resource = await getResourceById(resourceId);
                
                if (resource) {
                    // Show resource details modal
                    showResourceDetails(resource);
                }
            });
        });
    };
    
    // Show resource details in a modal
    const showResourceDetails = async (resource) => {
        try {
            // Get counselor name
            const counselorDoc = await db.collection('users').doc(resource.counselorId).get();
            const counselorName = counselorDoc.exists ? counselorDoc.data().name : 'Unknown Counselor';
            
            // Create modal dynamically
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            
            // Format date
            const formattedDate = formatDate(resource.createdAt);
            
            // Check if current user is the resource owner or admin
            const user = auth.currentUser;
            let isOwnerOrAdmin = false;
            
            if (user) {
                const userRole = await getUserRole(user.uid);
                isOwnerOrAdmin = (user.uid === resource.counselorId) || (userRole === 'admin');
            }
            
            // Create modal content
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Resource Details</h2>
                    <div class="resource-details-full">
                        <h3>${resource.title}</h3>
                        ${resource.description ? `<p>${resource.description}</p>` : ''}
                        <div class="resource-meta">
                            <p><strong>Category:</strong> ${resource.category}</p>
                            <p><strong>Uploaded by:</strong> ${counselorName}</p>
                            <p><strong>Uploaded on:</strong> ${formattedDate}</p>
                            ${resource.fileUrl ? `
                                <p><strong>File:</strong> ${resource.fileName}</p>
                                <p><a href="${resource.fileUrl}" class="btn primary-btn" target="_blank">Download File</a></p>
                            ` : ''}
                            ${resource.externalUrl ? `
                                <p><strong>External Link:</strong> <a href="${resource.externalUrl}" target="_blank">${resource.externalUrl}</a></p>
                            ` : ''}
                        </div>
                        ${isOwnerOrAdmin ? `
                            <div class="admin-actions">
                                <button class="btn secondary-btn edit-resource-btn" data-id="${resource.id}">Edit</button>
                                <button class="btn danger-btn delete-resource-btn" data-id="${resource.id}">Delete</button>
                            </div>
                        ` : ''}
                    </div>
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
            
            // Add edit and delete event listeners if owner or admin
            if (isOwnerOrAdmin) {
                // Edit button
                modal.querySelector('.edit-resource-btn').addEventListener('click', () => {
                    document.body.removeChild(modal);
                    showEditResourceForm(resource);
                });
                
                // Delete button
                modal.querySelector('.delete-resource-btn').addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this resource?')) {
                        const success = await deleteResource(resource.id);
                        
                        if (success) {
                            document.body.removeChild(modal);
                            loadResources();
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error showing resource details:', error);
        }
    };
    
    // Show form to edit resource
    const showEditResourceForm = (resource) => {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        // Create modal content
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit Resource</h2>
                <form id="editResourceForm" class="resource-form">
                    <input type="hidden" id="resourceId" value="${resource.id}">
                    
                    <div class="form-group">
                        <label for="title">Title:</label>
                        <input type="text" id="title" value="${resource.title}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description:</label>
                        <textarea id="description">${resource.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="category">Category:</label>
                        <select id="category" required>
                            <option value="Academic" ${resource.category === 'Academic' ? 'selected' : ''}>Academic</option>
                            <option value="Career" ${resource.category === 'Career' ? 'selected' : ''}>Career</option>
                            <option value="Personal" ${resource.category === 'Personal' ? 'selected' : ''}>Personal</option>
                            <option value="Mental Health" ${resource.category === 'Mental Health' ? 'selected' : ''}>Mental Health</option>
                            <option value="Other" ${resource.category === 'Other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="externalUrl">External URL (optional):</label>
                        <input type="url" id="externalUrl" value="${resource.externalUrl || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="file">Replace File (optional):</label>
                        <input type="file" id="file">
                        ${resource.fileName ? `<p class="file-info">Current file: ${resource.fileName}</p>` : ''}
                    </div>
                    
                    <button type="submit" class="btn primary-btn">Update Resource</button>
                    <p id="editResourceError" class="error-message"></p>
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
        const editForm = document.getElementById('editResourceForm');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const resourceId = editForm.resourceId.value;
            const title = editForm.title.value;
            const description = editForm.description.value;
            const category = editForm.category.value;
            const externalUrl = editForm.externalUrl.value;
            const file = editForm.file.files[0];
            
            const updateData = {
                title,
                description,
                category,
                externalUrl: externalUrl || null
            };
            
            const success = await updateResource(resourceId, updateData, file);
            
            if (success) {
                document.body.removeChild(modal);
                loadResources();
            }
        });
    };
    
    // Load resources
    const loadResources = async (category = null) => {
        const resources = await getAllResources(category);
        renderResources(resources, 'resourcesContainer');
    };
    
    // Load resources by current counselor
    const loadCounselorResources = async () => {
        const user = auth.currentUser;
        
        if (!user) return;
        
        const resources = await getResourcesByCounselor(user.uid);
        renderResources(resources, 'myResourcesContainer');
    };
    
    // Add getResourceCount to the public API
    const getResourceCount = async () => {
        try {
            const snapshot = await resourcesCollection.get();
            return snapshot.size;
        } catch (error) {
            handleError(error, errorContainer);
            return 0;
        }
    };
    
    // Public API
    return {
        getAllResources,
        getResourcesByCounselor,
        getResourceById,
        createResource,
        updateResource,
        deleteResource,
        renderResources,
        loadResources,
        loadCounselorResources,
        showEditResourceForm,
        getResourceCount
    };
})();

// Export module
if (typeof window !== 'undefined') {
    window.resourcesModule = resourcesModule;
    console.log('[resources.js] window.resourcesModule keys:', Object.keys(window.resourcesModule));
    if (!window.resourcesModule.getAllResources) {
        console.error('[resources.js] getAllResources is missing from resourcesModule!');
    }
} 