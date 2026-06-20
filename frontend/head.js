const token = localStorage.getItem("token");
const headName = localStorage.getItem("username");
if (!token) {
  window.location.href = "index.html";
}

document.getElementById("headName").textContent = headName || "Head";

let allTasks = [];
let currentFilter = 'all';
let performanceChart = null;

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

// Fetch tasks assigned BY me
async function fetchTasks() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/assigned-by-me", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    // Filter out approved tasks - they should disappear after approval
    allTasks = data.tasks;
    // Filter out approved tasks for display only
    displayTasks(allTasks.filter(t => !t.isApproved));
    updateGraph(); // Use allTasks for stats (includes approved)
  } catch (err) {
    console.error("Failed to fetch tasks:", err);
  }
}

// Fetch tasks assigned TO me (by President)
async function fetchMyTasks() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/my-tasks", {
      headers: { "Authorization": "Bearer " + token }
    });
    const tasks = await res.json();
    // Filter out approved tasks
    const activeTasks = tasks.filter(t => !t.isApproved);
    displayMyTasks(activeTasks);
  } catch (err) {
    console.error("Failed to fetch my tasks:", err);
  }
}

function displayMyTasks(tasks) {
  const list = document.getElementById("assignedToMeList");
  if (!tasks || tasks.length === 0) {
    list.innerHTML = '<div class="empty-state">No tasks assigned to you.</div>';
    return;
  }

  list.innerHTML = tasks.map(task => {
    // Determine action area based on status
    let actionArea;
    if (task.isApproved) {
      actionArea = '<p style="color: #00b894; font-weight: bold; margin-top: 10px;">✓ Verified & Approved</p>';
    } else if (task.status === 'completed') {
      actionArea = '<p style="color: #f39c12; font-weight: bold; margin-top: 10px;">⏳ Awaiting Review</p>';
    } else if (task.hasRejectedSubmission) {
      // Show rejected status with feedback and resubmit button
      actionArea = `
        <div style="margin-top: 10px;">
          <div style="background: #fee; padding: 8px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid #e74c3c;">
            <span style="color: #e74c3c; font-weight: bold; font-size: 0.85em;">❌ REJECTED</span>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #c0392b;"><strong>Reason:</strong> ${task.rejectionFeedback || 'No feedback provided'}</p>
            <p style="margin: 5px 0 0 0; font-size: 0.75em; color: #7f8c8d;"><em>Deadline extended by 3 days. Please resubmit.</em></p>
          </div>
          <button class="btn-primary" onclick="openUploadModal('${task._id}')">Resubmit Work</button>
        </div>
      `;
    } else {
      actionArea = `<button class="btn-primary" onclick="openUploadModal('${task._id}')" style="margin-top: 10px;">Submit Work</button>`;
    }

    return `
        <div class="task-card" style="border-left: 5px solid ${task.hasRejectedSubmission ? '#e74c3c' : '#0984e3'};">
            <div class="task-card-header">
                <div>
                  <div class="task-title">${task.title}</div>
                  <div class="task-assigned">From: ${task.assignedBy?.name || 'President'}</div>
                </div>
                <span class="task-status-badge status-${task.status}">${task.status}</span>
            </div>
            <p>${task.description}</p>
            <div class="task-meta-row">
                <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                <span>Deadline: ${new Date(task.deadline).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            ${actionArea}
        </div>
    `;
  }).join('');
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
        : (media.fileType === 'video'
          ? `<video src="${mediaUrl}" controls></video>`
          : `<a href="${mediaUrl}" target="_blank" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:200px; text-decoration:none; color:#2d3436; background:#f1f2f6; border-radius:8px;">
                 <span style="font-size:32px;">📄</span>
                 <span style="font-size:14px; margin-top:5px;">Open Document</span>
               </a>`
        )
      }
        </div>
        <div class="media-info">
          <p><strong>Uploaded by:</strong> ${media.uploadedBy.name} (${media.uploadedBy.rollNumber})</p>
          <p><strong>Task:</strong> ${media.taskId ? media.taskId.title : 'General Upload'}</p>
          <p><strong>Description:</strong> ${media.description || 'No description'}</p>
          <p><strong>Uploaded:</strong> ${new Date(media.createdAt).toLocaleDateString('en-GB')}</p>
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
  let feedback = '';
  if (status === 'rejected') {
    feedback = await showPrompt('Please provide feedback for rejection:', 'Reason for rejection', 'Rejection Feedback');
    if (feedback === null) return; // Cancelled
    if (!feedback.trim()) {
      showToast("Feedback is required for rejection.", "warning");
      return;
    }
  }

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
      fetchTasks(); // Refresh tasks as status might update
      updateGraph(); // Refresh graph
    } else {
      const data = await res.json();
      showToast(`Error: ${data.error || 'Failed to verify'}`, "error");
    }
  } catch (err) {
    console.error("Failed to verify media:", err);
    showToast("Network error. Please try again.", "error");
  }
}

