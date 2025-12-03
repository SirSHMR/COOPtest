// --- Encryption Manager (سهل الاستخدام) ---

class SimpleEncryptionManager {
  constructor() {
    this.userKey = null;
  }
  
  // الحصول على مفتاح المستخدم (يتم مرة واحدة عند تسجيل الدخول)
  async initializeUserEncryption() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // 1. تحقق من وجود مفتاح في sessionStorage
      const storedKey = sessionStorage.getItem(`user_key_${user.id}`);
      
      if (storedKey) {
        // 2. تحميل المفتاح الموجود
        const rawKey = base64ToArrayBuffer(storedKey);
        this.userKey = await crypto.subtle.importKey(
          "raw",
          rawKey,
          "AES-GCM",
          false,
          ["encrypt", "decrypt"]
        );
        return this.userKey;
      }
      
      // 3. إنشاء مفتاح جديد من معرف المستخدم
      const encoder = new TextEncoder();
      const userData = encoder.encode(user.id + user.email);
      
      // اشتقاق مفتاح من بيانات المستخدم
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        userData,
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      
      // استخدام salt مشتق من user_id
      const salt = encoder.encode(user.id).slice(0, 16);
      
      this.userKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      
      // 4. تخزين المفتاح في sessionStorage
      const rawKey = await crypto.subtle.exportKey("raw", this.userKey);
      sessionStorage.setItem(`user_key_${user.id}`, arrayBufferToBase64(rawKey));
      
      return this.userKey;
      
    } catch (error) {
      console.error("Error initializing encryption:", error);
      return null;
    }
  }
  
  // تشفير الملف
  async encryptFile(file) {
    if (!this.userKey) {
      await this.initializeUserEncryption();
    }
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();
    
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
      await this.initializeUserEncryption();
    }
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.userKey,
      buffer
    );
    
    return new Blob([decrypted]);
  }
  
  // مسح المفاتيح عند تسجيل الخروج
  clearKeys() {
    this.userKey = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      sessionStorage.removeItem(`user_key_${user.id}`);
    }
  }
}

// إنشاء مدير التشفير العالمي
const encryptionManager = new SimpleEncryptionManager();

// =====================================================
// Supabase setup (متبقي كما هو)
// =====================================================
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// الوظائف الرئيسية (معدلة قليلاً)
// =====================================================

// إرسال الملف (بسيط جداً)
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
    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("name")
      .eq("id", user.id)
      .single();

    const senderName = currentEmployee?.name || user.email;
    const fileName = `${Date.now()}_${file.name}`;

    showMessage("Encrypting and sending file...", "info");

    // التشفير التلقائي (لا حاجة لكلمة مرور)
    const { encrypted, iv } = await encryptionManager.encryptFile(file);

    // دمج IV + البيانات المشفرة
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    // رفع الملف
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
      const { data: allEmployees } = await supabase
        .from("employees")
        .select("id, name");
      employeeData = allEmployees || [];
    } else {
      const { data: selectedEmployeesData } = await supabase
        .from("employees")
        .select("id, name")
        .in("id", selectedEmployees);
      employeeData = selectedEmployeesData || [];
    }

    // حفظ البيانات في قاعدة البيانات
    const fileRecords = employeeData.map(employee => ({
      file_name: file.name,
      storage_path: uploadData.path,
      allowed_user_id: employee.id,
      uploaded_by: user.id,
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
      await supabase.storage.from("files").remove([uploadData.path]);
      return;
    }

    showMessage(`File sent successfully to ${employeeData.length} employee(s)!`, "success");
    
    // إعادة تعيين النموذج
    fileInput.value = "";
    selectAllCheckbox.checked = false;
    document.querySelectorAll('.employee-checkbox input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.disabled = false;
    });

    // إعادة تحميل الملفات
    setTimeout(loadReceivedFiles, 1000);
    
  } catch (err) {
    console.error("Error:", err);
    showMessage("Error: " + err.message);
  }
}

// تحميل الملفات المستلمة
async function loadReceivedFiles() {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const currentUser = userData.user;

    const { data: files } = await supabase
      .from("shared_files")
      .select("*")
      .or(`allowed_user_id.eq.${currentUser.id},uploaded_by.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    const receivedList = document.getElementById("receivedList");
    receivedList.innerHTML = "";

    if (!files?.length) {
      receivedList.innerHTML = "<p>No files received yet.</p>";
      return;
    }

    // عرض الملفات المستلمة
    const receivedFiles = files.filter(f => f.allowed_user_id === currentUser.id);
    const sentFiles = files.filter(f => f.uploaded_by === currentUser.id);

    if (receivedFiles.length) {
      const header = document.createElement("h3");
      header.textContent = "Received Files";
      receivedList.appendChild(header);

      receivedFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>${file.file_name}</strong><br />
            <small>From: ${file.sender_name} • ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">Download</button>
        `;
        receivedList.appendChild(div);
      });
    }

    if (sentFiles.length) {
      const header = document.createElement("h3");
      header.textContent = "Sent Files";
      receivedList.appendChild(header);

      sentFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>${file.file_name}</strong><br />
            <small>To: ${file.receiver_name} • ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">Download</button>
        `;
        receivedList.appendChild(div);
      });
    }

  } catch (err) {
    console.error("Error loading files:", err);
    showMessage("Error loading files");
  }
}

// تحميل الملف (بسيط)
async function downloadFile(path, fileName) {
  try {
    const { data, error } = await supabase.storage.from("files").download(path);
    if (error) return showMessage("Download error: " + error.message);

    const arrayBuffer = await data.arrayBuffer();
    
    // استخراج IV والبيانات المشفرة
    const iv = arrayBuffer.slice(0, 12);
    const encrypted = arrayBuffer.slice(12);
    
    // فك التشفير التلقائي
    const blob = await encryptionManager.decryptFile(encrypted, iv);
    
    // التحميل
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    
  } catch (err) {
    showMessage("Error: " + err.message);
  }
}

// تسجيل الخروج
async function logout() {
  await encryptionManager.clearKeys();
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // التحقق من المستخدم
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // تهيئة نظام التشفير (مرة واحدة)
    await encryptionManager.initializeUserEncryption();
    
    // تحميل البيانات
    await loadEmployees();
    await loadReceivedFiles();

    // إضافة مستمعات الأحداث
    document.getElementById("encryptBtn").addEventListener("click", encryptAndSendFile);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    
    document.getElementById("selectAllEmployees").addEventListener("change", function() {
      document.querySelectorAll('.employee-checkbox input[type="checkbox"]').forEach(cb => {
        cb.checked = this.checked;
        cb.disabled = this.checked;
      });
    });

  } catch (error) {
    console.error("Initialization error:", error);
    showMessage("Error initializing dashboard");
  }
});

// باقي الدوال المساعدة تبقى كما هي...
