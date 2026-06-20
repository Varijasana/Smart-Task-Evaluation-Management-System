const token = localStorage.getItem("token");
const memberName = localStorage.getItem("username");
if (!token) {
  window.location.href = "index.html";
}

document.getElementById("memberName").textContent = memberName || "Member";

let completionChart = null;
let myTasks = [];

// --- TOAST NOTIFICATIONS ---
// Using global showToast from utils.js

// Fetch statistics
async function fetchStats() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/stats", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    const stats = data.stats;

    document.getElementById("totalTasks").textContent = stats.total;
    document.getElementById("completedTasks").textContent = stats.completed;

    document.getElementById("pendingTasks").textContent = stats.pending;

    const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    document.getElementById("progressFill").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent;

    updateChart(stats);
  } catch (err) {
    console.error("Failed to fetch stats:", err);
  }
}

// Update chart (Doughnut)
function updateChart(stats) {
  const ctx = document.getElementById('completionChart').getContext('2d');
  if (completionChart) completionChart.destroy();

  completionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed/Approved', 'Pending'],
      datasets: [{
        data: [stats.completed, stats.pending],
        backgroundColor: ['#00b894', '#bdc3c7'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' }
      }
    }
  });
}

// Fetch tasks
async function fetchTasks() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/my-tasks", {
      headers: { "Authorization": "Bearer " + token }
    });
    myTasks = await res.json();
    // Filter out approved tasks - they should disappear from the list
    const activeTasks = myTasks.filter(t => !t.isApproved);
    displayTasks(activeTasks);
  } catch (err) {
    console.error("Failed to fetch tasks:", err);
  }
}

