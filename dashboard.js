// =====================================================
// Permanent User Encryption Manager
// =====================================================

class PermanentEncryptionManager {
  constructor() {
    this.userKey = null;
    this.currentUserId = null;
  }
  
  // استخراج مفتاح دائم من بيانات المستخدم
  async getPermanentUserKey() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      this.currentUserId = user.id;
      
      // 1. استخدام مزيج من user.id و user.email لإنشاء مفتاح دائم
      const keyData = await this.derivePermanentKey(user.id, user.email);
      
      // 2. استيراده كمفتاح AES
      this.userKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        false, // ليس extractable
        ["encrypt", "decrypt"]
      );
      
      return this.userKey;
      
    } catch (error) {
      console.error("Error getting permanent key:", error);
      throw new Error("Cannot initialize encryption system");
    }
  }
  
  // اشتقاق مفتاح دائم من معرف المستخدم والبريد
  async derivePermanentKey(userId, userEmail) {
    const encoder = new TextEncoder();
    
    // 1. إنشاء مادة أولية للمفتاح
    const baseData = encoder.encode(userId + "|" + userEmail + "|" + "company_secret_salt");
    
    // 2. استخدام HKDF لاشتقاق مفتاح آمن
    // أولاً: استيراد المادة الأولية كمفتاح HMAC
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      baseData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // 3. اشتقاق المفتاح باستخدام HKDF
    const info = encoder.encode("AES-256-GCM-Encryption-Key");
    const salt = encoder.encode("company_encryption_system");
    
    // نقوم بـ HKDF يدوياً باستخدام HMAC
    // HKDF-Extract
    const prk = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      salt
    );
    
    // HKDF-Expand
    const prkKey = await crypto.subtle.importKey(
      "raw",
      prk,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    let t = new Uint8Array(0);
    const okm = new Uint8Array(32); // 256-bit for AES-256
    let offset = 0;
    
    for (let i = 1; offset < 32; i++) {
      const input = new Uint8Array(t.length + info.length + 1);
      input.set(t);
      input.set(info, t.length);
      input.set([i], t.length + info.length);
      
      const chunk = await crypto.subtle.sign(
        "HMAC",
        prkKey,
        input
      );
      
      const chunkArray = new Uint8Array(chunk);
      const toCopy = Math.min(32 - offset, chunkArray.length);
      okm.set(chunkArray.slice(0, toCopy), offset);
      offset += toCopy;
      t = chunkArray.slice(0, toCopy);
    }
    
    return okm.buffer;
  }
  
  // بديل أبسط (لكن أقل أماناً)
  async getSimplePermanentKey() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      this.currentUserId = user.id;
      
      // استخدام PBKDF2 لاشتقاق مفتاح دائم
      const encoder = new TextEncoder();
      const password = encoder.encode(user.id + ":" + user.email);
      
      // استيراد كلمة المرور
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        password,
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      
      // اشتقاق 256 بت (32 بايت) باستخدام PBKDF2
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: encoder.encode("encryption_salt"), // يمكن تغيير هذا لأمان أفضل
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        256
      );
      
      // تحويل إلى مفتاح AES
      this.userKey = await crypto.subtle.importKey(
        "raw",
        derivedBits,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
      
      return this.userKey;
      
    } catch (error) {
      console.error("Error in simple permanent key:", error);
      throw error;
    }
  }
  
  // تشفير الملف
  async encryptFile(file) {
    try {
      if (!this.userKey) {
        await this.getSimplePermanentKey();
      }
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const fileBuffer = await file.arrayBuffer();
      
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        this.userKey,
        fileBuffer
      );
      
      return { encrypted, iv };
      
    } catch (error) {
      console.error("Error encrypting file:", error);
      throw new Error("Failed to encrypt file");
    }
  }
  
  // فك تشفير الملف
  async decryptFile(buffer, iv) {
    try {
      if (!this.userKey) {
        await this.getSimplePermanentKey();
      }
      
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        this.userKey,
        buffer
      );
      
      return new Blob([decrypted]);
      
    } catch (error) {
      console.error("Error decrypting file:", error);
      throw new Error("Failed to decrypt file. Make sure you're logged in with the correct account.");
    }
  }
  
  // لا حاجة لـ clearKeys هنا لأن المفتاح مشتق دائماً من بيانات المستخدم
  async clearKeys() {
    this.userKey = null;
  }
}

// =====================================================
// Hybrid Encryption Manager (للتوافق مع الملفات القديمة والجديدة)
// =====================================================

class HybridEncryptionManager {
  constructor() {
    this.userKey = null;
    this.currentUserId = null;
    this.legacyKey = null; // للملفات القديمة
  }
  
  async initialize() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      this.currentUserId = user.id;
      
      // 1. المفتاح الدائم للملفات الجديدة
      this.userKey = await this.getPermanentKey(user.id, user.email);
      
      // 2. محاولة تحميل المفتاح القديم للملفات القديمة
      const legacyKeyData = localStorage.getItem(`legacy_key_${user.id}`);
      if (legacyKeyData) {
        try {
          const rawKey = base64ToArrayBuffer(legacyKeyData);
          this.legacyKey = await crypto.subtle.importKey(
            "raw",
            rawKey,
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
          );
        } catch (e) {
          console.warn("Could not load legacy key:", e);
        }
      }
      
