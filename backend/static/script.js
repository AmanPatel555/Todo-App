// ================= AUTH =================
const token = localStorage.getItem("token");

// Protect pages
const path = window.location.pathname;

if ((path.includes("todo") || path.includes("profile")) && !token) {
  window.location.href = "/";
}

// ================= STATE =================
let allTodos = [];
let currentFilter = "all"; // all | completed | pending

// ================= AUTH FUNCTIONS =================
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");

  msg.innerText = "Signing up...";

  fetch("http://127.0.0.1:8000/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      msg.innerText = data.message;
      msg.className = "success";
    });
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");

  msg.innerText = "Logging in...";

  fetch("http://127.0.0.1:8000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        window.location.href = "todo.html";
      } else {
        msg.innerText = "Invalid credentials";
        msg.className = "error";
      }
    });
}

// ================= PROFILE =================
function loadProfile() {
  fetch("http://127.0.0.1:8000/me", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("email").innerText = data.email;

      if (data.name) {
        document.getElementById("nameInput").value = data.name;
        document.getElementById("avatar").innerText =
          data.name.charAt(0).toUpperCase();
      }
    });
}

function saveProfile() {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) {
    alert("Name cannot be empty");
    return;
  }

  fetch("http://127.0.0.1:8000/me", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  })
    .then(res => {
      if (!res.ok) {
        alert("Save failed");
        return;
      }
      alert("Profile updated");
      loadProfile();
    });
}

function goToTodos() {
  window.location.href = "todo.html";
}

// ================= TODO CRUD =================
function addTodo() {
  const title = document.getElementById("todoInput").value.trim();
  const dueDate = document.getElementById("dueDateInput").value;

  if (!title) return;

  fetch("http://127.0.0.1:8000/todos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: title,
      due_date: dueDate ? dueDate : null
    })
  }).then(() => {
    document.getElementById("todoInput").value = "";
    document.getElementById("dueDateInput").value = "";
    loadTodos();
  });
}

function toggleTodo(id) {
  fetch(`http://127.0.0.1:8000/todos/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  }).then(() => loadTodos());
}

function editTodo(id, oldTitle) {
  const newTitle = prompt("Edit todo:", oldTitle);
  if (!newTitle) return;

  fetch(`http://127.0.0.1:8000/todos/${id}/edit`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: newTitle })
  }).then(() => loadTodos());
}

function deleteTodo(id) {
  fetch(`http://127.0.0.1:8000/todos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  }).then(() => loadTodos());
}

// ================= LOAD & RENDER =================
function loadTodos() {
  fetch("http://127.0.0.1:8000/todos", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(todos => {
      allTodos = todos;

      if (currentFilter === "completed") {
        renderTodos(allTodos.filter(t => t.completed));
      } else if (currentFilter === "pending") {
        renderTodos(allTodos.filter(t => !t.completed));
      } else {
        renderTodos(allTodos);
      }
    });
}

function renderTodos(todos) {
  const list = document.getElementById("todoList");
  list.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");
    
    const dueText = todo.due_date
      ? new Date(todo.due_date).toLocaleDateString()
      : "No due date";
      
    li.innerHTML = `
  <div class="todo-left">
    <input type="checkbox"
      ${todo.completed ? "checked" : ""}
      onchange="toggleTodo(${todo.id})">

    <div class="todo-text">
      <span class="${todo.completed ? "done" : ""}">
        ${todo.title}
      </span>
      <small class="due-date">📅 ${dueText}</small>
    </div>
  </div>

  <div class="todo-actions">
    <button class="edit-btn" onclick="editTodo(${todo.id}, '${todo.title}')">✏️</button>
    <button class="delete-btn" onclick="deleteTodo(${todo.id})">🗑</button>
  </div>
`;

    if (todo.due_date && !todo.completed) {
      const now = new Date();
      const due = new Date(todo.due_date);

    if (due < now) {
      li.classList.add("overdue");
    }
}

    list.appendChild(li);
  });
}

// ================= FILTERS =================
function showAll() {
  currentFilter = "all";
  renderTodos(allTodos);
}

function showCompleted() {
  currentFilter = "completed";
  renderTodos(allTodos.filter(t => t.completed));
}

function showPending() {
  currentFilter = "pending";
  renderTodos(allTodos.filter(t => !t.completed));
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

// ================= INIT =================
if (document.title === "My Todos") {
  loadTodos();
}

if (document.title === "Profile") {
  loadProfile();
}

// ================= DARK MODE =================
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark") ? "on" : "off"
  );
}

if (localStorage.getItem("darkMode") === "on") {
  document.body.classList.add("dark");
}

