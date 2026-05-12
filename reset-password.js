const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showMessage(text, type = "error") {
  const msg = document.getElementById("message");
  msg.textContent = text;
  msg.className = "message " + type;
  msg.style.display = "block";
}

async function initializeRecoverySession() {
  // ✅ الطريقة الحديثة - PKCE flow
  const { data, error } = await client.auth.exchangeCodeForSession(
    window.location.href
  );

  if (error || !data.session) {
    showMessage("Reset link expired or invalid");
    return false;
  }

  return true;
}

async function updatePassword() {
  const ready = await initializeRecoverySession();
  if (!ready) return;

  const password = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (password !== confirmPassword) {
    showMessage("Passwords do not match");
    return;
  }

  const { error } = await client.auth.updateUser({ password });

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage("Password updated successfully", "success");
  setTimeout(() => { window.location.href = "index.html"; }, 2000);
}

document.getElementById("resetBtn").addEventListener("click", updatePassword);
