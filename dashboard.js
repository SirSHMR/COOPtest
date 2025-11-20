// Supabase setup
const SUPABASE_URL = "[https://fucddnhmxhskmzmhmzyw.supabase.co](https://fucddnhmxhskmzmhmzyw.supabase.co)";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// رسائل
function showMessage(text, type = "error") {
const msgBox = document.getElementById("messageBox");
if (!msgBox) return;
msgBox.textContent = text;
msgBox.className = `msgBox ${type === 'error' ? 'errorMsg' : 'successMsg'}`;
msgBox.style.display = 'block';

if (type === 'success') {
setTimeout(() => msgBox.style.display = 'none', 3000);
}
}

// تحميل قائمة الموظفين وعرضها كـ checkboxes
async function loadEmployees() {
try {
const currentUser = (await supabase.auth.getUser()).data.user;
const { data, error } = await supabase
.from("employees")
.select("id, name, email, uid");

```
if (error) {
  console.error("Error loading employees:", error);
  showMessage("Unable to load employees.", "error");
  return;
}

const container = document.getElementById('employeesList');
container.innerHTML = "";

// إضافة خيار إرسال للجميع أولًا
const allWrapper = document.createElement('div');
allWrapper.style.marginBottom = "8px";
allWrapper.innerHTML = `
  <label style="display:flex; align-items:center; gap:8px;">
    <input type="checkbox" id="sendAllCheckbox" value="ALL" />
    <span style="font-weight:600">Send to ALL Employees</span>
  </label>
  <hr style="margin:8px 0; border:none; border-top:1px solid #eee;" />
`;
container.appendChild(allWrapper);

// إضافة كل الموظفين (ما عدا المستخدم الحالي)
data.forEach(emp => {
  // قيمة التعريف: uid إن وُجد وإلا استخدم id
  const empId = emp.uid || emp.id;
  if (!empId) return; // تجاهل إن لم يوجد معرّف
  if (empId === currentUser.id) return; // استبعاد المستخدم الحالي

  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = "6px";
  wrapper.innerHTML = `
    <label style="display:flex; align-items:center; gap:8px;">
      <input type="checkbox" class="emp-checkbox" value="${empId}" data-name="${escapeHtml(emp.name)}" />
      <span>${escapeHtml(emp.name)}</span>
    </label>
  `;
  container.appendChild(wrapper);
});

// اضبط سلوك checkbox "ALL" بحيث عند تحديده تُلغى تحديد الباقي، والعكس
const sendAllCheckbox = document.getElementById('sendAllCheckbox');
sendAllCheckbox.addEventListener('change', () => {
  const others = Array.from(document.querySelectorAll('.emp-checkbox'));
  if (sendAllCheckbox.checked) {
    // إلغاء اختيار الباقي
    others.forEach(ch => ch.checked = false);
  }
});

// لو اختر المستخدمين يلغوا اختيار ALL
container.addEventListener('change', (e) => {
  if (e.target && e.target.classList.contains('emp-checkbox')) {
    if (e.target.checked) {
      // إذا تم اختيار أي موظف فرعي، نلغي ALL
      sendAllCheckbox.checked = false;
    }
  }
});
```

} catch (err) {
console.error(err);
showMessage("Error loading employees.", "error");
}
}

// دالة مساعدة للأمان في عرض النصوص
function escapeHtml(text) {
if (!text) return "";
return String(text)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

// إرسال الملف (يدعم إرسال لمجموعة أو للجميع)
async function encryptAndSendFile() {
const fileInput = document.getElementById('fileInput');
const container = document.getElementById('employeesList');
const file = fileInput.files[0];

if (!file) {
showMessage("Please select a file", "error");
return;
}

// تحقق من الاختيارات
const sendAll = document.getElementById('sendAllCheckbox')?.checked;
const selected = Array.from(container.querySelectorAll('.emp-checkbox'))
.filter(cb => cb.checked)
.map(cb => cb.value);

if (!sendAll && selected.length === 0) {
showMessage("Please select at least one employee", "error");
return;
}

try {
// رفع الملف مرة واحدة
const fileName = `${Date.now()}_${file.name}`;
const { data: uploadData, error: uploadError } = await supabase.storage
.from("files")
.upload(fileName, file);

```
if (uploadError) {
  showMessage("Upload error: " + uploadError.message, "error");
  return;
}

const currentUserId = (await supabase.auth.getUser()).data.user.id;

// تحديد المستلمين
let recipients = [];

if (sendAll) {
  const { data: employees } = await supabase
    .from("employees")
    .select("id, uid, name");

  recipients = employees
    .map(emp => emp.uid || emp.id)
    .filter(uid => uid && uid !== currentUserId);
} else {
  recipients = selected;
}

// إدراج صفوف shared_files لكل مستقبل
const rows = recipients.map(uid => ({
  file_name: file.name,
  storage_path: uploadData.path,
  allowed_user_id: uid,
  uploaded_by: currentUserId,
  created_at: new Date()
}));

if (rows.length === 0) {
  showMessage("No recipients found to send the file.", "error");
  return;
}

const { error: dbError } = await supabase
  .from("shared_files")
  .insert(rows);

if (dbError) {
  showMessage("DB error: " + dbError.message, "error");
  return;
}

showMessage("File sent successfully!", "success");
fileInput.value = "";

// ثم تحديث قائمة المستلمين الظاهرة للمستخدم الحالي (إن أراد)
await loadReceivedFiles();
```

} catch (err) {
console.error(err);
showMessage("Error: " + (err.message || err), "error");
}
}

// تحميل الملفات المستلمة
async function loadReceivedFiles() {
try {
const currentUser = (await supabase.auth.getUser()).data.user;

```
const { data: files, error } = await supabase
  .from("shared_files")
  .select("*")
  .eq("allowed_user_id", currentUser.id)
  .order('created_at', { ascending: false });

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
    <strong>${escapeHtml(file.file_name)}</strong><br />
    <small>${new Date(file.created_at).toLocaleDateString()}</small>
    <div style="margin-top:8px;">
      <button onclick="downloadFile('${file.storage_path}', '${escapeHtml(file.file_name)}')">Download</button>
    </div>
  `;
  receivedList.appendChild(div);
});
```

} catch (err) {
console.error(err);
showMessage("Unable to load received files.", "error");
}
}

// تحميل ملف
async function downloadFile(path, fileName) {
const { data, error } = await supabase.storage
.from("files")
.download(path);

if (error) {
showMessage("Error downloading file: " + error.message, "error");
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
