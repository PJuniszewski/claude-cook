// Sample Todo App - for testing /cook workflows
// See CLAUDE.md for project rules

const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const taskCount = document.getElementById('task-count');
const completedCount = document.getElementById('completed-count');
const clearCompletedBtn = document.getElementById('clear-completed');

let tasks = [];

// Sanitize user input to prevent XSS
const sanitize = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

// Generate unique ID
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Add a new task
const addTask = () => {
    const text = taskInput.value.trim();

    // BUG: No validation - empty tasks can be added
    // This is intentional for /cook --microwave practice

    const task = {
        id: generateId(),
        text: sanitize(text),
        completed: false,
        createdAt: new Date()
    };

    tasks.push(task);
    render();

    // BUG: Input doesn't clear after adding
    // This is intentional for /cook --microwave practice
};

// Toggle task completion
const toggleTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        render();
    }
};

// Delete a task
const deleteTask = (id) => {
    // BUG: No confirmation before delete
    // This is intentional for /cook --microwave practice
    tasks = tasks.filter(t => t.id !== id);
    render();
};

// Clear all completed tasks
const clearCompleted = () => {
    tasks = tasks.filter(t => !t.completed);
    render();
};

// Render the task list
const render = () => {
    // Render tasks
    taskList.innerHTML = tasks.map(task => `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <input
                type="checkbox"
                class="task-checkbox"
                ${task.completed ? 'checked' : ''}
                onchange="toggleTask('${task.id}')"
            >
            <span class="task-text">${task.text}</span>
            <button class="btn-delete" onclick="deleteTask('${task.id}')">Delete</button>
        </li>
    `).join('');

    // Update stats
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    taskCount.textContent = `${total} task${total !== 1 ? 's' : ''}`;
    completedCount.textContent = `${completed} completed`;
};

// Event listeners
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});
clearCompletedBtn.addEventListener('click', clearCompleted);

// Initial render
render();
