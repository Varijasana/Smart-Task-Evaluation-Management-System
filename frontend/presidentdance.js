const token = localStorage.getItem("token");
const headName = localStorage.getItem("username");
if (!token) {
  window.location.href = "index.html";
}

document.getElementById("headName").textContent = headName || "Head";

let allTasks = [];
let currentFilter = 'all';

// Fetch members
async function fetchMembers() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/members", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();

    const select = document.getElementById("taskMember");
    select.innerHTML = '<option value="">Select a member...</option>' +
      data.members.map(m => `<option value="${m._id}">${m.name} (${m.rollNumber})</option>`).join('');
  } catch (err) {
    console.error("Failed to fetch members:", err);
  }
}

// Fetch tasks
async function fetchTasks() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/assigned-by-me", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    allTasks = data.tasks;
    displayTasks(allTasks);
  } catch (err) {
    console.error("Failed to fetch tasks:", err);
  }
}

// Fetch pending media
async function fetchPendingMedia() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/pending-media", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    displayPendingMedia(data.media);
  } catch (err) {
    console.error("Failed to fetch pending media:", err);
  }
}

// Display pending media
function displayPendingMedia(mediaList) {
  const mediaSection = document.getElementById("pendingMediaList");

  if (!mediaList || mediaList.length === 0) {
    mediaSection.innerHTML = '<div class="empty-state">No pending media submissions</div>';
    return;
  }

  mediaSection.innerHTML = mediaList.map(media => {
    const isImage = media.fileType === 'image';
    const mediaUrl = `http://localhost:5001/${media.filePath}`;

    return `
      <div class="media-card">
        <div class="media-preview">
          ${isImage
        ? `<img src="${mediaUrl}" alt="${media.fileName}">`
        : `<video src="${mediaUrl}" controls></video>`
      }
        </div>
        <div class="media-info">
          <p><strong>Uploaded by:</strong> ${media.uploadedBy.name} (${media.uploadedBy.rollNumber})</p>
          <p><strong>Task:</strong> ${media.taskId ? media.taskId.title : 'General Upload'}</p>
          <p><strong>Description:</strong> ${media.description || 'No description'}</p>
          <p><strong>Uploaded:</strong> ${new Date(media.createdAt).toLocaleString()}</p>
          <div class="media-actions">
            <button class="btn-approve" onclick="verifyMedia('${media._id}', 'approved')">✓ Approve</button>
            <button class="btn-reject" onclick="verifyMedia('${media._id}', 'rejected')">✗ Reject</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Verify media
async function verifyMedia(mediaId, status) {
  const feedback = status === 'rejected' ? await showPrompt('Please provide feedback for rejection:', 'Reason for rejection', 'Rejection Feedback') : '';
  if (status === 'rejected' && feedback === null) return; // Cancelled

  try {
    const res = await fetch(`http://localhost:5001/api/tasks/media/${mediaId}/verify`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ status, feedback })
    });

    if (res.ok) {
      showToast(`Media ${status} successfully!`, "success");
      fetchPendingMedia();
    } else {
      showToast("Failed to verify media", "error");
    }
  } catch (err) {
    console.error("Failed to verify media:", err);
    showToast("Error verifying media", "error");
  }
}



// Create task
document.getElementById("createTaskForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const taskData = {
    title: document.getElementById("taskTitle").value,
    description: document.getElementById("taskDescription").value,
    assignedTo: document.getElementById("taskMember").value,
    priority: document.getElementById("taskPriority").value,
    deadline: document.getElementById("taskDeadline").value
  };

  try {
    const res = await fetch("http://localhost:5001/api/tasks/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(taskData)
    });

    if (res.ok) {
      showToast("Task created successfully!", "success");
      closeCreateTaskModal();
      fetchTasks();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to create task", "error");
    }
  } catch (err) {
    console.error("Failed to create task:", err);
    showToast("Error creating task", "error");
  }
});

// Delete task
async function deleteTask(taskId) {
  const isConfirmed = await showConfirm("Are you sure you want to delete this task?", "Delete Task", { isDanger: true, confirmText: "Yes, Delete" });
  if (!isConfirmed) return;

  try {
    const res = await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });

    if (res.ok) {
      showToast("Task deleted successfully!", "success");
      fetchTasks();
    } else {
      showToast("Failed to delete task", "error");
    }
  } catch (err) {
    console.error("Failed to delete task:", err);
    showToast("Error deleting task", "error");
  }
}

// Display tasks
function displayTasks(tasks) {
  const tasksList = document.getElementById("tasksList");

  const filteredTasks = currentFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === currentFilter);

  if (filteredTasks.length === 0) {
    tasksList.innerHTML = '<div class="empty-state">No tasks found!</div>';
    return;
  }

  tasksList.innerHTML = filteredTasks.map(task => {
    const deadline = new Date(task.deadline).toLocaleDateString();
    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';

    return `
      <div class="task-card">
        <div class="task-card-header">
          <div class="task-info">
            <div class="task-title">${task.title}</div>
            <div class="task-assigned">Assigned to: <strong>${task.assignedTo.name}</strong> (${task.assignedTo.rollNumber})</div>
          </div>
          <span class="task-status-badge status-${task.status}">${task.status.replace('-', ' ').toUpperCase()}</span>
        </div>
        <p style="color: #636e72; margin-bottom: 10px;">${task.description}</p>
        <div class="task-meta-row">
          <span class="priority-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
          <span>📅 Deadline: <strong style="color: ${isOverdue ? '#d63031' : '#2d3436'}">${deadline}</strong></span>
          <span>📝 Created: ${new Date(task.createdAt).toLocaleDateString()}</span>
        </div>
        <button class="delete-btn" onclick="deleteTask('${task._id}')">🗑️ Delete Task</button>
      </div>
    `;
  }).join('');
}

// Filter tasks
function filterTasks(status) {
  currentFilter = status;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  displayTasks(allTasks);
}

// Open modal
function openCreateTaskModal() {
  document.getElementById("createTaskModal").style.display = "flex";
  document.getElementById("taskDeadline").min = new Date().toISOString().split('T')[0];
}

// Close modal
function closeCreateTaskModal() {
  document.getElementById("createTaskModal").style.display = "none";
  document.getElementById("createTaskForm").reset();
}

// Toggle media section
function toggleMediaSection() {
  const section = document.getElementById("mediaSection");
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
  if (section.style.display === 'block') {
    fetchPendingMedia();
  }
}



// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("createTaskModal");
  if (event.target === modal) {
    closeCreateTaskModal();
  }
}

function formatDateToDMY(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}


// Initialize
fetchMembers();
fetchTasks();
