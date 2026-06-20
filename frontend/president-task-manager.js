const token = localStorage.getItem("token");
const presidentName = localStorage.getItem("username");

if (!token) {
    window.location.href = "index.html";
}

document.getElementById("presidentName").textContent = presidentName || "President";

// Parse Query Params
const urlParams = new URLSearchParams(window.location.search);
const club = urlParams.get('club') || 'art';
const target = urlParams.get('target') || 'member'; // 'head' or 'member'

// UI Setup
const clubName = club === 'art' ? "Art Club" : "Dance Club";
const targetName = target === 'head' ? "Club Head" : "Club Members";

document.getElementById("pageTitle").textContent = `Assign Task - ${clubName}`;
document.getElementById("pageSubtitle").textContent = `Assigning a new task to ${targetName}`;
document.getElementById("targetRoleLabel").textContent = targetName;

// Set min datetime to current local time
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
document.getElementById("taskDeadline").min = now.toISOString().slice(0, 16);

function goBack() {
    window.location.href = `president-club-dashboard.html?club=${club}`;
}

// Fetch Users for Dropdown
async function fetchUsers() {
    try {
        const targetRole = target === 'head'
            ? (club === 'art' ? 'artclubhead' : 'danceclubhead')
            : (club === 'art' ? 'artclubmember' : 'danceclubmember');

        // Use the specific users endpoint which filters by role
        const res = await fetch(`http://localhost:5001/api/tasks/users?role=${targetRole}`, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();
        const users = data.users;

        const select = document.getElementById("taskMember");
        if (!users || users.length === 0) {
            select.innerHTML = '<option value="">No users found</option>';
        } else {
            select.innerHTML = users.map(u =>
                `<option value="${u._id}">${u.name} (${u.rollNumber})</option>`
            ).join('');
        }

    } catch (err) {
        console.error("Fetch users error:", err);
        document.getElementById("taskMember").innerHTML = '<option value="">Error loading users</option>';
    }
}

// Create Task
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
            showToast("Task Assigned Successfully!", "success");
            setTimeout(() => goBack(), 1500); // Wait for toast
        } else {
            const d = await res.json();
            showToast(d.error || "Failed to assign task", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Server error", "error");
    }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});

// Init
fetchUsers();
