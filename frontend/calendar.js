// calendar.js - mini calendar widget with color-coded task deadlines
(function () {

  const apiBase = "http://localhost:5001/api/tasks";

  // Format date as DD/MM/YYYY
  function formatDDMMYYYY(d) {
    if (!d) return "";
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // Calendar container
  const container = document.createElement("div");
  container.id = "miniCalendar";
  container.innerHTML = `
    <div class="cal-header">
      <div class="month"></div>
      <div>
        <button id="prevMonth">‹</button>
        <button id="nextMonth">›</button>
      </div>
    </div>
    <div class="cal-body">
      <table>
        <thead>
          <tr>
            <th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th>
          </tr>
        </thead>
        <tbody id="calTbody"></tbody>
      </table>
      <div class="legend" id="calLegend"></div>
    </div>
  `;
  document.body.appendChild(container);

  let viewDate = new Date();
  let currentUserRole = localStorage.getItem("role") || "";

  // Modal
  const modalContainer = document.createElement("div");
  modalContainer.id = "calDetailsModal";
  modalContainer.className = "cal-details-modal";
  modalContainer.innerHTML = `
    <div class="cal-details-content">
      <div class="cal-details-header">
        <h3 id="calModalTitle">Tasks for ...</h3>
        <button class="cal-details-close" id="calModalClose">&times;</button>
      </div>
      <div class="cal-details-body" id="calModalBody"></div>
    </div>
  `;
  document.body.appendChild(modalContainer);

  document.querySelector("#calModalClose").addEventListener("click", () => {
    modalContainer.style.display = "none";
  });
  window.addEventListener("click", (e) => {
    if (e.target === modalContainer) modalContainer.style.display = "none";
  });

  const tasksByDate = new Map(); // stores full tasks for modal

  // Fetch events
  async function fetchEvents() {
    try {
      const res = await fetch(`${apiBase}/my-tasks?t=${Date.now()}`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      if (!res.ok) return { dateMap: new Map(), hasPresidentTasks: false, hasHeadTasks: false };

      const tasks = await res.json();
      const dateMap = new Map();
      tasksByDate.clear();

      let hasPresidentTasks = false;
      let hasHeadTasks = false;

      tasks
        .filter((t) => !t.isApproved && t.status !== "completed")
        .forEach((t) => {
          if (!t.deadline) return;

          const dateKey = formatDDMMYYYY(t.deadline);

          if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, []);
          tasksByDate.get(dateKey).push(t);

          let taskType = t.type === "meeting" ? "meeting" : "task";

          if (taskType === "task") {
            const role = t.assignedBy?.role || "";
            if (role === "studentpresident") {
              hasPresidentTasks = true;
              taskType = "president";
            } else {
              hasHeadTasks = true;
              taskType = "head";
            }
          }

          if (dateMap.has(dateKey) && dateMap.get(dateKey) !== taskType) {
            dateMap.set(dateKey, "both");
          } else {
            dateMap.set(dateKey, taskType);
          }
        });

      return { dateMap, hasPresidentTasks, hasHeadTasks };
    } catch (err) {
      console.error("Calendar Fetch Error:", err);
      return { dateMap: new Map(), hasPresidentTasks: false, hasHeadTasks: false };
    }
  }

  // Render calendar
  async function renderCalendar() {
    const monthName = viewDate.toLocaleString("default", { month: "long" });
    container.querySelector(".month").textContent = `${monthName} ${viewDate.getFullYear()}`;

    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

    const { dateMap, hasPresidentTasks, hasHeadTasks } = await fetchEvents();

    let html = "";
    let day = 1;

    for (let r = 0; r < 6; r++) {
      html += "<tr>";
      for (let c = 0; c < 7; c++) {
        if ((r === 0 && c < firstDay) || day > daysInMonth) {
          html += "<td></td>";
        } else {
          const formatted = formatDDMMYYYY(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
          const type = dateMap.get(formatted);
          let style = "";

          if (type === "president")
            style = `style="background:#ff1900; color:white; font-weight:bold;"`;
          else if (type === "head")
            style = `style="background:#0099ff; color:white; font-weight:bold;"`;
          else if (type === "meeting")
            style = `style="background:#b700ff; color:white; font-weight:bold;"`;
          else if (type === "both")
            style = `style="background:linear-gradient(135deg,#e74c3c 33%,#9b59b6 66%,#3498db 100%); color:white; font-weight:bold;"`;

          html += `<td class="day" data-date="${formatted}" ${style}>${day}</td>`;
          day++;
        }
      }
      html += "</tr>";
    }

    document.querySelector("#calTbody").innerHTML = html;

    // Legend
    let legend = `<div style="font-size:0.75em; margin-top:8px;">`;

    legend += `<div><span style="display:inline-block;width:12px;height:12px;background:#e74c3c;margin-right:5px;"></span>President Task</div>`;
    legend += `<div><span style="display:inline-block;width:12px;height:12px;background:#3498db;margin-right:5px;"></span>Head Task</div>`;
    legend += `<div><span style="display:inline-block;width:12px;height:12px;background:#9b59b6;margin-right:5px;"></span>Meeting</div>`;

    legend += `</div>`;
    document.querySelector("#calLegend").innerHTML = legend;
  }

  // Navigation
  document.querySelector("#prevMonth").addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendar();
  });

  document.querySelector("#nextMonth").addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendar();
  });

  // Day click → open modal
  container.addEventListener("click", (e) => {
    const td = e.target.closest("td.day");
    if (!td) return;

    const date = td.getAttribute("data-date");
    if (!tasksByDate.has(date)) return;

    const tasks = tasksByDate.get(date);
    document.getElementById("calModalTitle").textContent = `Tasks for ${date}`;

    const body = document.getElementById("calModalBody");
    body.innerHTML = "";

    tasks.forEach((t) => {
      const div = document.createElement("div");
      div.className = "cal-task-item";
      div.innerHTML = `
        <div class="cal-task-title">${t.title}</div>
        <div class="cal-task-desc">${t.description}</div>
        <div class="cal-task-meta">
          <span>By: ${t.assignedBy?.name || "Unknown"}</span>
          <span>${t.type === "meeting" ? "📍 Meeting" : t.priority.toUpperCase()}</span>
        </div>
      `;
      body.appendChild(div);
    });

    modalContainer.style.display = "flex";
  });

  // Global refresh function
  window.refreshCalendarHighlights = function () {
    renderCalendar();
  };

  renderCalendar();
})();
