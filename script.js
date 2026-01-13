import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    signInAnonymously 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    push, 
    onChildAdded, 
    serverTimestamp,
    set,
    get
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { 
    getStorage, 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyAMMS8UccAPP4_4517ehfS2paPYEPJ7nbw",
    authDomain: "tradingchatapp.firebaseapp.com",
    databaseURL: "https://tradingchatapp-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tradingchatapp",
    storageBucket: "tradingchatapp.firebasestorage.app",
    messagingSenderId: "826334456372",
    appId: "1:826334456372:web:4f99b76fe47328d3e4b861",
    measurementId: "G-VFQVMQR80S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

let currentUser = null;

const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '🥴', '😠', '😡', '🤬', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'];

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
};

window.showSection = function(sectionName) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const homeSection = document.getElementById('homeSection');
    if (homeSection) homeSection.classList.remove('active');
    
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    if (sectionName === 'chat') {
        loadChatMessages();
    }
    
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
};

window.logout = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        signOut(auth).then(() => {
            alert('تم تسجيل الخروج بنجاح');
            location.reload();
        }).catch((error) => {
            console.error('Error signing out:', error);
            alert('حدث خطأ أثناء تسجيل الخروج');
        });
    }
};

window.saveProfile = function() {
    if (!currentUser) return;
    
    const displayName = document.getElementById('displayName').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    
    const userRef = ref(database, `users/${currentUser.uid}`);
    set(userRef, {
        displayName: displayName || 'مستخدم',
        username: username || 'user',
        email: email || '',
        photoURL: currentUser.photoURL || 'https://via.placeholder.com/150',
        updatedAt: serverTimestamp()
    }).then(() => {
        alert('تم حفظ التغييرات بنجاح');
        updateUserInterface();
    }).catch((error) => {
        console.error('Error saving profile:', error);
        alert('حدث خطأ أثناء حفظ التغييرات');
    });
};

document.getElementById('photoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && currentUser) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const imageRef = storageRef(storage, `profile_photos/${currentUser.uid}/${Date.now()}_${file.name}`);
            uploadBytes(imageRef, file).then((snapshot) => {
                return getDownloadURL(snapshot.ref);
            }).then((downloadURL) => {
                document.getElementById('profileImage').src = downloadURL;
                document.getElementById('headerProfileImg').src = downloadURL;
                document.getElementById('sidebarProfileImg').src = downloadURL;
                
                const userRef = ref(database, `users/${currentUser.uid}`);
                return get(userRef).then((snapshot) => {
                    const userData = snapshot.val() || {};
                    return set(userRef, {
                        ...userData,
                        photoURL: downloadURL,
                        updatedAt: serverTimestamp()
                    });
                });
            }).then(() => {
                alert('تم تحديث الصورة بنجاح');
            }).catch((error) => {
                console.error('Error uploading photo:', error);
                alert('حدث خطأ أثناء رفع الصورة');
            });
        };
        reader.readAsDataURL(file);
    }
});

window.sendMessage = function() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && currentUser) {
        const messagesRef = ref(database, 'messages');
        push(messagesRef, {
            text: message,
            userId: currentUser.uid,
            username: currentUser.displayName || 'مستخدم',
            photoURL: currentUser.photoURL || 'https://via.placeholder.com/40',
            timestamp: serverTimestamp()
        }).then(() => {
            messageInput.value = '';
        }).catch((error) => {
            console.error('Error sending message:', error);
            alert('حدث خطأ أثناء إرسال الرسالة');
        });
    }
};

document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        window.sendMessage();
    }
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && currentUser) {
        const imageRef = storageRef(storage, `chat_images/${currentUser.uid}/${Date.now()}_${file.name}`);
        uploadBytes(imageRef, file).then((snapshot) => {
            return getDownloadURL(snapshot.ref);
        }).then((downloadURL) => {
            const messagesRef = ref(database, 'messages');
            return push(messagesRef, {
                imageURL: downloadURL,
                userId: currentUser.uid,
                username: currentUser.displayName || 'مستخدم',
                photoURL: currentUser.photoURL || 'https://via.placeholder.com/40',
                timestamp: serverTimestamp()
            });
        }).then(() => {
            e.target.value = '';
        }).catch((error) => {
            console.error('Error uploading image:', error);
            alert('حدث خطأ أثناء رفع الصورة');
        });
    }
});

window.toggleEmojiPicker = function() {
    const emojiPicker = document.getElementById('emojiPicker');
    emojiPicker.classList.toggle('active');
};

function initEmojiPicker() {
    const emojiGrid = document.querySelector('.emoji-grid');
    emojis.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'emoji-item';
        emojiItem.textContent = emoji;
        emojiItem.onclick = function() {
            const messageInput = document.getElementById('messageInput');
            messageInput.value += emoji;
            messageInput.focus();
        };
        emojiGrid.appendChild(emojiItem);
    });
}

function loadChatMessages() {
    const messagesRef = ref(database, 'messages');
    const chatMessages = document.getElementById('chatMessages');
    
    onChildAdded(messagesRef, (snapshot) => {
        const messageData = snapshot.val();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        if (messageData.text === 'SYSTEM_WELCOME') {
            messageDiv.innerHTML = `
                <div class="message-content system">
                    مرحباً بك في غرفة الدردشة! نتمنى لك تجربة تداول موفقة
                </div>
            `;
        } else {
            const messageTime = messageData.timestamp ? new Date(messageData.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'الآن';
            
            messageDiv.innerHTML = `
                <div class="message-header">
                    <img src="${messageData.photoURL}" alt="Avatar" class="message-avatar">
                    <span class="message-username">${messageData.username}</span>
                    <span class="message-time">${messageTime}</span>
                </div>
                <div class="message-content">
                    ${messageData.text ? `<p>${escapeHtml(messageData.text)}</p>` : ''}
                    ${messageData.imageURL ? `<img src="${messageData.imageURL}" alt="Image" class="message-image">` : ''}
                </div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateUserInterface() {
    if (currentUser) {
        get(ref(database, `users/${currentUser.uid}`)).then((snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                const displayName = userData.displayName || 'مستخدم';
                const photoURL = userData.photoURL || 'https://via.placeholder.com/150';
                const email = userData.email || currentUser.email || '';
                
                document.getElementById('sidebarUsername').textContent = displayName;
                document.getElementById('sidebarEmail').textContent = email;
                document.getElementById('sidebarProfileImg').src = photoURL;
                document.getElementById('headerProfileImg').src = photoURL;
                document.getElementById('profileImage').src = photoURL;
                
                document.getElementById('displayName').value = displayName;
                document.getElementById('username').value = userData.username || '';
                document.getElementById('email').value = email;
                
                currentUser.displayName = displayName;
                currentUser.photoURL = photoURL;
            }
        });
    }
}

document.getElementById('overlay').addEventListener('click', function() {
    window.toggleSidebar();
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateUserInterface();
        
        get(ref(database, `users/${user.uid}`)).then((snapshot) => {
            if (!snapshot.exists()) {
                set(ref(database, `users/${user.uid}`), {
                    displayName: 'مستخدم جديد',
                    username: `user${Date.now()}`,
                    email: user.email || '',
                    photoURL: 'https://via.placeholder.com/150',
                    createdAt: serverTimestamp()
                }).then(() => {
                    updateUserInterface();
                });
            }
        });
    } else {
        signInAnonymously(auth).catch((error) => {
            console.error('Error signing in anonymously:', error);
        });
    }
});

initEmojiPicker();

const homeSection = document.getElementById('homeSection');
if (homeSection) {
    homeSection.classList.add('active');
}