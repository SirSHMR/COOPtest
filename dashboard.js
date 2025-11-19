// Supabase setup
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// رسائل
function showMessage(text, type = "error") {
  const msgBox = document.getElementById("messageBox");
  msgBox.textContent = text;
  msgBox.className = `msgBox ${type === 'error' ? 'errorMsg' : 'successMsg'}`;
  msgBox.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => msgBox.style.display = 'none', 3000);
  }
}

// دالة جلب الموظفين من Supabase
async function loadEmployees() {
  try {
    // احصل على المستخدم الحالي
    const currentUser = (await supabase.auth.getUser()).data.user;

    // اجلب جميع الموظفين من جدول employees
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name');

    if (error) {
      console.error('Error loading employees:', error);
      return;
    }

    const select = document.getElementById('allowedUser');

    // إفراغ القائمة أولاً
    select.innerHTML = '<option value="">Select Employee</option>';

    // أضف الموظفين باستثناء المستخدم الحالي
    employees.forEach(emp => {
      if (emp.id !== currentUser.id) {   // ← هنا السحر
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        select.appendChild(option);
      }
    });

  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

// إرسال الملف
async function encryptAndSendFile() {
  const fileInput = document.getElementById('fileInput');
  const employeeSelect = document.getElementById('employeeSelect');

  const file = fileInput.files[0];
  const allowedUserId = employeeSelect.value;

  if (!file) return showMessage("Please select a file");
  if (!allowedUserId) return showMessage("Please select an employee");

  try {
    const fileName = `${Date.now()}_${file.name}`;

    // رفع الملف
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("files")
      .upload(fileName, file);

    if (uploadError) {
      showMessage("Upload error: " + uploadError.message);
      return;
    }

    // حفظ البيانات في shared_files
    const currentUser = (await supabase.auth.getUser()).data.user.id;

    const { error: dbError } = await supabase
      .from("shared_files")
      .insert([
        {
          file_name: file.name,
          storage_path: uploadData.path,
          allowed_user_id: allowedUserId,
          uploaded_by: currentUser,
          created_at: new Date(),
        },
      ]);

    if (dbError) {
      showMessage("DB error: " + dbError.message);
      return;
    }

    showMessage("File sent successfully!", "success");
    fileInput.value = "";
  } 
  catch (err) {
    showMessage(err.message);
  }
}

// تحميل الملفات المستلمة
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

  files.forEach(file => {
    const div = document.createElement("div");
    div.className = "file-item";
    div.innerHTML = `
      <strong>${file.file_name}</strong><br />
      <small>${new Date(file.created_at).toLocaleDateString()}</small>
      <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">Download</button>
    `;
    receivedList.appendChild(div);
  });
}

// تحميل ملف
async function downloadFile(path, fileName) {
  const { data, error } = await supabase.storage
    .from("files")
    .download(path);

  if (error) {
    showMessage("Error downloading file: " + error.message);
    return;
  }

  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// تسجيل خروج
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  await loadEmployees();
  await loadReceivedFiles();

  document.getElementById("encryptBtn").addEventListener("click", encryptAndSendFile);
  document.getElementById("logoutBtn").addEventListener("click", logout);
});

// لجعل الدوال متاحة للزر
window.downloadFile = downloadFile;
