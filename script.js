document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const message = document.getElementById("message");

  // Example mock users (for testing)
  const validUsers = {
    "Mohammed": "11",
    "Ahmed": "22"
  };

  if (validUsers[username] && validUsers[username] === password) {
    message.style.color = "green";
    message.textContent = "Login successful. Redirecting...";
    setTimeout(() => {
      window.location.href = "dashboard.html"; // page after login
    }, 1000);
  } else {
    message.style.color = "#c0392b";
    message.textContent = "Invalid username or password.";
  }
});
