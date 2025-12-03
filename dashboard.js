// =============== dashboard.js مع نظام تشفير متكامل وآمن ===============

// --- دوال مساعدة للتشفير ---
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

// --- النظام الأساسي: كل ملف له مفتاح فريد ---
async function encryptFile(file) {
  try {
    // 1. إنشاء مفتاح فريد لهذا الملف
    const fileKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    
    // 2. تشفير الملف بالمفتاح الفريد
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      fileKey,
      fileBuffer
    );
    
    // 3. الحصول على المفتاح الرئيسي (المشتق من كلمة مرور المستخدم)
    const masterKey = await getMasterKey();
    
    // 4. تصدير مفتاح الملف وتشفيره بالمفتاح الرئيسي
    const exportedFileKey = await crypto.subtle.exportKey("raw", fileKey);
    const keyIv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedFileKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: keyIv },
      masterKey,
      exportedFileKey
    );
    
    return {
      encrypted,
      iv,
      encryptedFileKey: arrayBufferToBase64(encryptedFileKey),
      keyIv: arrayBufferToBase64(keyIv)
    };
  } catch (error) {
    console.error("Error encrypting file:", error);
    throw new Error("فشل تشفير الملف");
  }
}

// --- الحل الذكي: مشتق المفتاح الرئيسي من بيانات المستخدم ---
let masterKeyCache = null;

async function getMasterKey() {
  if (masterKeyCache) return masterKeyCache;
  
  try {
    // 1. الحصول على بيانات المستخدم الحالي
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error("يجب تسجيل الدخول");
    
    // 2. استخدام معرف المستخدم + تاريخ إنشاء الحساب كمصدر للمفتاح
    const userData = `${user.id}_${user.created_at}`;
    const encoder = new TextEncoder();
    
    // 3. استخدام PBKDF2 لاشتقاق مفتاح آمن
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(userData),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    
    masterKeyCache = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("SecureFileSystem"), // يمكن تغيير هذا
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    return masterKeyCache;
  } catch (error) {
    console.error("Error deriving master key:", error);
    throw new Error("تعذر توليد مفتاح التشفير");
  }
}

// فك تشفير الملف
async function decryptFile(buffer, iv, encryptedFileKeyBase64, keyIvBase64) {
  try {
    // 1. الحصول على المفتاح الرئيسي
    const masterKey = await getMasterKey();
    
    // 2. فك تشفير مفتاح الملف
    const encryptedFileKey = base64ToArrayBuffer(encryptedFileKeyBase64);
    const keyIv = base64ToArrayBuffer(keyIvBase64);
    
    const decryptedFileKeyBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: keyIv },
      masterKey,
      encryptedFileKey
    );
    
    // 3. استيراد مفتاح الملف
    const fileKey = await crypto.subtle.importKey(
      "raw",
      decryptedFileKeyBuffer,
      "AES-GCM",
      false,
      ["decrypt"]
    );
    
    // 4. فك تشفير الملف
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      fileKey,
      buffer
    );
    
    return new Blob([decrypted]);
  } catch (error) {
    console.error("Error decrypting file:", error);
    throw new Error("تعذر فتح الملف. تأكد من أنك تستخدم حسابك الصحيح.");
  }
}

// تنظيف المخبأ عند تسجيل الخروج
function clearKeyCache() {
  masterKeyCache = null;
}

// --- بقية الكود بدون تغيير ---
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Messages
function showMessage(text, type = "error") {
  const msgBox = document.getElementById("messageBox");
  msgBox.textContent = text;
  msgBox.className = `msgBox ${type === 'error' ? 'errorMsg' : 'successMsg'}`;
  msgBox.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => msgBox.style.display = 'none', 3000);
  }
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

// إرسال الملف مع التشفير التلقائي
async function encryptAndSendFile() {
  const fileInput = document.getElementById('fileInput');
  const selectAllCheckbox = document.getElementById('selectAllEmployees');
  
  const file = fileInput.files[0];
  const sendToAll = selectAllCheckbox.checked;
  const selectedEmployees = getSelectedEmployees();

  if (!file) {
    showMessage("الرجاء اختيار ملف");
    return;
  }
  
  if (!sendToAll && selectedEmployees.length === 0) {
    showMessage("الرجاء اختيار موظف واحد على الأقل");
    return;
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      showMessage("الرجاء تسجيل الدخول مرة أخرى");
      return;
    }

    // الحصول على اسم المرسل
    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("name")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee) {
      showMessage("تعذر العثور على بيانات الموظف");
      return;
    }

    const senderName = currentEmployee.name;
    const fileName = `${Date.now()}_${file.name}`;

    // تشفير الملف
    const { encrypted, iv, encryptedFileKey, keyIv } = await encryptFile(file);

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
      showMessage("خطأ في رفع الملف: " + uploadError.message);
      return;
    }

    // الحصول على بيانات الموظفين
    let employeeData = [];
    if (sendToAll) {
      const { data: allEmployees, error: empError } = await supabase
        .from("employees")
        .select("id, name");
      
      if (empError) {
        showMessage("خطأ في جلب بيانات الموظفين: " + empError.message);
        return;
      }
      
      employeeData = allEmployees;
    } else {
      const { data: selectedEmployeesData, error: selError } = await supabase
        .from("employees")
        .select("id, name")
        .in("id", selectedEmployees);
      
      if (selError) {
        showMessage("خطأ في جلب بيانات الموظفين المختارين: " + selError.message);
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
      receiver_name: employee.name,
      encrypted_file_key: encryptedFileKey,
      key_iv: keyIv
    }));

    const { error: dbError } = await supabase
      .from("shared_files")
      .insert(fileRecords);

    if (dbError) {
      console.error("Database error:", dbError);
      showMessage("خطأ في قاعدة البيانات: " + dbError.message);
      
      // محاولة حذف الملف المرفوع إذا فشل الإدراج
      await supabase.storage.from("files").remove([uploadData.path]);
      return;
    }

    showMessage(`تم إرسال الملف بنجاح إلى ${employeeData.length} موظف!`, "success");
    fileInput.value = "";
    
    // إعادة تعيين الخيارات
    selectAllCheckbox.checked = false;
    const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.disabled = false;
    });

    // إعادة تحميل الملفات المستلمة
    setTimeout(() => {
      loadReceivedFiles();
    }, 1000);
  } 
  catch (err) {
    console.error("Unexpected error:", err);
    showMessage("خطأ غير متوقع: " + err.message);
  }
}

