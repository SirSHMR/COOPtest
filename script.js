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
const message = document.getElementById("message"); // عنصر عرض الرسائل في الصفحة

loginBtn.addEventListener("click", loginUser);

async function loginUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // التحقق من المدخلات
  if (!username || !password) {
    showMessage("⚠️ Please enter both username and password.", "error");
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
      showMessage("✅ Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      showMessage("❌ Invalid username or password!", "error");
    }
  } catch (err) {
    console.error("Database error:", err);
    showMessage("⚠️ Error connecting to database.", "error");
  }
}

// دالة عرض الرسائل داخل الصفحة
function showMessage(text, type) {
  message.innerText = text;
  message.style.color = type === "success" ? "green" : "red";
  message.style.fontWeight = "bold";
  message.style.marginTop = "10px";
}
