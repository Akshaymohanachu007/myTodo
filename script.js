// Global Variables
let elementToDelete = null;
let deleteType = '';
let savedData = {
    categories: [],
    tags: []
};

// Initialize data
function initializeData() {
    try {
        const storedData = localStorage.getItem('todoData');
        if (storedData) {
            savedData = JSON.parse(storedData);
            // Ensure data structure is correct
            if (!savedData.categories) savedData.categories = [];
            if (!savedData.tags) savedData.tags = [];
            
            // Initialize isOpen for categories if not present
            savedData.categories.forEach(cat => {
                if (cat.isOpen === undefined) cat.isOpen = true;
                if (!cat.id) cat.id = generateId();
            });
        }
    } catch (e) {
        console.error("Error loading data:", e);
        savedData = { categories: [], tags: [] };
    }
}

// Helper Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function findCategoryById(id) {
    return savedData.categories.find(cat => cat.id === id);
}

function getChildCategories(parentId) {
    return savedData.categories.filter(cat => cat.parentId === parentId);
}

function getAllDescendantIds(parentId) {
    const descendants = [];
    const queue = [...getChildCategories(parentId)];
    
    while (queue.length > 0) {
        const current = queue.shift();
        descendants.push(current.id);
        queue.push(...getChildCategories(current.id));
    }
    
    return descendants;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    try {
        loadTasks();
        setupPopupHandlers();
        loadSavedTags();
    } catch (e) {
        console.error("Initialization error:", e);
    }
    
    // Close tag panel when clicking outside
    document.addEventListener('click', function(event) {
        const tagPanel = document.getElementById('tagPanel');
        const toggleBtn = document.querySelector('.toggle-tags-btn');
        
        if (tagPanel && tagPanel.classList.contains('active') && 
            !tagPanel.contains(event.target) && 
            event.target !== toggleBtn) {
            toggleTagPanel();
        }
    });
});

// Save all data to localStorage
function saveAllData() {
    try {
        localStorage.setItem('todoData', JSON.stringify(savedData));
    } catch (e) {
        console.error("Error saving data:", e);
    }
}

// Toggle Tag Panel Visibility
function toggleTagPanel() {
    const tagPanel = document.getElementById('tagPanel');
    const mainContent = document.querySelector('.main-content');
    const toggleBtn = document.querySelector('.toggle-tags-btn');
    
    if (!tagPanel || !mainContent || !toggleBtn) return;
    
    tagPanel.classList.toggle('active');
    mainContent.classList.toggle('with-tag-panel');
    
    if (tagPanel.classList.contains('active')) {
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Hide Tags';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-tags"></i> Tags';
    }
}

