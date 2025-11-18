// Supabase setup
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

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

  if (!emailInput || !passwordInput) {
    showMessage("Login form elements not found", "error");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Please enter both email and password", "error");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage("Invalid email or password", "error");
      console.error("Login error:", error.message);
      return;
    }

    if (data.user) {
      showMessage("Login successful! Redirecting...", "success");
      setTimeout(() => {
        // تأكد من وجود dashboard.html أو غير المسار حسب احتياجك
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
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", loginUser);
    
    // إضافة إمكانية الدخول بالزر Enter
    const emailInput = document.getElementById("Email");
    const passwordInput = document.getElementById("password");
    
    if (emailInput && passwordInput) {
      emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") loginUser();
      });
      passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") loginUser();
      });
    }
  }
});

// ========================================
// Export functions for other pages (optional)
// ========================================
export { supabase, showMessage };
