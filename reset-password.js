const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  }
});

function showMessage(text, type = "error") {
  const msg = document.getElementById("message");
  msg.textContent = text;
  msg.className = "message " + type;
  msg.style.display = "block";
}

async function initializeRecoverySession() {
  // انتظر Supabase يعالج الـ token من الـ URL تلقائياً
  await new Promise(resolve => setTimeout(resolve, 500));

  const { data, error } = await client.auth.getSession();

  if (data?.session) {
    return true;
  }

  showMessage("Invalid or expired reset link");
  return false;
}

async function updatePassword() {
  const ready = await initializeRecoverySession();
  if (!ready) return;

  const password = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (!password) {
    showMessage("Please enter a new password");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match");
    return;
  }

  const { error } = await client.auth.updateUser({ password });

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage("Password updated successfully ✅", "success");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 2000);
}

document.getElementById("resetBtn").addEventListener("click", updatePassword);
