// Firebase import (الإصدار الحديث)
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

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// العناصر من الصفحة
const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");

loginBtn.addEventListener("click", loginUser);

// 🔐 دالة تسجيل الدخول
async function loginUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

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
  } catch (error) {
    console.error("Database error:", error);
    showMessage("⚠️ Error connecting to database.", "error");
  }
}

// 🎯 دالة لعرض الرسائل
function showMessage(text, type) {
  message.innerText = text;
  message.style.color = type === "success" ? "green" : "red";
  message.style.fontWeight = "bold";
}