function formatDeadline(dateStr) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Display tasks
function displayTasks(tasks) {
  const tasksList = document.getElementById("tasksList");
  if (!tasks || tasks.length === 0) {
    tasksList.innerHTML = '<div class="empty-state">No tasks available!</div>';
    return;
  }

  tasksList.innerHTML = tasks.map(task => {
    const deadline = formatDeadline(task.deadline);
    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed' && !task.isApproved;
    const cardStyle = isOverdue ? 'border-left: 5px solid #d63031;' :
      task.hasRejectedSubmission ? 'border-left: 5px solid #e74c3c;' : '';
    const taskStatus = task.status.toUpperCase();

    // Show different states based on submission status
    let actionArea;
    if (task.isApproved) {
      actionArea = '<span style="color: #00b894; font-weight: bold; font-size: 0.9em;">✓ Verified & Approved</span>';
    } else if (task.status === 'completed') {
      actionArea = '<span style="color: #f39c12; font-weight: bold; font-size: 0.9em;">⏳ Awaiting Review</span>';
    } else if (task.hasRejectedSubmission) {
      // Show rejected status with feedback and resubmit button
      actionArea = `
        <div style="width: 100%;">
          <div style="background: #fee; padding: 8px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid #e74c3c;">
            <span style="color: #e74c3c; font-weight: bold; font-size: 0.85em;">❌ REJECTED</span>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #c0392b;"><strong>Reason:</strong> ${task.rejectionFeedback || 'No feedback provided'}</p>
            <p style="margin: 5px 0 0 0; font-size: 0.75em; color: #7f8c8d;"><em>Deadline extended by 3 days. Please resubmit.</em></p>
          </div>
          <button class="btn-primary" onclick="openUploadModal('${task._id}')" style="font-size: 0.8em; padding: 6px 12px;">Resubmit Work</button>
        </div>
      `;
    } else {
      actionArea = `<button class="btn-primary" onclick="openUploadModal('${task._id}')" style="font-size: 0.8em; padding: 6px 12px;">Submit Work</button>`;
    }

    return `
      <div class="task-item" style="${cardStyle}">
        <div class="task-header">
          <div class="task-title">${task.title}</div>
          <span class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
        </div>
        <p style="color: #636e72; margin-bottom: 15px; font-size: 0.95em;">${task.description}</p>
        <div class="task-meta">
          <span>Deadline: <strong style="color: ${isOverdue ? '#d63031' : '#2d3436'}">${deadline}</strong></span>
          <span>From: <strong>${task.assignedBy ? task.assignedBy.name : 'Unknown'}</strong></span>
        </div>
        <div class="task-actions" style="margin-top: 15px;">
          <span class="task-status status-${task.status}">${taskStatus}</span>
          <div style="margin-top: 10px;">${actionArea}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Open upload modal
function openUploadModal(taskId = null) {
  const modal = document.getElementById("uploadModal");
  modal.style.display = "flex";
  const select = document.getElementById("uploadTaskSelect");
  const validTasks = myTasks.filter(t => t.status !== 'completed' && t.status !== 'approved');
  select.innerHTML = '<option value="">-- General Upload (No Task) --</option>' +
    validTasks.map(t => `<option value="${t._id}" ${t._id === taskId ? 'selected' : ''}>${t.title}</option>`).join('');
}

function closeUploadModal() {
  document.getElementById("uploadModal").style.display = "none";
  document.getElementById("uploadForm").reset();
  document.getElementById("filePreview").innerHTML = '';
}

function previewFile() {
  const file = document.getElementById("mediaFile").files[0];
  const preview = document.getElementById("filePreview");
  if (!file) {
    preview.innerHTML = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    if (file.type.startsWith('image/')) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
    } else if (file.type.startsWith('video/')) {
      preview.innerHTML = `<video src="${e.target.result}" controls style="max-width: 100%; max-height: 200px; border-radius: 8px;"></video>`;
    } else {
      preview.innerHTML = `<div style="padding: 20px; background: #f1f2f6; border-radius: 8px; text-align: center;">
          <span style="font-size: 24px;">📄</span><br>
          <span style="font-weight: bold; color: #2d3436;">${file.name}</span>
      </div>`;
    }
  };
  reader.readAsDataURL(file);
}

// Upload media
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('file', document.getElementById("mediaFile").files[0]);
  formData.append('description', document.getElementById("mediaDescription").value);
  const taskId = document.getElementById("uploadTaskSelect").value;
  if (taskId) formData.append('taskId', taskId);

  try {
    const res = await fetch("http://localhost:5001/api/tasks/upload-media-extended", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });

    if (res.ok) {
      showToast("Work submitted successfully!", "success");
      closeUploadModal();
      fetchTasks();
      fetchStats();
      fetchMyMedia();
      if (window.refreshCalendar) window.refreshCalendar(); // Refresh calendar
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to upload", "error");
    }
  } catch (err) {
    console.error("Upload error:", err);
    showToast("Server error during upload", "error");
  }
});

// Fetch my media
async function fetchMyMedia() {
  try {
    const res = await fetch("http://localhost:5001/api/tasks/my-media", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    displayMyMedia(data.media);
  } catch (err) {
    console.error("Failed to fetch media:", err);
  }
}

function displayMyMedia(mediaList) {
  const myMediaList = document.getElementById("myMediaList");
  if (!mediaList || mediaList.length === 0) {
    myMediaList.innerHTML = '<div class="empty-state">No media uploaded yet</div>';
    return;
  }

  myMediaList.innerHTML = mediaList.map(media => {
    const isImage = media.fileType === 'image';
    const mediaUrl = `http://localhost:5001/${media.filePath}`;
    let statusColor = '#ffeaa7', statusLabel = 'PENDING';
    if (media.status === 'approved') { statusColor = '#55efc4'; statusLabel = 'APPROVED'; }
    if (media.status === 'rejected') { statusColor = '#ff7675'; statusLabel = 'REJECTED'; }

    return `
      <div class="media-card-small">
        <div class="media-preview-small">
          ${isImage ? `<img src="${mediaUrl}" alt="${media.fileName}">` :
        (media.fileType === 'video' ? `<video src="${mediaUrl}" controls></video>` :
          `<a href="${mediaUrl}" target="_blank" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-decoration:none; color:#2d3436; background:#f1f2f6; border-radius:8px;">
                 <span style="font-size:24px;">📄</span>
                 <span style="font-size:12px; margin-top:5px;">View/Download</span>
               </a>`)}
        </div>
        <div class="media-info-small">
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
             <span style="font-size: 0.8em; font-weight:bold; color:#636e72;">${new Date(media.createdAt).toLocaleDateString('en-GB')}</span>
             <span style="background: ${statusColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; font-weight:bold;">${statusLabel}</span>
          </div>
          <p style="font-size: 0.9em; margin-bottom: 5px;"><strong>Task:</strong> ${media.taskId ? media.taskId.title : 'General'}</p>
          <p style="font-size: 0.9em; color: #2d3436;">${media.description || '-'}</p>
          ${media.feedback ? `<p style="margin-top:5px; color:#d63031; font-size:0.85em;"><strong>Feedback:</strong> ${media.feedback}</p>` : ''}
          ${media.status === 'pending' ? `
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button onclick="deleteMedia('${media._id}')" style="padding: 5px 10px; background: #d63031; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em;">🗑️ Delete</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Delete media
async function deleteMedia(mediaId) {
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
      fetchTasks();
      fetchStats();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to delete", "error");
    }
  } catch (err) {
    console.error("Delete error:", err);
    showToast("Server error", "error");
  }
}

async function checkReminders() {
  try {
    const res = await fetch('http://localhost:5001/api/tasks/reminders', {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.reminders && data.reminders.length > 0) {
      const count = data.reminders.length;
      showToast(`Warning: You have ${count} deadline(s) approaching!`, "error");
    }
  } catch (err) { }
}

document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await fetch("http://localhost:5001/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }
    });
  } catch (err) { }
  localStorage.clear();
  window.location.href = "index.html";
});

window.onclick = function (event) {
  const modal = document.getElementById("uploadModal");
  if (event.target === modal) closeUploadModal();
}

fetchStats();
fetchTasks();
fetchMyMedia();
setInterval(checkReminders, 60000);
checkReminders();
