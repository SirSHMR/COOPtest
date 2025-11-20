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

// Load employees list from employees table
async function loadEmployees() {
  const employeesList = document.getElementById('employeesList');
  employeesList.innerHTML = '';

  const { data, error } = await supabase
    .from("employees")
    .select("id, name, email");

  if (error) {
    console.error("Error loading employees:", error);
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
async function encryptAndSendFile() {
  const fileInput = document.getElementById('fileInput');
  const selectAllCheckbox = document.getElementById('selectAllEmployees');
  
  const file = fileInput.files[0];
  const sendToAll = selectAllCheckbox.checked;
  const selectedEmployees = getSelectedEmployees();

  if (!file) return showMessage("Please select a file");
  if (!sendToAll && selectedEmployees.length === 0) return showMessage("Please select at least one employee");

  try {
    const fileName = `${Date.now()}_${file.name}`;

    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("files")
      .upload(fileName, file);

    if (uploadError) {
      showMessage("Upload error: " + uploadError.message);
      return;
    }

    // Get all employees if "Send to All" is selected
    let employeeIds = [];
    if (sendToAll) {
      const { data: allEmployees, error: empError } = await supabase
        .from("employees")
        .select("id");
      
      if (empError) {
        showMessage("Error fetching employees: " + empError.message);
        return;
      }
      
      employeeIds = allEmployees.map(emp => emp.id);
    } else {
      employeeIds = selectedEmployees;
    }

    // Save data in shared_files for each employee
    const currentUser = (await supabase.auth.getUser()).data.user.id;
    const fileRecords = employeeIds.map(employeeId => ({
      file_name: file.name,
      storage_path: uploadData.path,
      allowed_user_id: employeeId,
      uploaded_by: currentUser,
      created_at: new Date(),
    }));

    const { error: dbError } = await supabase
      .from("shared_files")
      .insert(fileRecords);

    if (dbError) {
      showMessage("Database error: " + dbError.message);
      return;
    }

    showMessage(`File sent successfully to ${employeeIds.length} employee(s)!`, "success");
    fileInput.value = "";
    
    // Reset options
    selectAllCheckbox.checked = false;
    const checkboxes = document.querySelectorAll('.employee-checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
  } 
  catch (err) {
    showMessage(err.message);
  }
}

// Load received files
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

// Download file
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

// Logout
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// On page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadEmployees();
  await loadReceivedFiles();

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
});

// Make functions available for button
window.downloadFile = downloadFile;