// Load Saved Tags
function loadSavedTags() {
    const tagContainer = document.getElementById('tagContainer');
    if (!tagContainer) return;
    
    tagContainer.innerHTML = '';
    
    if (!savedData.tags || savedData.tags.length === 0) {
        tagContainer.innerHTML = '<div class="empty-state"><i class="fas fa-tags"></i><p>No tags saved yet</p></div>';
        return;
    }
    
    savedData.tags.forEach((tag, index) => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag-item';
        tagElement.innerHTML = `
            <div class="tag-info">
                <span class="tag-text">${tag.text}</span>
                ${tag.category ? `<span class="tag-category">(from: ${tag.category})</span>` : ''}
            </div>
            <div class="tag-actions">
                <button class="tag-use" onclick="useTag('${tag.text.replace(/'/g, "\\'")}', event)">
                    <i class="fas fa-plus-circle"></i> Use
                </button>
                <button class="tag-delete" onclick="deleteTag(${index}, event)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        tagContainer.appendChild(tagElement);
    });
}

// Use a Tag
function useTag(tagText, event) {
    if (event) event.stopPropagation();
    
    const categoryInput = document.getElementById('categoryInput');
    const taskInput = document.getElementById('taskInput');
    
    if (!taskInput) return;
    
    // Find the tag in savedData.tags
    const tag = savedData.tags.find(t => t.text === tagText);
    
    // If tag has a category, set it in the category input
    if (tag && tag.category && categoryInput) {
        categoryInput.value = tag.category;
    }
    
    // Add the tag text to the task input
    taskInput.value += (taskInput.value ? '\n' : '') + tagText;
    taskInput.focus();
}

// Add New Tag
function addNewTag(tagText, categoryTitle) {
    if (!tagText) return;
    
    // Clean the tag text
    tagText = tagText.trim();
    
    // Check if exact same tag already exists
    const exists = savedData.tags.some(tag => 
        tag.text === tagText && tag.category === (categoryTitle || null)
    );
    
    if (!exists) {
        savedData.tags.push({
            text: tagText,
            category: categoryTitle || null
        });
        saveAllData();
        loadSavedTags();
        
        // Clear the input if we're adding from the tag panel
        if (!categoryTitle) {
            document.getElementById('newTagInput').value = '';
        }
    }
}

// Delete a Tag
function deleteTag(index, event) {
    if (event) event.stopPropagation();
    
    if (!savedData.tags || index >= savedData.tags.length) return;
    
    savedData.tags.splice(index, 1);
    saveAllData();
    loadSavedTags();
}

// Generate Category
function generateCategory(parentId = null) {
    const categoryInput = document.getElementById("categoryInput");
    const categoryDate = document.getElementById("categoryDate");
    const taskInput = document.getElementById("taskInput");
    
    if (!categoryInput || !taskInput) return;
    
    let categoryTitle = categoryInput.value.trim();
    let inputText = taskInput.value;
    let tasks = inputText.split('\n').filter(task => task.trim() !== "");

    if (!categoryTitle) return;

    // Create new category
    const newCategory = {
        id: generateId(),
        title: categoryTitle,
        date: categoryDate.value || "No date set",
        parentId: parentId,
        tasks: tasks.map(task => ({
            text: task,
            completed: false,
            priority: "Medium",
            dueDate: ""
        })),
        isOpen: true
    };

    savedData.categories.push(newCategory);
    
    // Add tasks as tags with category reference
    tasks.forEach(task => {
        addNewTag(task, categoryTitle);
    });

    saveAllData();
    loadTasks();
    
    // Clear inputs
    categoryInput.value = "";
    if (categoryDate) categoryDate.value = "";
    taskInput.value = "";
}

// Create Task Element
function createTaskElement(taskText, completed = false, priority = "Medium", dueDate = "") {
    let li = document.createElement("li");

    let taskContainer = document.createElement("div");
    taskContainer.className = "task-container";

    let taskInput = document.createElement("input");
    taskInput.type = "text";
    taskInput.value = taskText;
    taskInput.readOnly = true;
    taskInput.style.border = "none";
    taskInput.style.background = "transparent";
    taskInput.style.flex = "1";

    let prioritySelect = document.createElement("select");
    prioritySelect.className = "priority-select";
    prioritySelect.disabled = true;
    
    ["High", "Medium", "Low"].forEach(p => {
        let option = document.createElement("option");
        option.value = p;
        option.text = p;
        prioritySelect.appendChild(option);
    });
    
    prioritySelect.value = priority;
    li.classList.add(`priority-${priority.toLowerCase()}`);
    
    prioritySelect.onchange = function() {
        li.classList.remove("priority-high", "priority-medium", "priority-low");
        li.classList.add(`priority-${this.value.toLowerCase()}`);
        saveAllData();
    };

    let dueDateInput = document.createElement("input");
    dueDateInput.type = "date";
    dueDateInput.className = "due-date";
    dueDateInput.disabled = true;
    dueDateInput.value = dueDate;
    
    dueDateInput.onchange = function() {
        saveAllData();
        checkDueDate(dueDateInput, li);
    };
    
    checkDueDate(dueDateInput, li);

    // Set initial completed state
    if (completed) {
        li.classList.add('completed');
        taskInput.style.textDecoration = "line-through";
    }

    li.addEventListener('click', function(event) {
        if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
            return;
        }
        toggleTaskCompletion(li, taskInput);
    });

    let buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    let editButton = document.createElement("button");
    editButton.className = "edit-task";
    editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editButton.onclick = function(event) {
        event.stopPropagation();
        document.querySelectorAll('li').forEach(item => {
            item.classList.remove('active-edit');
        });
        
        const isEditing = !taskInput.readOnly;
        
        taskInput.readOnly = isEditing;
        prioritySelect.disabled = isEditing;
        dueDateInput.disabled = isEditing;
        
        if (!isEditing) {
            li.classList.add('active-edit');
            taskInput.style.background = "#fff5cc";
            taskInput.focus();
            editButton.innerHTML = '<i class="fas fa-save"></i> Save';
        } else {
            li.classList.remove('active-edit');
            taskInput.style.background = "transparent";
            editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
            saveAllData();
        }
    };

    let deleteButton = document.createElement("button");
    deleteButton.className = "delete-task";
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteButton.onclick = function(event) {
        event.stopPropagation();
        showConfirmationPopup(`Are you sure you want to delete "${taskInput.value}"?`, li, 'task');
    };

    taskContainer.appendChild(taskInput);
    
    let metadataContainer = document.createElement("div");
    metadataContainer.className = "task-metadata";
    metadataContainer.appendChild(prioritySelect);
    metadataContainer.appendChild(dueDateInput);
    
    li.appendChild(taskContainer);
    li.appendChild(metadataContainer);
    
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);
    li.appendChild(buttonContainer);

    return li;
}

// Check Due Date
function checkDueDate(dueDateInput, li) {
    if (!dueDateInput || !dueDateInput.value) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(dueDateInput.value);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    li.classList.remove("due-today", "overdue", "due-soon");
    
    if (daysDiff === 0) {
        li.classList.add("due-today");
    } else if (daysDiff < 0) {
        li.classList.add("overdue");
    } else if (daysDiff <= 3) {
        li.classList.add("due-soon");
    }
}

// Toggle Task Completion
function toggleTaskCompletion(li, taskInput) {
    li.classList.toggle('completed');
    
    if (li.classList.contains('completed')) {
        taskInput.style.textDecoration = 'line-through';
    } else {
        taskInput.style.textDecoration = 'none';
    }
    
    const categoryElement = li.closest('.category');
    if (!categoryElement) return;
    
    const categoryId = categoryElement.dataset.id;
    const taskText = taskInput.value;
    
    const category = findCategoryById(categoryId);
    if (!category) return;
    
    const task = category.tasks.find(t => t.text === taskText);
    if (!task) return;
    
    task.completed = li.classList.contains('completed');
    saveAllData();
}

// Setup Popup Handlers
function setupPopupHandlers() {
    const confirmButton = document.getElementById('confirmButton');
    const cancelButton = document.getElementById('cancelButton');
    const popup = document.getElementById('confirmationPopup');
    
    if (!confirmButton || !cancelButton || !popup) return;
    
    confirmButton.addEventListener('click', function() {
        if (!elementToDelete) return;
        
        if (deleteType === 'category') {
            const categoryId = elementToDelete.dataset.id;
            
            // First delete all child categories
            const childrenIds = getAllDescendantIds(categoryId);
            savedData.categories = savedData.categories.filter(
                cat => !childrenIds.includes(cat.id) && cat.id !== categoryId
            );
            
            elementToDelete.classList.add('removing');
            setTimeout(() => {
                if (elementToDelete && elementToDelete.parentNode) {
                    elementToDelete.parentNode.removeChild(elementToDelete);
                    saveAllData();
                    loadTasks();
                }
            }, 300);
        } else if (deleteType === 'task') {
            elementToDelete.classList.add('removing');
            setTimeout(() => {
                if (elementToDelete && elementToDelete.parentNode) {
                    // Find and remove the task from its category
                    const categoryElement = elementToDelete.closest('.category');
                    if (categoryElement) {
                        const categoryId = categoryElement.dataset.id;
                        const category = findCategoryById(categoryId);
                        if (category) {
                            const taskText = elementToDelete.querySelector('input[type="text"]').value;
                            category.tasks = category.tasks.filter(t => t.text !== taskText);
                            saveAllData();
                        }
                    }
                    elementToDelete.parentNode.removeChild(elementToDelete);
                }
            }, 300);
        }
        popup.style.display = 'none';
    });

    cancelButton.addEventListener('click', function() {
        popup.style.display = 'none';
    });
}

// Show Confirmation Popup
function showConfirmationPopup(message, element, type) {
    const popupMessage = document.getElementById('popupMessage');
    const popup = document.getElementById('confirmationPopup');
    
    if (!popupMessage || !popup) return;
    
    popupMessage.textContent = message;
    elementToDelete = element;
    deleteType = type;
    popup.style.display = 'flex';
}

// Load Tasks
function loadTasks(parentId = null, indentLevel = 0, parentContainer = null) {
    const taskContainer = parentContainer || document.getElementById("taskContainer");
    if (!taskContainer) return;
    
    // Clear only if we're at the top level
    if (indentLevel === 0 && !parentContainer) {
        taskContainer.innerHTML = '';
    }
    
    const childCategories = getChildCategories(parentId);
    
    if (childCategories.length === 0 && indentLevel === 0 && !parentContainer) {
        taskContainer.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No categories yet</p></div>';
        return;
    }
    
    childCategories.forEach(category => {
        let categoryDiv = document.createElement("div");
        categoryDiv.className = "category";
        categoryDiv.style.marginLeft = `${indentLevel * 20}px`;
        categoryDiv.dataset.id = category.id;

        if (indentLevel > 0) {
            categoryDiv.classList.add('nested');
        }

        let categoryHeader = document.createElement("div");
        categoryHeader.className = "category-header";

        // Add toggle button for nested categories
        let toggleButton = document.createElement("button");
        toggleButton.className = "toggle-category";
        toggleButton.innerHTML = category.isOpen ? '<i class="fas fa-minus"></i>' : '<i class="fas fa-plus"></i>';
        toggleButton.onclick = function() {
            category.isOpen = !category.isOpen;
            saveAllData();
            loadTasks(); // Reload all categories
        };

        let titleInput = document.createElement("input");
        titleInput.className = "category-title";
        titleInput.value = category.title;
        titleInput.readOnly = true;

        let dateDisplay = document.createElement("div");
        dateDisplay.className = "category-date";
        dateDisplay.textContent = formatDate(category.date);

        // Add button to create subcategory
        let addSubcategoryButton = document.createElement("button");
        addSubcategoryButton.className = "add-subcategory";
        addSubcategoryButton.innerHTML = '<i class="fas fa-folder-plus"></i> Add Subcategory';
        addSubcategoryButton.onclick = function() {
            document.getElementById("categoryInput").focus();
            // Update the generate button to create a subcategory
            document.querySelector('.generate-category-btn').onclick = function() {
                generateCategory(category.id);
            };
        };

        let deleteButton = document.createElement("button");
        deleteButton.className = "delete-category";
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = function() {
            showConfirmationPopup(`Are you sure you want to delete "${category.title}" and all its contents?`, categoryDiv, 'category');
        };

        categoryHeader.appendChild(toggleButton);
        categoryHeader.appendChild(titleInput);
        categoryHeader.appendChild(dateDisplay);
        categoryHeader.appendChild(addSubcategoryButton);
        categoryHeader.appendChild(deleteButton);

        let contentContainer = document.createElement("div");
        contentContainer.className = "category-content";
        
        if (category.isOpen) {
            let ul = document.createElement("ul");
            category.tasks.forEach(task => {
                let li = createTaskElement(
                    task.text, 
                    task.completed,
                    task.priority || "Medium",
                    task.dueDate || ""
                );
                ul.appendChild(li);
            });

            contentContainer.appendChild(ul);

            // Load any child categories
            const childContainer = document.createElement("div");
            childContainer.className = "child-categories";
            loadTasks(category.id, indentLevel + 1, childContainer);
            contentContainer.appendChild(childContainer);
        }

        let addTaskButton = document.createElement("button");
        addTaskButton.className = "add-task";
        addTaskButton.innerHTML = '<i class="fas fa-plus"></i> Add Task';
        addTaskButton.onclick = function() {
            let newTaskLi = document.createElement("li");
            newTaskLi.className = "new-task-input";
            
            let newTaskInput = document.createElement("input");
            newTaskInput.type = "text";
            newTaskInput.placeholder = "Enter new task...";
            newTaskInput.style.width = "100%";
            newTaskInput.style.padding = "8px";
            newTaskInput.style.border = "2px solid var(--primary)";
            newTaskInput.style.borderRadius = "5px";
            
            newTaskInput.onkeypress = function(event) {
                if (event.key === "Enter" && newTaskInput.value.trim() !== "") {
                    const ul = newTaskLi.parentNode;
                    let newLi = createTaskElement(newTaskInput.value);
                    ul.appendChild(newLi);
                    
                    // Add to savedData
                    const currentCategory = findCategoryById(category.id);
                    if (currentCategory) {
                        currentCategory.tasks.push({
                            text: newTaskInput.value,
                            completed: false,
                            priority: "Medium",
                            dueDate: ""
                        });
                        addNewTag(newTaskInput.value, category.title);
                        saveAllData();
                    }
                    
                    newTaskLi.remove();
                }
            };
            
            let cancelButton = document.createElement("button");
            cancelButton.textContent = "Cancel";
            cancelButton.className = "cancel-button";
            cancelButton.style.marginTop = "5px";
            cancelButton.onclick = function() {
                newTaskLi.remove();
            };
            
            let saveButton = document.createElement("button");
            saveButton.textContent = "Save";
            saveButton.className = "confirm-button";
            saveButton.style.marginTop = "5px";
            saveButton.style.marginLeft = "5px";
            saveButton.onclick = function() {
                if (newTaskInput.value.trim() !== "") {
                    const ul = newTaskLi.parentNode;
                    let newLi = createTaskElement(newTaskInput.value);
                    ul.appendChild(newLi);
                    
                    // Add to savedData
                    const currentCategory = findCategoryById(category.id);
                    if (currentCategory) {
                        currentCategory.tasks.push({
                            text: newTaskInput.value,
                            completed: false,
                            priority: "Medium",
                            dueDate: ""
                        });
                        addNewTag(newTaskInput.value, category.title);
                        saveAllData();
                    }
                    
                    newTaskLi.remove();
                }
            };
            
            let buttonContainer = document.createElement("div");
            buttonContainer.style.display = "flex";
            buttonContainer.style.justifyContent = "center";
            buttonContainer.style.gap = "10px";
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(saveButton);
            
            newTaskLi.appendChild(newTaskInput);
            newTaskLi.appendChild(buttonContainer);
            
            // Find the UL in this category or create one
            let ul = contentContainer.querySelector('ul');
            if (!ul) {
                ul = document.createElement("ul");
                contentContainer.prepend(ul);
            }
            ul.appendChild(newTaskLi);
            newTaskInput.focus();
        };

        categoryDiv.appendChild(categoryHeader);
        categoryDiv.appendChild(contentContainer);
        categoryDiv.appendChild(addTaskButton);
        taskContainer.appendChild(categoryDiv);
    });
}

// Format Date
function formatDate(dateString) {
    if (!dateString || dateString === "No date set") return "No date set";
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Invalid date";
    }
}