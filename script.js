// ================================
// ELEMENTS
// ================================

const inputBox = document.getElementById("inputBox");
const todoForm = document.getElementById("todoForm");

const addBtn = document.getElementById("addBtn");
const addBtnText = document.getElementById("addBtnText");
const addBtnIcon = document.getElementById("addBtnIcon");

const todoList = document.getElementById("todoList");

const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const completedCount = document.getElementById("completedCount");

const taskCounter = document.getElementById("taskCounter");

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const progressBar = document.getElementById("progressBar");

const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyMessage = document.getElementById("emptyMessage");

const clearCompletedBtn =
    document.getElementById("clearCompletedBtn");

const currentDate = document.getElementById("currentDate");

const toast = document.getElementById("toast");

const filterButtons = document.querySelectorAll(".filter-btn");


// ================================
// APPLICATION STATE
// ================================

const STORAGE_KEY = "todos";

let todos = [];
let currentFilter = "all";
let editingId = null;

let toastTimer;


// ================================
// DATE
// ================================

currentDate.textContent = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
}).format(new Date());


// ================================
// LOCAL STORAGE
// ================================

const saveTodos = () => {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(todos)
        );

        return true;

    } catch (error) {
        showToast("Unable to save tasks in this browser.");
        console.error("Storage error:", error);

        return false;
    }
};


const loadTodos = () => {
    try {
        const savedTodos = localStorage.getItem(STORAGE_KEY);

        if (!savedTodos) {
            todos = [];
            return;
        }

        const parsedTodos = JSON.parse(savedTodos);

        if (!Array.isArray(parsedTodos)) {
            todos = [];
            return;
        }

        // Support the old format: ["Task one", "Task two"]
        // New format: [{ id, text, completed }]

        todos = parsedTodos
            .filter(todo =>
                typeof todo === "string" ||
                (
                    todo &&
                    typeof todo === "object" &&
                    typeof todo.text === "string"
                )
            )
            .map((todo, index) => {
                if (typeof todo === "string") {
                    return {
                        id: `legacy-${index}-${Date.now()}`,
                        text: todo,
                        completed: false
                    };
                }

                return {
                    id: todo.id ?? `task-${index}-${Date.now()}`,
                    text: todo.text,
                    completed: Boolean(todo.completed)
                };
            });

        // Save the migrated format.
        saveTodos();

    } catch (error) {
        console.error("Unable to load tasks:", error);

        todos = [];

        showToast("Could not read saved tasks.");
    }
};


// ================================
// TOAST NOTIFICATIONS
// ================================

const showToast = (message) => {
    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
};


// ================================
// ADD OR EDIT TASK
// ================================

const addTodo = (event) => {
    event.preventDefault();

    const inputText = inputBox.value.trim();

    if (!inputText) {
        showToast("Please enter a task first.");

        inputBox.focus();

        return;
    }

    if (inputText.length > 200) {
        showToast("Tasks must be 200 characters or fewer.");

        return;
    }

    // EDIT EXISTING TASK

    if (editingId !== null) {
        const todo = todos.find(
            item => item.id === editingId
        );

        if (!todo) {
            cancelEdit();
            return;
        }

        if (todo.text === inputText) {
            cancelEdit();

            showToast("No changes were made.");

            return;
        }

        todo.text = inputText;

        saveTodos();

        cancelEdit();

        renderTodos();

        showToast("Task updated successfully! ✨");

        return;
    }

    // ADD NEW TASK

    const newTodo = {
        id: createTaskId(),
        text: inputText,
        completed: false
    };

    todos.unshift(newTodo);

    saveTodos();

    inputBox.value = "";

    renderTodos();

    showToast("Task added successfully! 🎉");

    inputBox.focus();
};


// ================================
// GENERATE TASK ID
// ================================

const createTaskId = () => {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};


// ================================
// EDIT TASK
// ================================

const editTodo = (id) => {
    const todo = todos.find(
        item => item.id === id
    );

    if (!todo) {
        return;
    }

    if (todo.completed) {
        showToast("Completed tasks cannot be edited.");

        return;
    }

    editingId = id;

    inputBox.value = todo.text;

    addBtnText.textContent = "Save Changes";
    addBtnIcon.textContent = "✓";

    inputBox.focus();

    inputBox.setSelectionRange(
        inputBox.value.length,
        inputBox.value.length
    );

    showToast("Edit your task above.");
};


// ================================
// CANCEL EDIT
// ================================

const cancelEdit = () => {
    editingId = null;

    inputBox.value = "";

    addBtnText.textContent = "Add Task";
    addBtnIcon.textContent = "+";
};


// ================================
// TOGGLE TASK COMPLETION
// ================================

const toggleTodo = (id) => {
    const todo = todos.find(
        item => item.id === id
    );

    if (!todo) {
        return;
    }

    todo.completed = !todo.completed;

    // Cancel editing if the edited task becomes completed.
    if (todo.completed && editingId === id) {
        cancelEdit();
    }

    saveTodos();

    renderTodos();

    if (todo.completed) {
        showToast("Great job! Task completed 🎉");
    } else {
        showToast("Task moved back to active.");
    }
};


// ================================
// DELETE TASK
// ================================

const deleteTodo = (id) => {
    const todo = todos.find(
        item => item.id === id
    );

    if (!todo) {
        return;
    }

    todos = todos.filter(
        item => item.id !== id
    );

    if (editingId === id) {
        cancelEdit();
    }

    saveTodos();

    renderTodos();

    showToast("Task removed successfully.");
};


// ================================
// CLEAR COMPLETED TASKS
// ================================

