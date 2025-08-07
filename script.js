// script.js (FINAL CORRECTED VERSION)

import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
    doc, getDoc, setDoc, where, getDocsFromServer, deleteDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM Elements
const screens = document.querySelectorAll('.screen');
const getStartedBtn = document.getElementById('get-started-btn');
const googleSignInBtn = document.getElementById('google-signin-btn');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authNameInput = document.getElementById('auth-name');
const authRepeatPasswordInput = document.getElementById('auth-repeat-password');
const authSwitchLink = document.getElementById('auth-switch-link');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const nameFieldWrapper = document.getElementById('name-field-wrapper');
const repeatPasswordFieldWrapper = document.getElementById('repeat-password-field-wrapper');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchText = document.getElementById('auth-switch-text');
const authNotification = document.getElementById('auth-notification');
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
const profileNameInput = document.getElementById('profile-name-input');
const usernameExistsError = document.getElementById('username-exists-error');
const profileSaveBtn = document.getElementById('profile-save-btn');
const logoutBtn = document.getElementById('logout-btn');
const modalProfilePic = document.getElementById('modal-profile-pic');
const modalUsername = document.getElementById('modal-username');
const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const chatMessages = document.getElementById("chat-messages");
const customAlert = document.getElementById('custom-alert');
const customAlertMessage = document.getElementById('custom-alert-message');
const mainApp = document.getElementById('main-app');
const themeSwitch = document.getElementById('theme-switch');
const sidebarProfilePic = document.getElementById('sidebar-profile-pic');
const sidebarUsername = document.getElementById('sidebar-username');
const chatHistoryList = document.getElementById('chat-history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const leftSidebar = document.getElementById('left-sidebar');
const menuBtn = document.getElementById('menu-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const stopBtn = document.getElementById("stop-btn");

let currentConversationId = null;
let messagesListener = null;
let conversationsListener = null;
let isLoginMode = false;
let isAiTyping = false;
let abortController = null;

function showScreen(screenId) {
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId)?.classList.remove('hidden');
}

function showAuthNotification(errorCode) {
    let message = 'An unknown error occurred.';
    switch (errorCode) {
        case 'auth/wrong-password': message = 'Incorrect password.'; break;
        case 'auth/user-not-found': message = 'No account found with this email.'; break;
        case 'auth/email-already-in-use': message = 'This email is already registered.'; break;
        case 'auth/invalid-email': message = 'Please enter a valid email address.'; break;
        default: message = "An error occurred. Please try again.";
    }
    if (authNotification) {
        authNotification.textContent = message;
        authNotification.style.display = 'block';
        setTimeout(() => { authNotification.style.display = 'none'; }, 5000);
    }
}

function showCustomAlert(message) {
    if (!customAlert || !customAlertMessage) return;
    customAlertMessage.textContent = message;
    customAlert.classList.remove('hidden');
    setTimeout(() => { customAlert.classList.add('show'); }, 10);
    setTimeout(() => {
        customAlert.classList.remove('show');
        setTimeout(() => customAlert.classList.add('hidden'), 300);
    }, 3000);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        mainApp.classList.add('dark-mode');
        themeSwitch.checked = true;
    } else {
        mainApp.classList.remove('dark-mode');
        themeSwitch.checked = false;
    }
}

function toggleTheme() {
    const newTheme = mainApp.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('chatTheme', newTheme);
    applyTheme(newTheme);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        showScreen('main-app');
        const savedTheme = localStorage.getItem('chatTheme') || 'light';
        applyTheme(savedTheme);
        await updateUserUI(user);
        loadConversations(user.uid);
    } else {
        showScreen('splash-screen');
        if (messagesListener) messagesListener();
        if (conversationsListener) conversationsListener();
    }
});

async function updateUserUI(user) {
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const displayName = userData.displayName || user.email.split('@')[0];
    const photoURL = userData.photoURL;

    modalUsername.textContent = displayName;
    sidebarUsername.textContent = displayName;
    profileNameInput.value = displayName;

    const profilePics = [modalProfilePic, sidebarProfilePic];
    profilePics.forEach(pic => {
        if (photoURL) {
            pic.style.backgroundImage = `url(${photoURL})`;
            pic.textContent = '';
        } else {
            const initial = displayName.charAt(0).toUpperCase();
            pic.style.backgroundImage = 'none';
            const colors = ['#FF007A', '#007BFF', '#34A853', '#FBBC05', '#EA4335'];
            const colorIndex = Math.abs(displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
            pic.style.backgroundColor = colors[colorIndex];
            pic.textContent = initial;
        }
    });
}

getStartedBtn.addEventListener('click', () => {
    document.getElementById('app-container').classList.add('pan-bg');
    showScreen('auth-container');
});

googleSignInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL
            });
        }
    } catch (error) { showAuthNotification(error.code); }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, authEmailInput.value, authPasswordInput.value);
        } else {
            const name = authNameInput.value;
            const repeatPassword = authRepeatPasswordInput.value;
            if (authPasswordInput.value !== repeatPassword) { showAuthNotification("Passwords do not match!"); return; }
            if (!name) { showAuthNotification("Please enter your name!"); return; }
            const userCredential = await createUserWithEmailAndPassword(auth, authEmailInput.value, authPasswordInput.value);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                displayName: name,
                email: authEmailInput.value,
                photoURL: null
            });
        }
    } catch (error) { showAuthNotification(error.code); }
});

authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault(); isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = 'Log In'; authSubtitle.textContent = 'Welcome back!';
        nameFieldWrapper.style.display = 'none'; repeatPasswordFieldWrapper.style.display = 'none';
        authSubmitBtn.textContent = 'Log In'; authSwitchText.textContent = "Don't have an account?"; authSwitchLink.textContent = 'Register';
    } else {
        authTitle.textContent = 'Register'; authSubtitle.textContent = 'Create your account';
        nameFieldWrapper.style.display = 'block'; repeatPasswordFieldWrapper.style.display = 'block';
        authSubmitBtn.textContent = 'Register'; authSwitchText.textContent = 'I have an account?'; authSwitchLink.textContent = 'Log in';
    }
});

menuBtn.addEventListener('click', () => {
    leftSidebar.classList.add('open');
    sidebarOverlay.classList.remove('hidden');
});

sidebarOverlay.addEventListener('click', () => {
    leftSidebar.classList.remove('open');
    sidebarOverlay.classList.add('hidden');
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    leftSidebar.classList.remove('open');
    sidebarOverlay.classList.add('hidden');
});

closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
themeSwitch.addEventListener('change', toggleTheme);

profileSaveBtn.addEventListener('click', async () => {
    const newName = profileNameInput.value.trim();
    if (!newName || !auth.currentUser) return;
    const q = query(collection(db, "users"), where("displayName", "==", newName));
    const querySnapshot = await getDocsFromServer(q);
    let isTaken = false;
    querySnapshot.forEach((doc) => { if (doc.id !== auth.currentUser.uid) isTaken = true; });

    if (isTaken) {
        usernameExistsError.classList.remove('hidden');
    } else {
        usernameExistsError.classList.add('hidden');
        await setDoc(doc(db, "users", auth.currentUser.uid), { displayName: newName }, { merge: true });
        await updateUserUI(auth.currentUser);
        showCustomAlert("Username updated successfully!");
        settingsModal.classList.add('hidden');
    }
});

logoutBtn.addEventListener('click', async () => {
    settingsModal.classList.add('hidden');
    await signOut(auth);
});

sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !isAiTyping) { e.preventDefault(); handleSendMessage(); } });
newChatBtn.addEventListener('click', () => { if (auth.currentUser) startNewChat(auth.currentUser.uid); });
stopBtn.addEventListener('click', () => {
    if (abortController) {
        abortController.abort();
    }
});

function loadConversations(userId) {
    const convRef = collection(db, `users/${userId}/conversations`);
    const q = query(convRef, orderBy('timestamp', 'desc'));
    conversationsListener = onSnapshot(q, (snapshot) => {
        chatHistoryList.innerHTML = '';
        if (snapshot.empty) {
            startNewChat(userId);
            return;
        }
        snapshot.forEach(doc => {
            const conversation = doc.data();
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.id = doc.id;
            if (doc.id === currentConversationId) {
                historyItem.classList.add('active');
            }
            const name = document.createElement('span');
            name.className = 'history-item-name';
            name.textContent = conversation.title || 'New Chat';
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-history-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Delete this chat forever?')) {
                    deleteConversation(userId, doc.id);
                }
            };
            historyItem.appendChild(name);
            historyItem.appendChild(deleteBtn);
            historyItem.onclick = () => {
                loadChat(userId, doc.id);
                leftSidebar.classList.remove('open');
                sidebarOverlay.classList.add('hidden');
            };
            chatHistoryList.appendChild(historyItem);
        });
        if (!currentConversationId || !document.querySelector(`.history-item.active`)) {
            const firstChatId = snapshot.docs[0].id;
            loadChat(userId, firstChatId);
        }
    });
}

