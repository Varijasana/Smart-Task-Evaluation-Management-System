const token = localStorage.getItem("token");

document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "president.html";
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

async function fetchClubData() {
  try {
    const res = await fetch("http://localhost:5001/api/club/art", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();

    // Club Head
    const headDiv = document.getElementById("clubHeadInfo");
    headDiv.innerHTML = `<div class="head-card">
      <h4>${data.clubHead.name}</h4>
      <p>${data.clubHead.rollNumber}</p>
    </div>`;

    // Members
    const memberDiv = document.getElementById("memberList");
    memberDiv.innerHTML = data.members.map(m => `
      <div class="member-card">
        <p>${m.name}</p>
        <p>${m.rollNumber}</p>
      </div>
    `).join('');

    // Task chart
    const ctx = document.getElementById("taskChart").getContext("2d");
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.members.map(m => m.name),
        datasets: [{
          label: 'Tasks Completed',
          data: data.members.map(m => m.tasksCompleted),
          backgroundColor: 'rgba(108, 92, 231, 0.6)'
        }]
      }
    });

  } catch(err) {
    console.error("Error fetching club data:", err);
  }
}

fetchClubData();
