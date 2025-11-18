// Firebase import (إصدار 2025)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// إعداد Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDq9vPArSz4BFN3b0gNvMavSK6OpTQq9_4",
  authDomain: "cooptesttt.firebaseapp.com",
  projectId: "cooptesttt",
  storageBucket: "cooptesttt.firebasestorage.app",
  messagingSenderId: "994477108284",
  appId: "1:994477108284:web:943f9ad4c50e49ca15e739",
  measurementId: "G-VKRBBWZRBY"
};

// تهيئة التطبيق والاتصال بالقاعدة
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


function showMessage(text, type = "error") {
  const msg = document.getElementById("message");
  msg.textContent = text;
  msg.className = "message " + type;
  msg.style.display = "block";
}

// زر تسجيل الدخول
const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", loginUser);

async function loginUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    showMessage("Please enter both fields", "error");
    return;
  }

  const querySnapshot = await getDocs(collection(db, "Users"));
  let found = false;

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.username === username && data.password === password) {
      found = true;
    }
  });

  if (found) {
    showMessage("Login successful!", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
  } else {
    showMessage("Invalid username or password", "error");
  }
}