function loadChat(userId, conversationId) {
    if (messagesListener) messagesListener();
    currentConversationId = conversationId;
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === conversationId);
    });
    const messagesRef = collection(db, `users/${userId}/conversations/${conversationId}/messages`);
    const q = query(messagesRef, orderBy('timestamp'));

    messagesListener = onSnapshot(q, (snapshot) => {
        if (isAiTyping) { return; }
        if (snapshot.empty) {
            displayInitialPrompts(); return;
        }
        chatMessages.innerHTML = '';
        snapshot.forEach(doc => {
            appendMessageToUI(doc.data().role, doc.data().content);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

async function startNewChat(userId) {
    const newConvRef = await addDoc(collection(db, `users/${userId}/conversations`), {
        title: 'New Chat',
        timestamp: serverTimestamp()
    });
    loadChat(userId, newConvRef.id);
}

async function deleteConversation(userId, conversationId) {
    await deleteDoc(doc(db, `users/${userId}/conversations`, conversationId));
    currentConversationId = null;
    chatHistoryList.innerHTML = '';
}

function displayInitialPrompts() {
    chatMessages.innerHTML = `
        <div class="initial-prompts-container">
            <div class="ai-assistant-tag">AI assistant</div>
            <h2>Greetings, human!<br>How may I assist you today?</h2>
            <div class="prompt-grid">
                <button class="prompt-btn"><span>📝</span> Write an email</button>
                <button class="prompt-btn"><span>😂</span> Tell me a fun fact</button>
                <button class="prompt-btn"><span>💡</span> Give me ideas</button>
                <button class="prompt-btn"><span>🎓</span> Help me study</button>
                <button class="prompt-btn"><span>✈️</span> Plan a trip</button>
                <button class="prompt-btn"><span>🌍</span> Quiz me on world</button>
            </div>
        </div>`;
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const textOnly = btn.textContent.trim().replace(/^[^\s]+/, '').trim();
            userInput.value = textOnly;
            handleSendMessage();
        });
    });
}

function createMessageDiv(role, content = '') {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}-message`;
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.innerHTML = marked.parse(content);
    messageDiv.appendChild(contentDiv);
    return messageDiv;
}

function appendMessageToUI(role, content) {
    const messageDiv = createMessageDiv(role, content);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// <<< YAHAN PAR BADLAAV KIYA GAYA HAI (ARGUMENTS KA ORDER SAHI KIYA GAYA)
async function saveMessage(userId, conversationId, role, content) {
    if (!userId || !conversationId || !content) return;
    const messagesRef = collection(db, `users/${userId}/conversations/${conversationId}/messages`);
    await addDoc(messagesRef, { 
        role, 
        content, 
        timestamp: serverTimestamp() 
    });
}

async function handleSendMessage() {
    const user = auth.currentUser;
    const messageText = userInput.value.trim();
    if (!messageText || !user || !currentConversationId || isAiTyping) return;

    if (chatMessages.querySelector('.initial-prompts-container')) {
        chatMessages.innerHTML = '';
    }
    
    const currentMessageText = messageText;
    userInput.value = "";
    
    appendMessageToUI("user", currentMessageText);
    await saveMessage(user.uid, currentConversationId, "user", currentMessageText);
    
    const convDocRef = doc(db, `users/${user.uid}/conversations`, currentConversationId);
    const convDoc = await getDoc(convDocRef);
    if (convDoc.exists() && convDoc.data().title === 'New Chat') {
        await setDoc(convDocRef, { title: currentMessageText.substring(0, 30) }, { merge: true });
    }

    const messagesRef = collection(db, `users/${user.uid}/conversations/${currentConversationId}/messages`);
    const q = query(messagesRef, orderBy("timestamp"));
    const querySnapshot = await getDocs(q);
    const historyForAI = querySnapshot.docs.map(doc => doc.data());

    sendBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    isAiTyping = true;

    const aiMessageContainer = createMessageDiv("ai");
    chatMessages.appendChild(aiMessageContainer);
    const aiMessageContent = aiMessageContainer.querySelector('.message-content');
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let fullResponse = "";
    abortController = new AbortController();

    try {
        const response = await fetch('https://grovixia-ai.onrender.com/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: historyForAI }),
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error("Response body is missing.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const dataStr = line.substring(5).trim();
                    if (dataStr === '{"event": "done"}') continue;
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.content) {
                            fullResponse += data.content;
                            const cursorSpan = '<span class="typing-cursor">|</span>';
                            aiMessageContent.innerHTML = marked.parse(fullResponse + cursorSpan);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        // Incomplete JSON chunks can be ignored
                    }
                }
            }
        }
        
        aiMessageContent.innerHTML = marked.parse(fullResponse);
        // Poora message aane ke baad hi usko save karein
        if(fullResponse.trim()){
            await saveMessage(user.uid, currentConversationId, "ai", fullResponse);
        }

    } catch (err) {
        if (err.name === 'AbortError') {
            const stopMessage = "\n\n*(Generation stopped.)*";
            fullResponse += stopMessage;
            aiMessageContent.innerHTML = marked.parse(fullResponse);
            if(fullResponse.trim()){
                await saveMessage(user.uid, currentConversationId, "ai", fullResponse);
            }
        } else {
            aiMessageContent.innerHTML = `<p style="color:red;">⚠️ Error: Could not connect to AI. Please try again.</p>`;
            console.error("Fetch error:", err);
        }
    } finally {
        isAiTyping = false;
        sendBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        userInput.focus();
        abortController = null;
        loadChat(user.uid, currentConversationId);
    }
}