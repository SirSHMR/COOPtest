// =====================================================
// Simple & Permanent Encryption System
// =====================================================

class SimpleEncryptionSystem {
  constructor() {
    this.userKey = null;
    this.currentUser = null;
  }
  
  // تهيئة نظام التشفير - مرة واحدة عند الدخول
  async initialize() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      this.currentUser = user;
      
      // 1. اشتقاق مفتاح دائم من بيانات المستخدم
      this.userKey = await this.derivePermanentKey(user.id, user.email);
      
      console.log("Encryption system initialized for user:", user.email);
      return this.userKey;
      
    } catch (error) {
      console.error("Error initializing encryption:", error);
      throw error;
    }
  }
  
  // اشتقاق مفتاح دائم من user.id و user.email
  async derivePermanentKey(userId, userEmail) {
    const encoder = new TextEncoder();
    
    // 1. إنشاء مادة أولية فريدة للمستخدم
    const uniqueString = `user:${userId}:email:${userEmail}:app:secure_file_system`;
    const keyMaterial = encoder.encode(uniqueString);
    
    // 2. استخدام SHA-256 لإنشاء hash ثابت
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyMaterial);
    
    // 3. تحويل الـ 256-bit hash إلى مفتاح AES-256
    const key = await crypto.subtle.importKey(
      "raw",
      hashBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    
    return key;
  }
  
  // تشفير الملف
  async encryptFile(file) {
    if (!this.userKey) {
      await this.initialize();
    }
    
    // IV (Initialization Vector) عشوائي لكل ملف
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();
    
    // التشفير باستخدام AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.userKey,
      fileBuffer
    );
    
    return { encrypted, iv };
  }
  
  // فك تشفير الملف
  async decryptFile(buffer, iv) {
    if (!this.userKey) {
      await this.initialize();
    }
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.userKey,
      buffer
    );
    
    return new Blob([decrypted]);
  }
}

// =====================================================
// إنشاء نظام التشفير العالمي
// =====================================================
const encryptionSystem = new SimpleEncryptionSystem();

// =====================================================
// Helper Functions (دوال مساعدة)
// =====================================================

// Convert ArrayBuffer ↔ Base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Format date function
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// =====================================================
// Supabase setup
// =====================================================
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// Messages
// =====================================================
function showMessage(text, type = "error") {
  const msgBox = document.getElementById("messageBox");
  msgBox.textContent = text;
  msgBox.className = `msgBox ${type === 'error' ? 'errorMsg' : 'successMsg'}`;
  msgBox.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => msgBox.style.display = 'none', 3000);
  }
}

// =====================================================
// Employees Management
// =====================================================

// Load employees list from employees table
async function loadEmployees() {
  const employeesList = document.getElementById('employeesList');
  employeesList.innerHTML = '';

  const { data, error } = await supabase
    .from("employees")
    .select("id, name, email");

  if (error) {
    console.error("Error loading employees:", error);
    showMessage("Error loading employees list: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    employeesList.innerHTML = '<p>No employees found</p>';
    return;
  }

  data.forEach(emp => {
    const div = document.createElement("div");
    div.className = "employee-checkbox";
    div.innerHTML = `
      <label>
        <input type="checkbox" class="employee-checkbox" value="${emp.id}">
        ${emp.name} (${emp.email})
      </label>
    `;
    employeesList.appendChild(div);
  });
}

// Get selected employees
function getSelectedEmployees() {
  const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
  const selectedEmployees = [];
  
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      selectedEmployees.push(checkbox.value);
    }
  });
  
  return selectedEmployees;
}

// =====================================================
// File Encryption & Sending (مبسط)
// =====================================================