const clearCompletedTodos = () => {
    const completedTodos = todos.filter(
        todo => todo.completed
    );

    if (completedTodos.length === 0) {
        showToast("There are no completed tasks to clear.");

        return;
    }

    const confirmed = window.confirm(
        `Delete all ${completedTodos.length} completed task(s)?`
    );

    if (!confirmed) {
        return;
    }

    todos = todos.filter(
        todo => !todo.completed
    );

    saveTodos();

    renderTodos();

    showToast("Completed tasks cleared.");
};


// ================================
// CREATE TASK ELEMENT
// ================================

const createTodoElement = (todo) => {
    const li = document.createElement("li");

    li.className = "todo-item";

    if (todo.completed) {
        li.classList.add("completed");
    }

    // Checkbox

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";

    checkbox.className = "todo-checkbox";

    checkbox.checked = todo.completed;

    checkbox.setAttribute(
        "aria-label",
        `Mark ${todo.text} as ${todo.completed ? "active" : "completed"}`
    );

    checkbox.addEventListener("change", () => {
        toggleTodo(todo.id);
    });


    // Task text

    const p = document.createElement("p");

    p.className = "todo-text";

    // textContent prevents task text from being interpreted as HTML.
    p.textContent = todo.text;


    // Action buttons

    const actions = document.createElement("div");

    actions.className = "task-actions";


    // Edit button

    const editBtn = document.createElement("button");

    editBtn.type = "button";

    editBtn.className = "action-btn edit-btn";

    editBtn.textContent = "✎";

    editBtn.title = "Edit task";

    editBtn.setAttribute(
        "aria-label",
        `Edit task: ${todo.text}`
    );

    editBtn.disabled = todo.completed;

    editBtn.addEventListener("click", () => {
        editTodo(todo.id);
    });


    // Delete button

    const deleteBtn = document.createElement("button");

    deleteBtn.type = "button";

    deleteBtn.className = "action-btn delete-btn";

    deleteBtn.textContent = "🗑";

    deleteBtn.title = "Delete task";

    deleteBtn.setAttribute(
        "aria-label",
        `Delete task: ${todo.text}`
    );

    deleteBtn.addEventListener("click", () => {
        deleteTodo(todo.id);
    });


    actions.append(editBtn, deleteBtn);

    li.append(checkbox, p, actions);

    return li;
};


// ================================
// FILTER TASKS
// ================================

const getFilteredTodos = () => {
    if (currentFilter === "active") {
        return todos.filter(
            todo => !todo.completed
        );
    }

    if (currentFilter === "completed") {
        return todos.filter(
            todo => todo.completed
        );
    }

    return todos;
};


const setFilter = (filter) => {
    currentFilter = filter;

    filterButtons.forEach(button => {
        const isActive = button.dataset.filter === filter;

        button.classList.toggle("active", isActive);

        button.setAttribute(
            "aria-pressed",
            String(isActive)
        );
    });

    renderTodos();
};


// ================================
// UPDATE STATISTICS
// ================================

const updateStats = () => {
    const total = todos.length;

    const completed = todos.filter(
        todo => todo.completed
    ).length;

    const active = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);


    totalCount.textContent = total;

    activeCount.textContent = active;

    completedCount.textContent = completed;

    taskCounter.textContent =
        `${total} ${total === 1 ? "task" : "tasks"}`;

    progressText.textContent = `${percentage}%`;

    progressFill.style.width = `${percentage}%`;

    progressBar.setAttribute(
        "aria-valuenow",
        String(percentage)
    );

    clearCompletedBtn.disabled = completed === 0;
};


// ================================
// EMPTY STATE
// ================================

const updateEmptyState = (filteredTodos) => {
    const isEmpty = filteredTodos.length === 0;

    emptyState.hidden = !isEmpty;

    todoList.hidden = isEmpty;

    if (!isEmpty) {
        return;
    }

    if (currentFilter === "completed") {
        emptyTitle.textContent = "Nothing completed yet!";

        emptyMessage.textContent =
            "Finish a task and it will appear here.";
    } else if (currentFilter === "active") {
        emptyTitle.textContent = "You're all caught up! ✨";

        emptyMessage.textContent =
            "You have no active tasks. Enjoy the moment!";
    } else if (todos.length === 0) {
        emptyTitle.textContent = "Your list is looking fresh!";

        emptyMessage.textContent =
            "Add your first task above and make today productive.";
    } else {
        emptyTitle.textContent = "All tasks completed! 🎉";

        emptyMessage.textContent =
            "Amazing work. You've finished everything on your list.";
    }
};


// ================================
// RENDER TASKS
// ================================

const renderTodos = () => {
    const filteredTodos = getFilteredTodos();

    const fragment = document.createDocumentFragment();

    filteredTodos.forEach(todo => {
        fragment.appendChild(
            createTodoElement(todo)
        );
    });

    todoList.replaceChildren(fragment);

    updateStats();

    updateEmptyState(filteredTodos);
};


// ================================
// EVENT LISTENERS
// ================================

// Submit form to add or edit a task.

todoForm.addEventListener("submit", addTodo);


// Filter buttons.

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        setFilter(button.dataset.filter);
    });
});


// Clear completed tasks.

clearCompletedBtn.addEventListener(
    "click",
    clearCompletedTodos
);


// Escape cancels edit mode.

inputBox.addEventListener("keydown", event => {
    if (event.key === "Escape" && editingId !== null) {
        cancelEdit();

        showToast("Editing cancelled.");

        inputBox.blur();
    }
});


// ================================
// INITIALIZE APP
// ================================

loadTodos();

setFilter("all");