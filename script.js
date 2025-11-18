// Supabase setup
  import { createClient } from 'https://fucddnhmxhskmzmhmzyw.supabase.co';

const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// Login Function
// ========================================
function showMessage(text, type = "error") {
  const msg = document.getElementById("message") || document.getElementById("messageBox");
  if (!msg) return;
  msg.textContent = text;
  msg.className = "message " + type;
  msg.style.display = "block";
}

async function loginUser() {
  const emailInput = document.getElementById("email") || document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Please enter both fields", "error");
    return;
  }

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError || !loginData.user) {
    showMessage("Invalid email or password", "error");
    return;
  }

  showMessage("Login successful!", "success");
  setTimeout(() => window.location.href = "dashboard.html", 800);
}

// ========================================
// Dashboard Function
// ========================================
function dashboardSetup() {
  const encryptBtn = document.getElementById("encryptBtn");
  if (!encryptBtn) return;

  encryptBtn.addEventListener("click", () => {
    const file = document.getElementById("fileInput").files[0];
    const allowed = document.getElementById("allowedUser").value;

    if (!file) {
      showMessage("error", "Please select a file.");
      return;
    }

    if (!allowed) {
      showMessage("error", "Please select an employee who can access the file.");
      return;
    }

    showMessage("success", "File ready for encryption.");

    // إضافة الملف للقائمة المستلمة (محاكاة)
    const receivedList = document.getElementById("receivedList");
    if (!receivedList) return;
    const div = document.createElement("div");
    div.className = "file-item";
    div.textContent = `${file.name} → Allowed for: ${allowed}`;
    receivedList.appendChild(div);
  });
}

// ========================================
// تشغيل الوظائف حسب الصفحة
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("loginBtn")) {
    document.getElementById("loginBtn").addEventListener("click", loginUser);
  }
  if (document.getElementById("encryptBtn")) {
    dashboardSetup();
  }
});