async function encryptAndSendFile() {
  const fileInput = document.getElementById('fileInput');
  const selectAllCheckbox = document.getElementById('selectAllEmployees');
  
  const file = fileInput.files[0];
  const sendToAll = selectAllCheckbox.checked;
  const selectedEmployees = getSelectedEmployees();

  if (!file) return showMessage("Please select a file");
  if (!sendToAll && selectedEmployees.length === 0) return showMessage("Please select at least one employee");

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      showMessage("Please login again");
      return;
    }

    // الحصول على اسم المرسل
    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("name")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee) {
      showMessage("Error: Cannot find employee data");
      return;
    }

    const senderName = currentEmployee.name;
    const fileName = `${Date.now()}_${file.name}`;

    showMessage("Encrypting and sending file...", "info");

    // تشفير الملف (تلقائي - لا يحتاج كلمة مرور)
    const { encrypted, iv } = await encryptionSystem.encryptFile(file);

    // دمج IV + البيانات المشفرة
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    // رفع الملف المشفر
    const saudi = new Date().toLocaleString('en-SA', {
      timeZone: 'Asia/Riyadh'
    });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("files")
      .upload(fileName, combined.buffer);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      showMessage("Upload error: " + uploadError.message);
      return;
    }

    // الحصول على المستلمين
    let employeeData = [];
    if (sendToAll) {
      const { data: allEmployees, error: empError } = await supabase
        .from("employees")
        .select("id, name");
      
      if (empError) {
        showMessage("Error fetching employees: " + empError.message);
        return;
      }
      
      employeeData = allEmployees;
    } else {
      const { data: selectedEmployeesData, error: selError } = await supabase
        .from("employees")
        .select("id, name")
        .in("id", selectedEmployees);
      
      if (selError) {
        showMessage("Error fetching selected employees: " + selError.message);
        return;
      }
      
      employeeData = selectedEmployeesData;
    }

    // حفظ البيانات في قاعدة البيانات
    const currentUser = user.id;
    const fileRecords = employeeData.map(employee => ({
      file_name: file.name,
      storage_path: uploadData.path,
      allowed_user_id: employee.id,
      uploaded_by: currentUser,
      created_at: saudi,
      sender_name: senderName,
      receiver_name: employee.name
    }));

    const { error: dbError } = await supabase
      .from("shared_files")
      .insert(fileRecords);

    if (dbError) {
      console.error("Database error:", dbError);
      showMessage("Database error: " + dbError.message);
      
      // محاولة حذف الملف المرفوع إذا فشلت الإضافة في قاعدة البيانات
      await supabase.storage.from("files").remove([uploadData.path]);
      return;
    }

    showMessage(`File sent successfully to ${employeeData.length} employee(s)!`, "success");
    
    // إعادة تعيين النموذج
    fileInput.value = "";
    selectAllCheckbox.checked = false;
    const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.disabled = false;
    });

    // إعادة تحميل قائمة الملفات
    setTimeout(() => {
      loadReceivedFiles();
    }, 1000);
    
  } catch (err) {
    console.error("Unexpected error:", err);
    showMessage("Unexpected error: " + err.message);
  }
}

// =====================================================
// File Management
// =====================================================

async function loadReceivedFiles() {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      showMessage("Please login again");
      return;
    }

    const currentUser = userData.user;

    // جلب الملفات المرسلة والمستلمة
    const { data: files, error } = await supabase
      .from("shared_files")
      .select("*")
      .or(`allowed_user_id.eq.${currentUser.id},uploaded_by.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading files:", error);
      showMessage("Error loading files: " + error.message);
      return;
    }

    const receivedList = document.getElementById("receivedList");
    receivedList.innerHTML = "";

    if (!files || files.length === 0) {
      receivedList.innerHTML = "<p>No files received yet.</p>";
      return;
    }

    // فصل الملفات المستلمة عن المرسلة
    const receivedFiles = files.filter(file => file.allowed_user_id === currentUser.id);
    const sentFiles = files.filter(file => file.uploaded_by === currentUser.id);

    if (receivedFiles.length > 0) {
      const receivedHeader = document.createElement("h3");
      receivedHeader.textContent = "Received Files";
      receivedHeader.style.marginTop = "20px";
      receivedHeader.style.color = "#333";
      receivedList.appendChild(receivedHeader);

      receivedFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>${file.file_name}</strong><br />
            <small>From: ${file.sender_name} • Received: ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">Download</button>
        `;
        receivedList.appendChild(div);
      });
    }

    if (sentFiles.length > 0) {
      const sentHeader = document.createElement("h3");
      sentHeader.textContent = "Sent Files";
      sentHeader.style.marginTop = "20px";
      sentHeader.style.color = "#333";
      receivedList.appendChild(sentHeader);

      sentFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>${file.file_name}</strong><br />
            <small>Sent to: ${file.receiver_name} • ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">Download</button>
        `;
        receivedList.appendChild(div);
      });
    }

  } catch (err) {
    console.error("Unexpected error in loadReceivedFiles:", err);
    showMessage("Error loading files");
  }
}

// تحميل الملف (مبسط)
async function downloadFile(path, fileName) {
  try {
    const { data, error } = await supabase.storage.from("files").download(path);
    if (error) return showMessage("Error downloading file: " + error.message);

    const arrayBuffer = await data.arrayBuffer();

    // استخراج IV (أول 12 بايت)
    const iv = arrayBuffer.slice(0, 12);

    // استخراج المحتوى المشفر
    const encrypted = arrayBuffer.slice(12);

    // فك التشفير (تلقائي - لا يحتاج كلمة مرور)
    const blob = await encryptionSystem.decryptFile(encrypted, iv);

    // التحميل
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {
    showMessage("Error: Cannot decrypt file. Please make sure you're logged in with the correct account.");
  }
}

// =====================================================
// Logout
// =====================================================
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// =====================================================
// On page load
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // التحقق من المصادقة
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // تهيئة نظام التشفير
    await encryptionSystem.initialize();
    
    // تحميل البيانات
    await loadEmployees();
    await loadReceivedFiles();

    // إضافة مستمعات الأحداث
    document.getElementById("encryptBtn").addEventListener("click", encryptAndSendFile);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    
    // حدث لخيار "إرسال للجميع"
    document.getElementById("selectAllEmployees").addEventListener("change", function() {
      const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
        checkbox.disabled = this.checked;
      });
    });

    console.log("Dashboard initialized successfully");

  } catch (error) {
    console.error("Initialization error:", error);
    showMessage("Error initializing dashboard");
  }
});

// جعل الدوال متاحة عالمياً
window.downloadFile = downloadFile;
