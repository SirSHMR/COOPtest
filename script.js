// Supabase setup - بدون استيراد
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

// استخدم window.supabase بدلاً من الاستيراد
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// Message Function
// ========================================
function showMessage(text, type = "error") {
  const msg = document.getElementById("message");
  if (!msg) return;
  msg.textContent = text;
  msg.className = "message " + type;
  msg.style.display = "block";
}

// ========================================
// Login Function
// ========================================
async function loginUser() {
  const emailInput = document.getElementById("Email");
  const passwordInput = document.getElementById("password");

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Please enter both email and password", "error");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      showMessage("Invalid email or password", "error");
      console.error("Login error:", error.message);
      return;
    }

    if (data.user) {
      showMessage("Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    }
  } catch (error) {
    showMessage("Network error. Please try again.", "error");
    console.error("Login exception:", error);
  }
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener("DOMContentLoaded", function() {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", loginUser);
  }
  
  // إضافة إمكانية الدخول بالزر Enter
  document.getElementById("Email").addEventListener("keypress", function(e) {
    if (e.key === "Enter") loginUser();
  });
  
  document.getElementById("password").addEventListener("keypress", function(e) {
    if (e.key === "Enter") loginUser();
  });
});