      return this.userKey;
      
    } catch (error) {
      console.error("Error initializing hybrid encryption:", error);
      throw error;
    }
  }
  
  async getPermanentKey(userId, userEmail) {
    // طريقة مبسطة لكنها فعالة
    const encoder = new TextEncoder();
    
    // إنشاء مادة أولية للمفتاح
    const baseString = `${userId}:${userEmail}:permanent:encryption:key`;
    const baseData = encoder.encode(baseString);
    
    // استخدام SHA-256 ثم أخذ أول 32 بايت
    const hash = await crypto.subtle.digest("SHA-256", baseData);
    const hashArray = new Uint8Array(hash);
    
    // تأكد من أن لدينا 32 بايت للمفتاح AES-256
    const keyData = hashArray.slice(0, 32);
    
    // استيراد كمفتاح AES
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }
  
  async encryptFile(file) {
    if (!this.userKey) {
      await this.initialize();
    }
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();
    
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.userKey,
      fileBuffer
    );
    
    return { encrypted, iv };
  }
  
  async decryptFile(buffer, iv, isLegacy = false) {
    try {
      if (isLegacy && this.legacyKey) {
        // محاولة فك تشفير باستخدام المفتاح القديم
        try {
          const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            this.legacyKey,
            buffer
          );
          return new Blob([decrypted]);
        } catch (e) {
          console.warn("Legacy key failed, trying permanent key...");
        }
      }
      
      // استخدام المفتاح الدائم
      if (!this.userKey) {
        await this.initialize();
      }
      
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        this.userKey,
        buffer
      );
      
      return new Blob([decrypted]);
      
    } catch (error) {
      console.error("Decryption error:", error);
      
      // محاولة أخيرة: البحث عن المفتاح القديم في localStorage
      if (!isLegacy) {
        try {
          const legacyKeyData = localStorage.getItem(`user_aes_key`);
          if (legacyKeyData) {
            const rawKey = base64ToArrayBuffer(legacyKeyData);
            const tempKey = await crypto.subtle.importKey(
              "raw",
              rawKey,
              { name: "AES-GCM" },
              false,
              ["encrypt", "decrypt"]
            );
            
            const decrypted = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv },
              tempKey,
              buffer
            );
            
            return new Blob([decrypted]);
          }
        } catch (e) {
          console.error("Final fallback failed:", e);
        }
      }
      
      throw new Error("Cannot decrypt file. You might need the original encryption key.");
    }
  }
  
  // عند إرسال ملف جديد، حفظ المفتاح الحالي كمفتاح قديم للمستقبل
  async backupCurrentKeyAsLegacy() {
    if (this.currentUserId) {
      const legacyKeyData = localStorage.getItem(`user_aes_key`);
      if (legacyKeyData) {
        localStorage.setItem(`legacy_key_${this.currentUserId}`, legacyKeyData);
      }
    }
  }
}

// =====================================================
// Implementation in dashboard.js (الجزء المعدل فقط)
// =====================================================

// استبدال إدارة التشفير القديمة بهذه
const encryptionManager = new HybridEncryptionManager();

// باقي الدوال المساعدة كما هي...
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

// عند إرسال الملف، نضيف هذا
async function encryptAndSendFile() {
  // ... الكود الحالي ...
  
  // بعد نجاح الإرسال، احفظ نسخة احتياطية من المفتاح
  await encryptionManager.backupCurrentKeyAsLegacy();
  
  // ... باقي الكود ...
}

// عند التحميل، حاول اكتشاف نوع الملف
async function downloadFile(path, fileName) {
  try {
    const { data, error } = await supabase.storage.from("files").download(path);
    if (error) return showMessage("Error downloading file: " + error.message);

    const arrayBuffer = await data.arrayBuffer();

    // Extract IV (first 12 bytes)
    const iv = arrayBuffer.slice(0, 12);
    const encrypted = arrayBuffer.slice(12);

    // محاولة فك التشفير مع التعرف التلقائي على نوع المفتاح
    try {
      // أولاً: حاول بالمفتاح الدائم (الملفات الجديدة)
      const blob = await encryptionManager.decryptFile(encrypted, iv, false);
      
      // التحميل
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      // إذا فشل، حاول بالمفتاح القديم
      console.log("Trying legacy decryption...");
      try {
        const blob = await encryptionManager.decryptFile(encrypted, iv, true);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage("File decrypted with legacy system", "info");
        
      } catch (legacyError) {
        showMessage("Cannot decrypt file. Please contact the sender.", "error");
      }
    }

  } catch (err) {
    showMessage("Download error: " + err.message);
  }
}

// عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // التحقق من المستخدم
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // تهيئة نظام التشفير الهجين
    await encryptionManager.initialize();
    
    // تحميل البيانات
    await loadEmployees();
    await loadReceivedFiles();
    
    // ... باقي الكود كما هو ...

  } catch (error) {
    console.error("Initialization error:", error);
    showMessage("Error initializing dashboard");
  }
});
