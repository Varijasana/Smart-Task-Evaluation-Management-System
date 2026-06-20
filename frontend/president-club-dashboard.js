const token = localStorage.getItem("token");
const presidentName = localStorage.getItem("username");

if (!token) {
    window.location.href = "index.html";
}

document.getElementById("presidentName").textContent = presidentName || "President";

// Get query params
const urlParams = new URLSearchParams(window.location.search);
const club = urlParams.get('club') || 'art'; // default to art if missing
document.getElementById("clubTitle").textContent = (club === 'art' ? "🎨 Art" : "💃 Dance") + " Club Dashboard";

let performanceChart = null;
let allTasks = [];

// Navigation helper
function navigateToTaskManager(target) {
    window.location.href = `president-task-manager.html?club=${club}&target=${target}`;
}

// Fetch Tasks Assigned BY President (Filtered by CURRENT CLUB CONTEXT)
async function fetchAssignedTasks() {
    try {
        const res = await fetch("http://localhost:5001/api/tasks/assigned-by-me", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();

        // Strict Isolation: Only show tasks where the assigned user belongs to the current club
        // Note: We need 'club' in assignedTo from backend (we just added it)
        // Also filter out approved tasks
        // Keep all tasks (including approved) for stats
        const activeTasks = data.tasks.filter(t => t.assignedTo && t.assignedTo.club === club);
        allTasks = activeTasks;

        // Filter out approved tasks for display
        const visibleTasks = activeTasks.filter(t => !t.isApproved);
        displayTasks(visibleTasks);
        updateGraph(activeTasks); // Use all club tasks for stats
    } catch (err) {
        console.error("Failed to fetch tasks:", err);
    }
}

// Display tasks
function displayTasks(tasks) {
    const tasksList = document.getElementById("tasksList");

    if (!tasks || tasks.length === 0) {
        tasksList.innerHTML = '<div class="empty-state">No tasks assigned for this club.</div>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => {
        const borderColor = task.wasRejected && task.status === 'pending' ? '#e74c3c' : '#dfe6e9';

        return `
      <div class="task-card" style="border-left: 4px solid ${borderColor};">
        <div class="task-card-header">
          <div class="task-info">
            <div class="task-title">${task.title}</div>
            <div class="task-assigned">To: <strong>${task.assignedTo?.name || 'Unknown'}</strong> (${task.assignedTo?.rollNumber || '?'})</div>
          </div>
          <span class="task-status-badge status-${task.status}">${task.status.replace('-', ' ').toUpperCase()}</span>
        </div>
        <p>${task.description}</p>
        ${task.wasRejected && task.status === 'pending' ? `
          <div style="background: #fee; padding: 8px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid #e74c3c;">
            <span style="color: #e74c3c; font-weight: bold; font-size: 0.85em;">⚠️ Previously Rejected</span>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #c0392b;">Waiting for resubmission. Deadline extended by 3 days.</p>
            ${task.lastRejectionReason ? `<p style="margin: 3px 0 0 0; font-size: 0.75em; color: #7f8c8d;"><em>Last rejection: ${task.lastRejectionReason}</em></p>` : ''}
          </div>
        ` : ''}
        <div class="task-meta-row">
           <span class="priority-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
           <span>Deadline: ${new Date(task.deadline).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
           <button class="delete-btn" onclick="deleteTask('${task._id}')" style="margin-left: auto;">DELETE</button>
        </div>
      </div>
    `;
    }).join('');
}

// Graph Logic
function updateGraph(tasks) {
    // If we have a canvas for it
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    const completed = completedTasks.length;
    const pending = pendingTasks.length;

    if (performanceChart) performanceChart.destroy();

    performanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
                data: [completed, pending],
                backgroundColor: ['#00b894', '#b2bec3']
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
        const getNames = (taskList) => {
            const names = taskList.map(t => t.assignedTo ? t.assignedTo.name : 'Unknown');
            return [...new Set(names)];
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
      <div style="border-left: 4px solid #b2bec3; padding-left: 10px;">
        <h4 style="margin: 0; color: #2d3436;">Pending (${pending})</h4>
        <div class="status-list">
            ${pendingNames.length > 0 ? pendingNames.join(', ') : 'None'}
        </div>
      </div>
    `;
    }
}

// Delete task
async function deleteTask(taskId) {
    const isConfirmed = await showConfirm("Are you sure you want to delete this task?", "Delete Task", { isDanger: true, confirmText: "Yes, Delete" });
    if (!isConfirmed) return;
    try {
        await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { "Authorization": "Bearer " + token }
        });
        fetchAssignedTasks();
    } catch (e) {
        showToast("Error deleting task", "error");
    }
}

// Fetch Pending Media (Review Submissions)
async function fetchPendingMedia() {
    try {
        // Pass the current club context to the backend so it filters properly for President
        const res = await fetch(`http://localhost:5001/api/tasks/pending-media?club=${club}`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();

        // Backend handles filtering now, so just display
        displayPendingMedia(data.media);
    } catch (err) {
        console.error("Failed to fetch pending media:", err);
    }
}

function displayPendingMedia(mediaList) {
    const mediaSection = document.getElementById("pendingMediaList");
    if (!mediaSection) return;

    if (!mediaList || mediaList.length === 0) {
        mediaSection.innerHTML = '<div class="empty-state">No pending submissions for assigned tasks.</div>';
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
          <p><strong>By:</strong> ${media.uploadedBy.name}</p>
          <p><strong>Task:</strong> ${media.taskId ? media.taskId.title : 'General'}</p>
          <p><strong>Desc:</strong> ${media.description || '-'}</p>
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

async function verifyMedia(mediaId, status) {
    let feedback = '';
    if (status === 'rejected') {
        const input = await showPrompt('Please provide a reason for rejection:', 'Rejection Feedback', 'Reason', '');
        if (input === null) return; // Cancelled
        feedback = input;

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
            fetchAssignedTasks(); // Refresh task list to remove approved tasks
        } else {
            const data = await res.json();
            showToast(`Error: ${data.error || 'Failed to verify'}`, "error");
        }
    } catch (e) {
        console.error("Error verifying:", e);
        showToast("Network error. Please try again.", "error");
    }
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});

// Initialize
fetchAssignedTasks().then(() => {
    fetchPendingMedia();
});
