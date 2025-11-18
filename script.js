// Supabase import
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/supabase.min.js';

// إعداد Supabase
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function loginUser() {
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    showMessage("Please enter both fields", "error");
    return;
  }

  // تسجيل الدخول
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (loginError) {
    showMessage("Invalid email or password", "error");
    return;
  }

  const user = loginData.user;

  // جلب بيانات الـ profile من جدول profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    showMessage("Error fetching profile", "error");
    return;
  }

  showMessage(`Login successful! Welcome, ${profile.username}`, "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 800);
}
