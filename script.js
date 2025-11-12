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

async function loginUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Please enter both fields");
    return;
  }

  const querySnapshot = await getDocs(collection(db, "employees"));
  let found = false;

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.username === username && data.password === password) {
      found = true;
    }
  });

  if (found) {
    alert("Login successful!");
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid username or password");
  }
}