// ... (skipping unchanged code)

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

// Delete media (Head's own submissions)
async function deleteMediaSub(mediaId) {
  const isConfirmed = await showConfirm("Are you sure you want to delete this submission? This cannot be undone.", "Delete Submission", { isDanger: true, confirmText: "Delete" });
  if (!isConfirmed) return;

  try {
    const res = await fetch(`http://localhost:5001/api/tasks/media/${mediaId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });

    if (res.ok) {
      showToast("Submission deleted successfully!", "success");
      fetchMyMedia();
      fetchMyTasks();
      // updatePerformanceGraph(); // This function name seems inconsistent in original file (updateGraph vs updatePerformanceGraph usage), assume updateGraph exists or this was typo in original?
      // Checking original file: Lines 40 and 263 define updateGraph(). Line 193 calls updatePerformanceGraph(). 
      // Line 524 calls updatePerformanceGraph().
      // It seems updatePerformanceGraph is NOT defined in head.js provided? 
      // Wait, let's checking the view_file for head.js again.
      // There is `function updateGraph()`.
      // Usage at 193: updatePerformanceGraph();
      // Usage at 524: updatePerformanceGraph();
      // If updatePerformanceGraph is not defined, these lines would crash. 
      // I will safe guard it.
      if (typeof updatePerformanceGraph === 'function') updatePerformanceGraph();
      else if (typeof updateGraph === 'function') updateGraph();

    } else {
      const data = await res.json();
      showToast(data.error || "Failed to delete", "error");
    }
  } catch (err) {
    console.error("Delete error:", err);
    showToast("Server error", "error");
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
    const borderColor = task.wasRejected && task.status === 'pending' ? '#e74c3c' : '#dfe6e9';

    return `
      <div class="task-card" style="border-left: 4px solid ${borderColor};">
        <div class="task-card-header">
          <div class="task-info">
            <div class="task-title">${task.title}</div>
            <div class="task-assigned">Assigned to: <strong>${task.assignedTo?.name}</strong> (${task.assignedTo?.rollNumber})</div>
          </div>
          <span class="task-status-badge status-${task.status}">${task.status.replace('-', ' ').toUpperCase()}</span>
        </div>
        <p style="color: #636e72; margin-bottom: 10px;">${task.description}</p>
        ${task.wasRejected && task.status === 'pending' ? `
          <div style="background: #fee; padding: 8px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid #e74c3c;">
            <span style="color: #e74c3c; font-weight: bold; font-size: 0.85em;">⚠️ Previously Rejected</span>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #c0392b;">Waiting for resubmission from assignee. Deadline extended by 3 days.</p>
            ${task.lastRejectionReason ? `<p style="margin: 3px 0 0 0; font-size: 0.75em; color: #7f8c8d;"><em>Last rejection: ${task.lastRejectionReason}</em></p>` : ''}
          </div>
        ` : ''}
        <div class="task-meta-row">
          <span class="priority-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
             <span>📅 Deadline: <strong style="color: ${isOverdue ? '#d63031' : '#2d3436'}">${new Date(task.deadline).toLocaleDateString('en-GB')}</strong></span>
            <span>📝 Created: ${new Date(task.createdAt).toLocaleDateString('en-GB')}</span>
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

// Graph Logic
function updateGraph() {
  const ctx = document.getElementById('performanceChart').getContext('2d');

  const completedTasks = allTasks.filter(t => t.status === 'completed');
  const pendingTasks = allTasks.filter(t => t.status === 'pending');

  const completed = completedTasks.length;
  const pending = pendingTasks.length;

  if (performanceChart) performanceChart.destroy();

  performanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [completed, pending],
        backgroundColor: ['#00b894', '#0984e3']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // Detailed Stats Logic
  const detailedDiv = document.getElementById('detailedStats');
  if (detailedDiv) {
    // Helper to get unique names
    const getNames = (tasks) => {
      const names = tasks.map(t => t.assignedTo ? t.assignedTo.name : 'Unknown');
      return [...new Set(names)]; // Unique names
    };

    const completedNames = getNames(completedTasks);
    const pendingNames = getNames(pendingTasks);

    detailedDiv.innerHTML = `
      <div style="border-left: 4px solid #00b894; padding-left: 10px;">
        <h4 style="margin: 0; color: #2d3436;">Completed (${completed})</h4>
        <div class="status-list">
          ${completedNames.length > 0 ? completedNames.join(', ') : 'None'}
        </div>
      </div>
      <div style="border-left: 4px solid #0984e3; padding-left: 10px;">
        <h4 style="margin: 0; color: #2d3436;">Pending (${pending})</h4>
        <div class="status-list">
          ${pendingNames.length > 0 ? pendingNames.join(', ') : 'None'}
        </div>
      </div>
    `;
  }
}

// --- Upload Modal Logic ---
function openUploadModal(taskId) {
  document.getElementById('uploadTaskId').value = taskId;
  document.getElementById('uploadModal').style.display = 'flex';
}

function closeUploadModal() {
  document.getElementById('uploadModal').style.display = 'none';
  document.getElementById('uploadForm').reset();
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const taskId = document.getElementById('uploadTaskId').value;
  const description = document.getElementById('uploadDescription').value;
  const file = document.getElementById('uploadFile').files[0];

  const formData = new FormData();
  formData.append('file', file);
  formData.append('taskId', taskId);
  formData.append('description', description);

  try {
    const res = await fetch("http://localhost:5001/api/tasks/upload-media-extended", {
      method: 'POST',
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });

    if (res.ok) {
      showToast("Work Submitted Successfully!", "success");
      closeUploadModal();
      fetchMyTasks(); // Refresh list to show submitted status
    } else {
      showToast("Upload failed", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Server error during upload", "error");
  }
});

// --- My Media (Head's Submissions to President) ---
async function fetchMyMedia() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/my-media", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    displayMyMedia(data.media);
  } catch (err) {
    console.error("Failed to fetch my media:", err);
  }
}

function displayMyMedia(mediaList) {
  const list = document.getElementById("myMediaList");
  if (!list) return; // if element doesn't exist

  if (!mediaList || mediaList.length === 0) {
    list.innerHTML = '<div class="empty-state">No media uploaded yet</div>';
    return;
  }

  list.innerHTML = mediaList.map(media => {
    const isImage = media.fileType === 'image';
    const mediaUrl = `http://localhost:5001/${media.filePath}`;
    let statusColor = '#ffeaa7';
    let statusLabel = 'PENDING';
    if (media.status === 'approved') { statusColor = '#6ab9a2ff'; statusLabel = 'APPROVED'; }
    if (media.status === 'rejected') { statusColor = '#b85454ff'; statusLabel = 'REJECTED'; }

    return `
      <div class="media-card" style="padding: 10px; border-left: 4px solid ${statusColor};">
        <div class="media-preview" style="flex: 0 0 100px;">
           ${isImage
        ? `<img src="${mediaUrl}" alt="${media.fileName}" style="height:80px; width:100px; object-fit:cover;">`
        : (media.fileType === 'video'
          ? `<video src="${mediaUrl}" controls style="height:80px; width:100px;"></video>`
          : `<a href="${mediaUrl}" target="_blank" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80px; background:#f1f2f6; border-radius:4px; text-decoration:none; color:#333;">
                         <span style="font-size:20px;">📄</span><span style="font-size:10px;">View</span>
                       </a>`
        )
      }
        </div>
        <div class="media-info" style="margin-left: 15px;">
           <div style="font-weight:bold; font-size:14px;">${media.taskId ? media.taskId.title : 'General'}</div>
           <div style="font-size:12px; color:#666;">${media.description || '-'}</div>
           <div style="margin-top:5px;">
             <span style="background:${statusColor}; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold;">${statusLabel}</span>
             <span style="font-size:10px; color:#999; margin-left:10px;">${new Date(media.createdAt).toLocaleDateString('en-GB')}</span>
           </div>
           ${media.feedback ? `<div style="font-size:11px; color:#d63031; margin-top:3px;">Reason: ${media.feedback}</div>` : ''}
           ${media.status === 'pending' ? `
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button onclick="deleteMediaSub('${media._id}')" style="padding: 4px 8px; background: #d63031; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.7em;">🗑️ Delete</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}
// --------------------------

// Open modal
function openCreateTaskModal() {
  document.getElementById("createTaskModal").style.display = "flex";
  // Fix for datetime-local min attribute
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById("taskDeadline").min = now.toISOString().slice(0, 16);
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

// Create task
document.getElementById("createTaskForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const taskData = {
    title: document.getElementById("taskTitle").value,
    description: document.getElementById("taskDescription").value,
    assignedTo: document.getElementById("taskMember").value,
    priority: document.getElementById("taskPriority").value,
    deadline: document.getElementById("taskDeadline").value,
    type: document.getElementById("taskType").value
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



// Logout
document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await fetch("http://localhost:5001/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
    });
  } catch (err) {
    console.error("Logout failed:", err);
  }
  localStorage.clear();
  window.location.href = "index.html";
});

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("createTaskModal");
  if (event.target === modal) {
    closeCreateTaskModal();
  }
  if (event.target === document.getElementById("uploadModal")) {
    closeUploadModal();
  }
}


// Initialize
fetchMembers();
fetchTasks();
fetchMyTasks();
fetchMyMedia();
fetchPendingMedia();
