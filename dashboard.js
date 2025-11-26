// --- AES Encryption Helpers (User-Specific Key) ---

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

// Generate and store user-specific AES key
async function getUserKey() {
  let keyBase64 = localStorage.getItem("user_aes_key");

  if (!keyBase64) {
    const newKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const rawKey = await crypto.subtle.exportKey("raw", newKey);
    keyBase64 = arrayBufferToBase64(rawKey);
    localStorage.setItem("user_aes_key", keyBase64);
  }

  const rawKey = base64ToArrayBuffer(keyBase64);

  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt file → returns encrypted ArrayBuffer + IV
async function encryptFile(file) {
  const key = await getUserKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM required

  const fileBuffer = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer
  );

  return { encrypted, iv };
}

// Decrypt ArrayBuffer → returns Blob
async function decryptFile(buffer, iv) {
  const key = await getUserKey();

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    buffer
  );

  return new Blob([decrypted]);
}

// Supabase setup
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


// Send file
// Send file
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

    // الحصول على اسم المستخدم الحالي من جدول employees
    const { data: currentUserData, error: userDataError } = await supabase
      .from("employees")
      .select("id, name")
      .eq("id", user.id)
      .maybeSingle(); // استخدم maybeSingle بدلاً من single

    let currentUserName = "Unknown User";
    let currentUserId = user.id;

    if (!userDataError && currentUserData) {
      currentUserName = currentUserData.name;
    } else {
      // إذا لم يتم العثور على المستخدم، حاول البحث بالإيميل
      const { data: userByEmail } = await supabase
        .from("employees")
        .select("id, name")
        .eq("email", user.email)
        .maybeSingle();
      
      if (userByEmail) {
        currentUserName = userByEmail.name;
        currentUserId = userByEmail.id;
      }
    }

    const fileName = `${Date.now()}_${file.name}`;

    // تشفير الملف
    const { encrypted, iv } = await encryptFile(file);

    // دمج IV مع البيانات المشفرة
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

    // الحصول على بيانات الموظفين المحددين
    let employeesData = [];
    if (sendToAll) {
      const { data: allEmployees, error: empError } = await supabase
        .from("employees")
        .select("id, name");
      
      if (empError) {
        showMessage("Error fetching employees: " + empError.message);
        return;
      }
      
      employeesData = allEmployees;
    } else {
      const { data: selectedEmployeesData, error: selectedError } = await supabase
        .from("employees")
        .select("id, name")
        .in("id", selectedEmployees);
      
      if (selectedError) {
        showMessage("Error fetching selected employees: " + selectedError.message);
        return;
      }
      
      employeesData = selectedEmployeesData;
    }

    // حفظ البيانات في جدول shared_files مع الأسماء
    const fileRecords = employeesData.map(employee => ({
      file_name: file.name,
      storage_path: uploadData.path,
      allowed_user_id: employee.id,
      allowed_user_name: employee.name, // اسم المستقبل
      uploaded_by: currentUserId,
      uploaded_by_name: currentUserName, // اسم المرسل
      created_at: saudi,
    }));

    // إدخال السجلات في الجدول
    const { error: dbError } = await supabase
      .from("shared_files")
      .insert(fileRecords);

    if (dbError) {
      console.error("Database error:", dbError);
      showMessage("Database error: " + dbError.message);
      await supabase.storage.from("files").remove([uploadData.path]);
      return;
    }

    showMessage(`File sent successfully to ${employeesData.length} employee(s)!`, "success");
    fileInput.value = "";
    
    // إعادة تعيين الخيارات
    selectAllCheckbox.checked = false;
    const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.disabled = false;
    });

    // إعادة تحميل الملفات
    setTimeout(() => {
      loadReceivedFiles();
    }, 1000);
  } 
  catch (err) {
    console.error("Unexpected error:", err);
    showMessage("Unexpected error: " + err.message);
  }
}

// Load received files
// Load received files - نسخة معدلة
async function loadReceivedFiles() {
  try {
    console.log("🔍 Starting loadReceivedFiles...");
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      showMessage("Please login again");
      return;
    }

    const currentUser = userData.user;
    console.log("👤 Current user ID:", currentUser.id);

    // استعلام أكثر دقة للحصول على الملفات
    const { data: files, error } = await supabase
      .from("shared_files")
      .select("*")
      .or(`allowed_user_id.eq.${currentUser.id},uploaded_by.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Error loading files:", error);
      showMessage("Error loading files: " + error.message);
      return;
    }

    console.log("📁 Files found:", files);

    const receivedList = document.getElementById("receivedList");
    receivedList.innerHTML = "";

    if (!files || files.length === 0) {
      receivedList.innerHTML = "<p>No files found.</p>";
      console.log("ℹ️ No files found for user");
      return;
    }

    // فصل الملفات المستلمة عن الملفات المرسلة
    const receivedFiles = files.filter(file => file.allowed_user_id === currentUser.id);
    const sentFiles = files.filter(file => file.uploaded_by === currentUser.id);

    console.log("📥 Received files:", receivedFiles);
    console.log("📤 Sent files:", sentFiles);

    // عرض الملفات المستلمة
    if (receivedFiles.length > 0) {
      const receivedHeader = document.createElement("h3");
      receivedHeader.textContent = "📥 Received Files";
      receivedHeader.style.marginTop = "20px";
      receivedHeader.style.color = "#333";
      receivedList.appendChild(receivedHeader);

      receivedFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>📄 ${file.file_name}</strong><br />
            <small>👤 Sent by: ${file.uploaded_by_name || 'Unknown User'} • 📅 ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">📥 Download</button>
        `;
        receivedList.appendChild(div);
      });
    } else {
      console.log("ℹ️ No received files found");
    }

    // عرض الملفات المرسلة
    if (sentFiles.length > 0) {
      const sentHeader = document.createElement("h3");
      sentHeader.textContent = "📤 Sent Files";
      sentHeader.style.marginTop = "20px";
      sentHeader.style.color = "#333";
      receivedList.appendChild(sentHeader);

      sentFiles.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
          <div>
            <strong>📄 ${file.file_name}</strong><br />
            <small>👤 Sent to: ${file.allowed_user_name || 'Unknown Employee'} • 📅 ${formatDate(file.created_at)}</small>
          </div>
          <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')">📥 Download</button>
        `;
        receivedList.appendChild(div);
      });
    } else {
      console.log("ℹ️ No sent files found");
    }

  } catch (err) {
    console.error("❌ Unexpected error in loadReceivedFiles:", err);
    showMessage("Error loading files");
  }
}
// Download file
async function downloadFile(path, fileName) {
  try {
    const { data, error } = await supabase.storage.from("files").download(path);
    if (error) return showMessage("Error downloading file: " + error.message);

    const arrayBuffer = await data.arrayBuffer();

    // Extract IV (first 12 bytes)
    const iv = arrayBuffer.slice(0, 12);

    // Extract encrypted content
    const encrypted = arrayBuffer.slice(12);

    // Decrypt
    const blob = await decryptFile(encrypted, iv);

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {
    showMessage("Decrypt error: " + err.message);
  }
}

// Logout
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// On page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    await loadEmployees();
    await loadReceivedFiles();

    // Add event listeners
    document.getElementById("encryptBtn").addEventListener("click", encryptAndSendFile);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    
    // Add event for "Send to All Employees" option
    document.getElementById("selectAllEmployees").addEventListener("change", function() {
      const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
        checkbox.disabled = this.checked;
      });
    });

  } catch (error) {
    console.error("Initialization error:", error);
    showMessage("Error initializing dashboard");
  }
});

// Make functions available globally
window.downloadFile = downloadFile;
