// Supabase setup
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// دالة عرض رسالة
function showMessage(text, type = "error") {
  const msgBox = document.getElementById("messageBox");
  if (!msgBox) return;

  msgBox.textContent = text;
  msgBox.className = `msgBox ${type === "error" ? "errorMsg" : "successMsg"}`;
  msgBox.style.display = "block";

  if (type === "success") {
    setTimeout(() => {
      msgBox.style.display = "none";
    }, 3000);
  }
}

// تحميل الموظفين من جدول employees
async function loadEmployees() {
  const { data, error } = await supabase.from("employees").select("*");

  if (error) {
    console.error("Error loading employees:", error);
    return;
  }

  const select = document.getElementById("allowedUser");
  select.innerHTML = '<option value="">Select Employee</option>';

  data.forEach((emp) => {
    const option = document.createElement("option");
    option.value = emp.user_id; // UID من Supabase Auth
    option.textContent = emp.name; // فقط الاسم كما طلبت
    select.appendChild(option);
  });
}

// تشفير وهمي + إرسال (رفع)
async function encryptAndSendFile() {
  const fileInput = document.getElementById("fileInput");
  const allowedUser = document.getElementById("allowedUser").value;

  const file = fileInput.files[0];

  if (!file) return showMessage("Please select a file", "error");
  if (!allowedUser) return showMessage("Please select an employee", "error");

  // اسم فريد للملف
  const fileName = `${Date.now()}_${file.name}`;

  // رفع الملف إلى Storage bucket اسمه: files
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("files")
    .upload(fileName, file);

  if (uploadError) {
    showMessage("Upload Failed: " + uploadError.message, "error");
    return;
  }

  // الحصول على المستخدم الحالي
  const currentUser = (await supabase.auth.getUser()).data.user;

  // حفظ البيانات في shared_files
  const { error: insertError } = await supabase.from("shared_files").insert([
    {
      file_name: file.name,
      storage_path: uploadData.path,
      allowed_user_id: allowedUser,
      uploaded_by: currentUser.id,
      created_at: new Date(),
    },
  ]);

  if (insertError) {
    showMessage("Database Error: " + insertError.message, "error");
    return;
  }

  showMessage("File sent successfully!", "success");
  fileInput.value = "";
}

// تحميل الملفات المستلمة للموظف الحالي
async function loadReceivedFiles() {
  const currentUser = (await supabase.auth.getUser()).data.user;

  const { data: files, error } = await supabase
    .from("shared_files")
    .select("*")
    .eq("allowed_user_id", currentUser.id);

  const receivedList = document.getElementById("receivedList");
  receivedList.innerHTML = "";

  if (!files || files.length === 0) {
    receivedList.innerHTML = "<p>No files received yet.</p>";
    return;
  }

  files.forEach((file) => {
    const div = document.createElement("div");
    div.className = "file-item";
    div.innerHTML = `
      <strong>${file.file_name}</strong><br>
      <small>${new Date(file.created_at).toLocaleDateString()}</small><br>
      <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">Download</button>
    `;
    receivedList.appendChild(div);
  });
}

// تحميل ملف من Supabase Storage
async function downloadFile(storagePath, fileName) {
  const { data, error } = await supabase.storage
    .from("files")
    .download(storagePath);

  if (error) {
    showMessage("Download Failed: " + error.message, "error");
    return;
  }

  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// تسجيل خروج
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// تشغيل عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  await loadEmployees();
  await loadReceivedFiles();

  document
    .getElementById("encryptBtn")
    .addEventListener("click", encryptAndSendFile);

  document.getElementById("logoutBtn").addEventListener("click", logout);
});

// جعل الدوال متاحة
window.downloadFile = downloadFile;
