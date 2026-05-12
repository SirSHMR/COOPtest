const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// تجهيز session من رابط recovery
async function initializeRecoverySession() {

  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) {
    showMessage("Invalid or expired reset link");
    return false;
  }

  const { error } = await client.auth.setSession({
    access_token,
    refresh_token
  });

  if (error) {
    showMessage("Recovery link expired");
    return false;
  }

  return true;
}


function showMessage(text, type = "error") {
  const msg = document.getElementById("message");

  msg.textContent = text;
  msg.className = "message " + type;
  msg.style.display = "block";
}


async function updatePassword() {

  const sessionReady =
    await initializeRecoverySession();

  if (!sessionReady) return;

  const password =
    document.getElementById("newPassword").value.trim();

  const confirmPassword =
    document.getElementById("confirmPassword").value.trim();

  if (password !== confirmPassword) {
    showMessage("Passwords do not match");
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
