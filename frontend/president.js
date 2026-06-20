const presidentName = localStorage.getItem("username");
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
}

document.getElementById("presidentName").textContent = presidentName || "President";

// Logout
document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  localStorage.clear();
  window.location.href = "index.html";
});

// Club selection buttons
document.querySelectorAll(".clubBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const club = btn.getAttribute("data-club");
    
    if(club === "art") window.location.href = "artclubhead.html";
    else if(club === "dance") window.location.href = "danceclubhead.html";
  });
});
