// Supabase setup
const SUPABASE_URL = "https://fucddnhmxhskmzmhmzyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2RkbmhteGhza216bWhtenl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzcyMjUsImV4cCI6MjA3OTA1MzIyNX0.TvLGcHwQGNWxfBb54A3Z-3s9bFEHiLPBBHPzqOuoqeo";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// دالة لعرض الرسائل
function showMessage(text, type = "error") {
  const msgBox = document.getElementById("messageBox");
  if (!msgBox) return;
  
  msgBox.textContent = text;
  msgBox.className = `msgBox ${type === 'error' ? 'errorMsg' : 'successMsg'}`;
  msgBox.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      msgBox.style.display = 'none';
    }, 3000);
  }
}

// دالة جلب الموظفين من Supabase
async function loadEmployees() {
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error loading employees:', error);
      return;
    }

    const select = document.getElementById('allowedUser');
    
    // إفراغ القائمة أولاً
    select.innerHTML = '<option value="">Select Employee</option>';
    
    // إضافة الموظفين للقائمة
    users.users.forEach(user => {
      if (user.email) {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.email;
        select.appendChild(option);
      }
    });
    
  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

// دالة تشفير وإرسال الملف
async function encryptAndSendFile() {
  const fileInput = document.getElementById('fileInput');
  const allowedUserSelect = document.getElementById('allowedUser');
  
  const file = fileInput.files[0];
  const allowedUserId = allowedUserSelect.value;

  if (!file) {
    showMessage('Please select a file', 'error');
    return;
  }

  if (!allowedUserId) {
    showMessage('Please select an employee', 'error');
    return;
  }

  try {
    // رفع الملف إلى Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files') // تأكد من أن هذا الـ bucket موجود في Supabase
      .upload(fileName, file);

    if (uploadError) {
      showMessage('Error uploading file: ' + uploadError.message, 'error');
      return;
    }

    // حفظ معلومات الملف في قاعدة البيانات
    const { data: fileData, error: dbError } = await supabase
      .from('shared_files') // تأكد من أن هذه الجدول موجود
      .insert([
        {
          file_name: file.name,
          storage_path: uploadData.path,
          allowed_user_id: allowedUserId,
          uploaded_by: (await supabase.auth.getUser()).data.user.id,
          created_at: new Date()
        }
      ]);

    if (dbError) {
      showMessage('Error saving file info: ' + dbError.message, 'error');
      return;
    }

    showMessage('File sent successfully!', 'success');
    fileInput.value = ''; // مسح حقل الملف
    
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
}

// دالة جلب الملفات المستلمة
async function loadReceivedFiles() {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    
    const { data: files, error } = await supabase
      .from('shared_files')
      .select('*')
      .eq('allowed_user_id', currentUser.id);

    if (error) {
      console.error('Error loading files:', error);
      return;
    }

    const receivedList = document.getElementById('receivedList');
    receivedList.innerHTML = '';

    if (files.length === 0) {
      receivedList.innerHTML = '<p>No files received yet.</p>';
      return;
    }

    files.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <strong>${file.file_name}</strong><br>
        <small>Received: ${new Date(file.created_at).toLocaleDateString()}</small>
        <button onclick="downloadFile('${file.storage_path}', '${file.file_name}')" style="margin-top: 5px;">Download</button>
      `;
      receivedList.appendChild(fileItem);
    });

  } catch (error) {
    console.error('Error loading received files:', error);
  }
}

// دالة تحميل الملف
async function downloadFile(storagePath, fileName) {
  try {
    const { data, error } = await supabase.storage
      .from('files')
      .download(storagePath);

    if (error) {
      showMessage('Error downloading file: ' + error.message, 'error');
      return;
    }

    // إنشاء رابط تحميل
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    showMessage('Error downloading file: ' + error.message, 'error');
  }
}

// دالة تسجيل الخروج
async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async function() {
  // تحميل قائمة الموظفين
  await loadEmployees();
  
  // تحميل الملفات المستلمة
  await loadReceivedFiles();
  
  // إضافة event listeners
  document.getElementById('encryptBtn').addEventListener('click', encryptAndSendFile);
  document.getElementById('logoutBtn').addEventListener('click', logout);
});

// جعل الدوال متاحة globally للاستخدام في الأحداث
window.downloadFile = downloadFile;
