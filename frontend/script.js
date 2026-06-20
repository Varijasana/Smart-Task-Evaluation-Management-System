// script.js
const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";

  const rollNumber = document.getElementById("rollNumber").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("http://localhost:5001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNumber, password })
    });

    const data = await res.json();

    if (!res.ok) {
      message.style.color = "red";
      message.textContent = data.error || "Login failed";
      return;
    }

    // Save JWT + role + name
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("username", data.name);

    // Redirect based on role
    if (data.role.includes("clubhead")) window.location.href = "club-head.html";
    else if (data.role.includes("clubmember")) window.location.href = "club-member.html";
    else if (data.role === "studentpresident") window.location.href = "president.html";
    else {
      message.style.color = "red";
      message.textContent = "Unknown role";
    }

  } catch (err) {
    message.style.color = "red";
    message.textContent = "Server not reachable";
    console.error(err);
  }
});
