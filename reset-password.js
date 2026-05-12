const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function showMessage(text, type = "error") {
  const msg = document.getElementById("message");

  msg.textContent = text;
  msg.className = "message " + type;
  msg.style.display = "block";
}

async function updatePassword() {

  const password =
    document.getElementById("newPassword").value.trim();

  const confirmPassword =
    document.getElementById("confirmPassword").value.trim();

  if (!password || !confirmPassword) {
    showMessage("Please fill all fields");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match");
    return;
  }

  if (password.length < 8) {
    showMessage("Password must be at least 8 characters");
    return;
  }

  const { error } =
    await client.auth.updateUser({
      password: password
    });

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage(
    "Password updated successfully",
    "success"
  );

  setTimeout(() => {
    window.location.href = "index.html";
  }, 2000);
}

document
  .getElementById("resetBtn")
  .addEventListener("click", updatePassword);