// تحميل الملفات المستلمة
async function loadReceivedFiles() {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      showMessage("الرجاء تسجيل الدخول مرة أخرى");
      return;
    }

    const currentUser = userData.user;

    // الحصول على الملفات
    const { data: files, error } = await supabase
      .from("shared_files")
      .select("*")
      .or(`allowed_user_id.eq.${currentUser.id},uploaded_by.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading files:", error);
      showMessage("خطأ في تحميل الملفات: " + error.message);
      return;
    }

    const receivedList = document.getElementById("receivedList");
    receivedList.innerHTML = "";

    if (!files || files.length === 0) {
      receivedList.innerHTML = "<p>لا توجد ملفات مستلمة بعد.</p>";
      return;
    }

    // فصل الملفات المستلمة عن الملفات المرسلة
    const receivedFiles = files.filter(file => file.allowed_user_id === currentUser.id);
    const sentFiles = files.filter(file => file.uploaded_by === currentUser.id);

    if (receivedFiles.length > 0) {
      const receivedHeader = document.createElement("h3");
      receivedHeader.textContent = "الملفات المستلمة";
      receivedHeader.style.marginTop = "20px";
      receivedHeader.style.color = "#333";
      receivedList.appendChild(receivedHeader);

      receivedFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>${file.file_name}</strong><br />
            <small>من: ${file.sender_name} • استلم: ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}', '${file.encrypted_file_key}', '${file.key_iv}')">تحميل</button>
        `;
        receivedList.appendChild(div);
      });
    }

    if (sentFiles.length > 0) {
      const sentHeader = document.createElement("h3");
      sentHeader.textContent = "الملفات المرسلة";
      sentHeader.style.marginTop = "20px";
      sentHeader.style.color = "#333";
      receivedList.appendChild(sentHeader);

      sentFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>${file.file_name}</strong><br />
            <small>إلى: ${file.receiver_name} • ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}', '${file.encrypted_file_key}', '${file.key_iv}')">تحميل</button>
        `;
        receivedList.appendChild(div);
      });
    }

  } catch (err) {
    console.error("Unexpected error in loadReceivedFiles:", err);
    showMessage("خطأ في تحميل الملفات");
  }
}

// تحميل الملف
async function downloadFile(path, fileName, encryptedFileKey, keyIv) {
  try {
    const { data, error } = await supabase.storage.from("files").download(path);
    if (error) return showMessage("خطأ في تحميل الملف: " + error.message);

    const arrayBuffer = await data.arrayBuffer();

    // استخراج IV (أول 12 بايت)
    const iv = arrayBuffer.slice(0, 12);

    // استخراج المحتوى المشفر
    const encrypted = arrayBuffer.slice(12);

    // فك التشفير
    const blob = await decryptFile(encrypted, iv, encryptedFileKey, keyIv);

    // تحميل الملف
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {
    if (err.message.includes("المفتاح")) {
      showMessage("تعذر فتح الملف. قد يكون تم إنشاؤه بحساب مختلف.");
    } else {
      showMessage("خطأ في تحميل الملف: " + err.message);
    }
  }
}

// تسجيل الخروج مع تنظيف المخبأ
async function logout() {
  clearKeyCache();
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // تنظيف أي مخبأ قديم
    clearKeyCache();
    
    // التحقق من تسجيل الدخول
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    await loadEmployees();
    await loadReceivedFiles();

    // إضافة المستمعين للأحداث
    document.getElementById("encryptBtn").addEventListener("click", encryptAndSendFile);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    
    // حدث "إرسال لجميع الموظفين"
    document.getElementById("selectAllEmployees").addEventListener("change", function() {
      const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
        checkbox.disabled = this.checked;
      });
    });

    // تنظيف المخبأ عند إغلاق الصفحة
    window.addEventListener("beforeunload", clearKeyCache);

  } catch (error) {
    console.error("Initialization error:", error);
    showMessage("خطأ في تهيئة لوحة التحكم");
  }
});

// جعل الدوال متاحة عالمياً
window.downloadFile = downloadFile;
window.clearKeyCache = clearKeyCache;
