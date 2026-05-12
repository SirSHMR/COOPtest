const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

onst client =
window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


function showMessage(text, type = "error") {

  const msg =
    document.getElementById("message");

  msg.textContent = text;
  msg.className =
    "message " + type;

  msg.style.display = "block";
}


// تجهيز session من رابط الإيميل
async function initializeRecoverySession() {

  const { data } =
    await client.auth.getSession();

  if (data.session) {
    return true;
  }

  const hash =
    window.location.hash;

  if (!hash) {

    showMessage(
      "Invalid reset link"
    );

    return false;
  }

  const params =
    new URLSearchParams(
      hash.substring(1)
    );

  const access_token =
    params.get("access_token");

  const refresh_token =
    params.get("refresh_token");

  if (
    !access_token ||
    !refresh_token
  ) {

    showMessage(
      "Reset link expired"
    );

    return false;
  }

  const { error } =
    await client.auth.setSession({
      access_token,
      refresh_token
    });

  if (error) {

    showMessage(
      "Session expired"
    );

    return false;
  }

  return true;
}


// تغيير كلمة المرور
async function updatePassword() {

  const ready =
    await initializeRecoverySession();

  if (!ready) return;


  const password =
    document
    .getElementById("newPassword")
    .value
    .trim();

  const confirmPassword =
    document
    .getElementById("confirmPassword")
    .value
    .trim();


  if (password !== confirmPassword) {

    showMessage(
      "Passwords do not match"
    );

    return;
  }


  const { error } =
    await client.auth.updateUser({
      password: password
    });

  if (error) {

    showMessage(
      error.message
    );

    return;
  }


  showMessage(
    "Password updated successfully",
    "success"
  );


  setTimeout(() => {

    window.location.href =
      "index.html";

  }, 2000);

}


document
.getElementById("resetBtn")
.addEventListener(
  "click",
  updatePassword
);
document
  .getElementById("resetBtn")
  .addEventListener("click", updatePassword);
