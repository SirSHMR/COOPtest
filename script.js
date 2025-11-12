// Firebase import (إصدار 2025)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعداد Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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
