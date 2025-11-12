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

// زر تسجيل الدخول
const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", loginUser);

// دالة عرض الإشعارات
function showNotification(message, type = 'error') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  // إظهار الإشعار
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

async function loginUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    showNotification("Please enter both fields", "warning");
    return;
  }

  try {
    const querySnapshot = await getDocs(collection(db, "Users"));
    let found = false;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.username === username && data.password === password) {
        found = true;
      }
    });

    if (found) {
      showNotification("Login successful! Redirecting...", "success");
      // الانتقال بعد ثانيتين لرؤية الرسالة
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 2000);
    } else {
      showNotification("Invalid username or password", "error");
    }
  } catch (error) {
    showNotification("Network error. Please try again.", "error");
    console.error("Login error:", error);
  }
}
