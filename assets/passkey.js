// assets/js/passkey.js

function base64urlToArrayBuffer(base64url) {
    const base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(base64url.length + (4 - base64url.length % 4) % 4, '=');

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}


// Your API base URL – adjust if needed
const API_BASE = 'https://internal-api.sangeeth47.in/api/passkey';

// ------------------------------------------------------------------
// Helpers – reuse your existing token/user storage
// ------------------------------------------------------------------
function getAuthToken() {
    return localStorage.getItem('fuelTrackerToken');
}

function getCurrentUser() {
    const userJson = localStorage.getItem('fuelTrackerUser');
    return userJson ? JSON.parse(userJson) : null;
}

// ------------------------------------------------------------------
// 1. Enable Passkey (called after password login)
// ------------------------------------------------------------------
async function enablePasskey() {
    const user = getCurrentUser();
    const token = getAuthToken();

    if (!user || !token) {
        showToast('Please log in first', 'error');
        return;
    }

    try {
        const optionsRes = await fetch(`${API_BASE}/generateRegistration`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!optionsRes.ok) throw new Error('Failed to get registration options');

        const options = await optionsRes.json();

        // ✅ DO NOT MODIFY options
        const attResp = await SimpleWebAuthnBrowser.startRegistration(options);

        const verifyRes = await fetch(`${API_BASE}/verifyRegistration`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ registrationResponse: attResp })
        });

        const result = await verifyRes.json();

        if (result.verified) {
            showToast('Passkey enabled', 'success');
        } else {
            showToast('Failed to enable passkey', 'error');
        }

    } catch (error) {
        console.error('Registration error:', error);
        showToast('Error enabling passkey', 'error');
    }
}

// ------------------------------------------------------------------
// 2. Conditional UI – triggered when username field is focused/typed
// ------------------------------------------------------------------
let conditionalUiActive = false;
let passkeyAttempts = 0;
let forcePasskeyRetry = false;
const MAX_PASSKEY_ATTEMPTS = 1;

async function setupConditionalUI() {
    if (!forcePasskeyRetry && passkeyAttempts >= MAX_PASSKEY_ATTEMPTS) {
        updatePasskeyButtonVisibility();
        return;
    }

    forcePasskeyRetry = false;

    if (!window.PublicKeyCredential || !PublicKeyCredential.isConditionalMediationAvailable) {
        return;
    }

    const available = await PublicKeyCredential.isConditionalMediationAvailable();
    if (!available) return;

    if (conditionalUiActive) return;
    conditionalUiActive = true;

    try {
        const optionsRes = await fetch(`${API_BASE}/generateAuthChallenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conditional: true })
        });

        const options = await optionsRes.json();

        const authResp = await SimpleWebAuthnBrowser.startAuthentication(options);

        if (!authResp) return;

        const verifyRes = await fetch(`${API_BASE}/verifyAuthentication`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authenticationResponse: authResp })
        });

        const result = await verifyRes.json();

        if (result.verified && result.token) {
            passkeyAttempts = 0;
            updatePasskeyButtonVisibility();

            if (typeof window.onPasskeyLogin === 'function') {
                window.onPasskeyLogin(result);
            }
        }

    } catch (error) {
        passkeyAttempts++;
        updatePasskeyButtonVisibility();

        console.log('Conditional UI dismissed:', error);

    } finally {
        conditionalUiActive = false;
    }
}

function updatePasskeyButtonVisibility() {
    const btn = document.getElementById('passkey-login-btn');
    if (!btn) return;

    // Show button only when auto passkey is disabled
    if (passkeyAttempts >= MAX_PASSKEY_ATTEMPTS) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

const passkeyLoginBtn = document.getElementById('passkey-login-btn');

if (passkeyLoginBtn) {
    passkeyLoginBtn.addEventListener('click', () => {
        passkeyAttempts = 0;
        forcePasskeyRetry = true;

        updatePasskeyButtonVisibility(); // hide again immediately
        setupConditionalUI();
    });
}

// ------------------------------------------------------------------
// 3. Manual Passkey Login (optional – can be triggered by a button)
// ------------------------------------------------------------------
async function loginWithPasskey() {
    const username = document.getElementById('login-username').value.trim();

    if (!username) {
        showToast('Enter username', 'error');
        return;
    }

    try {
        const optionsRes = await fetch(`${API_BASE}/generateAuthChallenge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const options = await optionsRes.json();

        // DO NOT MODIFY options
        const authResp = await SimpleWebAuthnBrowser.startAuthentication(options);

        const verifyRes = await fetch(`${API_BASE}/verifyAuthentication`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                authenticationResponse: authResp
            })
        });

        const result = await verifyRes.json();

        if (result.verified && result.token) {
            if (typeof window.onPasskeyLogin === 'function') {
                window.onPasskeyLogin(result);
            }
        }

    } catch (error) {
        console.error('Passkey login error:', error);
        showToast('Passkey login failed', 'error');
    }
}

// ------------------------------------------------------------------
// Initialisation
// ------------------------------------------------------------------
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

window.addEventListener('load', () => {
    const usernameField = document.getElementById('login-username');
    const enableBtn = document.getElementById('enable-passkey-btn');

    // Show "Enable Passkey" button if user is already logged in
    if (getAuthToken() && getCurrentUser()) {
        if (enableBtn) enableBtn.style.display = 'block';
    }

    // Set up Conditional UI listeners
    if (usernameField) {
        usernameField.addEventListener('focus', setupConditionalUI);
        usernameField.addEventListener('input', debounce(setupConditionalUI, 300));
    }

    // Attach event to Enable Passkey button
    if (enableBtn) {
        enableBtn.addEventListener('click', enablePasskey);
    }

    // Optional: Add manual passkey login button if you want one
    // const passkeyLoginBtn = document.getElementById('passkey-login-btn');
    // if (passkeyLoginBtn) {
    //     passkeyLoginBtn.addEventListener('click', loginWithPasskey);
    // }
});