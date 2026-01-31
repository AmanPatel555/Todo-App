// ================= AUTH =================
const token = localStorage.getItem("token");

// Protect pages
const path = window.location.pathname;
if ((path.includes("todo") || path.includes("profile")) && !token) {
  window.location.href = "/";
}

// ================= STATE =================
let allTodos = [];
let currentFilter = "all";
let searchQuery = "";

// ================= DATE HELPERS =================
// IMPORTANT: timezone-safe date parsing
function toLocalDateOnly(dateStr) {
  const [year, month, day] = dateStr.split("T")[0].split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// ================= AUTH FUNCTIONS =================
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  showToast("Signing up...", "info");

  fetch("http://127.0.0.1:8000/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      showToast("Signup successful", "success");
    });
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  showToast("Logging in...", "info");

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
        showToast("Invalid credentials", "error");
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
    showToast("Name cannot be empty", "error");
    return;
  }

  fetch("http://127.0.0.1:8000/me", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  }).then(() => {
    showToast("Profile updated", "success");
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
      title,
      due_date: dueDate || null
    })
  }).then(() => {
    showToast("Todo added", "success");
    document.getElementById("todoInput").value = "";
    document.getElementById("dueDateInput").value = "";
    updateAddButtonState();
    loadTodos();
  });
}

function updateAddButtonState() {
  const input = document.getElementById("todoInput");
  const btn = document.getElementById("addTodoBtn");
  if (!input || !btn) return;
  btn.disabled = input.value.trim() === "";
}

function toggleTodo(id) {
  fetch(`http://127.0.0.1:8000/todos/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  }).then(loadTodos);
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
  }).then(() => {
    showToast("Todo updated", "success");
    loadTodos();
  });
}

function deleteTodo(id) {
  if (!confirm("Are you sure you want to delete this todo?")) return;

  fetch(`http://127.0.0.1:8000/todos/${id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${token}` }
}).then(() => {
  showToast("Todo deleted", "info");
  loadTodos();
});

}

function handleSearch(value) {
  searchQuery = value.toLowerCase();
  applyFilters();
}

function applyFilters() {
  let filtered = [...allTodos];

  // Filter by status
  if (currentFilter === "completed") {
    filtered = filtered.filter(t => t.completed);
  } else if (currentFilter === "pending") {
    filtered = filtered.filter(t => !t.completed);
  }

  // Filter by search
  if (searchQuery) {
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(searchQuery)
    );
  }

  renderTodos(filtered);
}

// ================= LOAD & RENDER =================
function loadTodos() {
  fetch("http://127.0.0.1:8000/todos", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (res.status === 401) {
        showToast("Session expired. Please login again.", "error");
        logout();
        throw new Error("Unauthorized");
      }
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data)) return;
      allTodos = data;

      if (currentFilter === "completed") {
        applyFilters();
      } else if (currentFilter === "pending") {
        applyFilters();
      } else {
        applyFilters();
      }
    })
    .catch(err => console.error(err));
}

function saveDueDate(todoId, newDate) {
  if (!newDate) return;

  fetch(`http://127.0.0.1:8000/todos/${todoId}/edit`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ due_date: newDate })
  }).then(() => {
    showToast("Due date updated", "success");
    loadTodos();
  });
}


function renderTodos(todos) {
  const list = document.getElementById("todoList");
  list.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");

    const dueText = todo.due_date
      ? toLocalDateOnly(todo.due_date).toLocaleDateString()
      : "No due date";

    let badgeHTML = "";

    if (todo.due_date && !todo.completed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const due = toLocalDateOnly(todo.due_date);
      const diffDays = Math.floor(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) {
        badgeHTML = `<span class="badge overdue-badge">OVERDUE</span>`;
        li.classList.add("overdue");
      } else if (diffDays === 0) {
        badgeHTML = `<span class="badge today-badge">DUE TODAY</span>`;
      } else if (diffDays <= 2) {
        badgeHTML = `<span class="badge soon-badge">DUE SOON</span>`;
      } else {
        badgeHTML = `<span class="badge upcoming-badge">UPCOMING</span>`;
      }
    }

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

          ${
            todo.completed
              ? ""
              : `
            <input
              type="date"
              class="inline-date"
              value="${todo.due_date ? todo.due_date.split("T")[0] : ""}"
              onchange="saveDueDate(${todo.id}, this.value)"
            />
          `
          }

          ${badgeHTML}
        </div>
      </div>

      <div class="todo-actions">
        <button class="edit-btn" onclick="editTodo(${todo.id}, '${todo.title}')">✏️</button>
        <button class="delete-btn" onclick="deleteTodo(${todo.id})">🗑️</button>
      </div>
`;


    list.appendChild(li);
  });
}


// ================= FILTERS =================
function showAll() {
  currentFilter = "all";
  setActiveFilter("all");
  applyFilters();
}

function showCompleted() {
  currentFilter = "completed";
  setActiveFilter("completed");
  applyFilters();
}

function showPending() {
  currentFilter = "pending";
  setActiveFilter("pending");
  applyFilters();
}

function setActiveFilter(filter) {
  document
    .querySelectorAll(".filters button")
    .forEach(btn => btn.classList.remove("active"));

  const btn = document.getElementById(`filter-${filter}`);
  if (btn) btn.classList.add("active");
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  if (document.title === "My Todos") {
    setActiveFilter("all");
    loadTodos();
    updateAddButtonState();

    // Add Todo input (existing)
    const input = document.getElementById("todoInput");
    if (input) {
      input.addEventListener("input", updateAddButtonState);
    }

    // 🔍 Search input (ADD THIS)
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", e =>
        handleSearch(e.target.value)
      );
    }
  }

  if (document.title === "Profile") {
    loadProfile();
  }

  if (localStorage.getItem("darkMode") === "on") {
    document.body.classList.add("dark");
  }
});

// ================= DARK MODE =================
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark") ? "on" : "off"
  );
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
