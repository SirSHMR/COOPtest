// Firebase import (إصدار 2025)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعداد Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCLdZaRoM241fDHp9f3GlkSY2CiZLzGYZA",
  authDomain: "coopdatabase-f97ed.firebaseapp.com",
  projectId: "coopdatabase-f97ed",
  storageBucket: "coopdatabase-f97ed.firebasestorage.app",
  messagingSenderId: "220178541017",
  appId: "1:220178541017:web:9e5bf209aec918a19791c8",
  measurementId: "G-FTZHG0RRVY"
};

// تهيئة التطبيق والاتصال بالقاعدة
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// عناصر DOM
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

// زر تسجيل الدخول
loginBtn.addEventListener("click", loginUser);

// السماح بالدخول بالضغط على Enter
usernameInput.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    loginUser();
  }
});

passwordInput.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    loginUser();
  }
});

// دالة عرض الإشعارات
function showNotification(message, type = 'error') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  // إظهار الإشعار بسلاسة
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // إخفاء الإشعار تلقائياً بعد 4 ثواني
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.style.display = 'none';
    }, 300);
  }, 4000);
}

// دالة تغيير حالة زر الدخول
function setLoginButtonState(isLoading) {
  if (isLoading) {
    loginBtn.innerHTML = '<div class="loading"></div> Signing in...';
    loginBtn.disabled = true;
  } else {
    loginBtn.innerHTML = 'Login';
    loginBtn.disabled = false;
  }
}

// دالة التحقق من صحة المدخلات
function validateInputs(username, password) {
  if (!username || !password) {
    showNotification("Please enter both username and password", "warning");
    return false;
  }
  
  if (username.length < 3) {
    showNotification("Username must be at least 3 characters", "warning");
    return false;
  }
  
  if (password.length < 4) {
    showNotification("Password must be at least 4 characters", "warning");
    return false;
  }
  
  return true;
}

// دالة تسجيل الدخول الرئيسية
async function loginUser() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // التحقق من المدخلات
  if (!validateInputs(username, password)) {
    return;
  }

  // عرض حالة التحميل
  setLoginButtonState(true);

  try {
    // جلب بيانات المستخدمين من Firebase
    const querySnapshot = await getDocs(collection(db, "Users"));
    let found = false;
    let userData = null;

    // البحث عن المستخدم
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.username === username && data.password === password) {
        found = true;
        userData = data;
      }
    });

    if (found) {
      showNotification("Login successful! Redirecting to dashboard...", "success");
      
      // حفظ بيانات المستخدم في localStorage (اختياري)
      localStorage.setItem('currentUser', JSON.stringify({
        username: userData.username,
        loginTime: new Date().toISOString()
      }));
      
      // الانتقال بعد ثانيتين لرؤية الرسالة
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 2000);
    } else {
      showNotification("Invalid username or password", "error");
      // اهتزاز الحقول في حالة الخطأ
      usernameInput.style.borderColor = '#dc3545';
      passwordInput.style.borderColor = '#dc3545';
      setTimeout(() => {
        usernameInput.style.borderColor = '';
        passwordInput.style.borderColor = '';
      }, 2000);
    }
  } catch (error) {
    console.error("Login error:", error);
    showNotification("Network error. Please check your connection and try again.", "error");
  } finally {
    // إعادة زر الدخول إلى حالته الطبيعية
    setLoginButtonState(false);
  }
}

// إظهار رسالة ترحيب عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    showNotification("Welcome! Please login to continue", "info");
  }, 1000);
  
  // التركيز على حقل اسم المستخدم تلقائياً
  usernameInput.focus();
});

// دالة مساعدة لإعادة تعيين النموذج
function resetForm() {
  usernameInput.value = '';
  passwordInput.value = '';
  usernameInput.focus();
}

// يمكنك إضافة هذا لزر الاختبار إذا أردت
// setTimeout(() => {
//   // إضافة زر اختبار (للتطوير فقط)
//   const testBtn = document.createElement('button');
//   testBtn.textContent = 'Fill Test Data';
//   testBtn.style.marginTop = '10px';
//   testBtn.style.background = '#28a745';
//   testBtn.onclick = function() {
//     usernameInput.value = 'testuser';
//     passwordInput.value = 'testpass';
//   };
//   document.querySelector('.login-box').appendChild(testBtn);
// }, 1000);
