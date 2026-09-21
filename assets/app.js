document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentUser = null;
    let authToken = null;
    let userVehicles = [];
    let consumptionChart = null;
    let reportConsumptionChart = null;
    let reportCostChart = null;
    let dashboardLoaded = false; // Track if dashboard has been loaded
    
    // API configuration
    const apiBaseUrl = 'https://api.sangeeth47.in/api';
    
    // DOM elements
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const authTabs = document.querySelectorAll('.auth-tab');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameDisplay = document.getElementById('username-display');
    const navBtns = document.querySelectorAll('.nav-btn');
    const contentTabs = document.querySelectorAll('.content-tab');
    const loadingOverlay = document.getElementById('loading-overlay');
    const toastContainer = document.getElementById('toast-container');
    
    if (document.querySelector('.settings-tab-btn')) {
        switchSettingsTab('profile');
    }
    // Initialize the app
    init();
    
    function init() {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('fuelTrackerUser');
    const storedToken = localStorage.getItem('fuelTrackerToken');
    
    if (storedUser && storedToken) {
        try {
            currentUser = JSON.parse(storedUser);
            authToken = storedToken;
            // Check if token is expired
            try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                if (payload.exp * 1000 < Date.now()) {
                    console.warn('Session expired, logging out...');
                    handleLogout(false);
                    return;
                }
            } catch (err) {
                console.error('Error decoding token:', err);
                handleLogout(false);
                return;
            }
            showMainScreen();
            loadDashboard();
        } catch (e) {
            console.error('Error parsing stored user data:', e);
            showAuthScreen();
        }
    } else {
        handleLogout(false); // Ensure clean state without showing a logout toast
    }
    
    // Set up event listeners
    setupEventListeners();
}
    
    function setupEventListeners() {
        // Auth sliding panel functionality (desktop)
        const signUpButton = document.getElementById('signUp');
        const signInButton = document.getElementById('signIn');
        const authContainer = document.getElementById('auth-container');
        
        // Mobile tab functionality
        const mobileSignInTab = document.getElementById('mobile-sign-in');
        const mobileSignUpTab = document.getElementById('mobile-sign-up');
        
        if (signUpButton) {
            signUpButton.addEventListener('click', () => {
                authContainer.classList.add('right-panel-active');
            });
        }
        
        if (signInButton) {
            signInButton.addEventListener('click', () => {
                authContainer.classList.remove('right-panel-active');
            });
        }
        
        // Mobile tab event listeners
        if (mobileSignInTab) {
            mobileSignInTab.addEventListener('click', () => {
                authContainer.classList.remove('right-panel-active');
                mobileSignInTab.classList.add('active');
                mobileSignUpTab.classList.remove('active');
            });
        }
        
        if (mobileSignUpTab) {
            mobileSignUpTab.addEventListener('click', () => {
                authContainer.classList.add('right-panel-active');
                mobileSignUpTab.classList.add('active');
                mobileSignInTab.classList.remove('active');
            });
        }
        
        // Auth tab switching (legacy support)
        authTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchAuthTab(tabName);
            });
        });
        
        // Login form
        loginBtn.addEventListener('click', handleLogin);
        
        // Register form
        registerBtn.addEventListener('click', handleRegister);
        
        // Logout button
        logoutBtn.addEventListener('click', handleLogout);
        
        // Navigation tabs
        navBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchContentTab(tabName);
            });
        });
        
        // Add entry form
        const addEntryForm = document.getElementById('add-entry-form');
        if (addEntryForm) {
            addEntryForm.addEventListener('submit', handleAddEntry);
            
            // Set initial date and time
            setCurrentDateTime();
            
            // Add event listener for the reset button
            const resetButton = addEntryForm.querySelector('button[type="reset"]');
            if (resetButton) {
                resetButton.addEventListener('click', function() {
                    // Small delay to ensure form is reset first
                    setTimeout(() => {
                        setCurrentDateTime();
                        // Clear the calculated total field
                        const totalInput = document.getElementById('entry-total');
                        if (totalInput) {
                            totalInput.value = '';
                        }
                    }, 10);
                });
            }
            
            // Calculate total cost automatically
            const litersInput = document.getElementById('entry-liters');
            const priceInput = document.getElementById('entry-price');
            const totalInput = document.getElementById('entry-total');
            
            // Track which field was last modified to prevent circular calculations
            let lastModified = null;
            let isCalculating = false; // Prevent recursive calculations
            
            // Auto-calculate based on specific rules:
            // Rule 1: Liters exists + Price modified → Auto-fill Total
            // Rule 2: Liters exists + Total modified → Auto-fill Price per liter  
            // Rule 3: Total exists + Liters modified → Auto-fill Price per liter
            // Rule 4: Total exists + Price modified → Auto-fill Liters
            
            // Track which field is currently being edited
            let currentlyFocusedField = null;
            
            // Add focus tracking
            [litersInput, priceInput, totalInput].forEach(input => {
                input.addEventListener('focus', function() {
                    currentlyFocusedField = this.id;
                });
                
                input.addEventListener('blur', function() {
                    if (currentlyFocusedField === this.id) {
                        currentlyFocusedField = null;
                    }
                });
            });
            
            // Handle Liters input changes
            litersInput.addEventListener('input', function() {
                if (isCalculating || currentlyFocusedField !== 'entry-liters') return;
                
                const litersValue = litersInput.value.trim();
                const priceValue = priceInput.value.trim(); 
                const totalValue = totalInput.value.trim();
                
                const liters = litersValue === '' ? null : parseFloat(litersValue);
                const price = priceValue === '' ? null : parseFloat(priceValue);
                const total = totalValue === '' ? null : parseFloat(totalValue);
                
                // Rule 3: Total exists + Liters modified → Auto-fill Price per liter
                if (liters > 0 && total > 0) {
                    isCalculating = true;
                    const calculatedPrice = (total / liters).toFixed(3);
                    priceInput.value = calculatedPrice;
                    priceInput.style.backgroundColor = '#e8f5e8';
                    setTimeout(() => { priceInput.style.backgroundColor = ''; }, 1000);
                    isCalculating = false;
                }
            });
            
            // Handle Price input changes  
            priceInput.addEventListener('input', function() {
                if (isCalculating || currentlyFocusedField !== 'entry-price') return;
                
                const litersValue = litersInput.value.trim();
                const priceValue = priceInput.value.trim();
                const totalValue = totalInput.value.trim();
                
                const liters = litersValue === '' ? null : parseFloat(litersValue);
                const price = priceValue === '' ? null : parseFloat(priceValue);
                const total = totalValue === '' ? null : parseFloat(totalValue);
                
                if (price > 0) {
                    isCalculating = true;
                    // Rule 1: Liters exists + Price modified → Auto-fill Total
                    if (liters > 0) {
                        const calculatedTotal = (liters * price).toFixed(2);
                        totalInput.value = calculatedTotal;
                        totalInput.style.backgroundColor = '#e8f5e8';
                        setTimeout(() => { totalInput.style.backgroundColor = ''; }, 1000); }
                    // Rule 4: Total exists + Price modified → Auto-fill Liters
                    else if (total > 0) {
                        const calculatedLiters = (total / price).toFixed(2);
                        litersInput.value = calculatedLiters;
                        litersInput.style.backgroundColor = '#e8f5e8';
                        setTimeout(() => { litersInput.style.backgroundColor = ''; }, 1000); }
                    isCalculating = false;
                }
            });
            
            // Handle Total input changes
            totalInput.addEventListener('input', function() {
                if (isCalculating || currentlyFocusedField !== 'entry-total') return;
                
                const litersValue = litersInput.value.trim();
                const priceValue = priceInput.value.trim();
                const totalValue = totalInput.value.trim();
                
                const liters = litersValue === '' ? null : parseFloat(litersValue);
                const price = priceValue === '' ? null : parseFloat(priceValue);
                const total = totalValue === '' ? null : parseFloat(totalValue);
                
                // Rule 2: Liters exists + Total modified → Auto-fill Price per liter
                if (total > 0 && liters > 0) {
                    isCalculating = true;
                    const calculatedPrice = (total / liters).toFixed(3);
                    priceInput.value = calculatedPrice;
                    priceInput.style.backgroundColor = '#e8f5e8';
                    setTimeout(() => { priceInput.style.backgroundColor = ''; }, 1000);
                    isCalculating = false;
                }
            });
        }
        
        // Report controls
        const reportPeriod = document.getElementById('report-period');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', function() {
                const customRangeControls = document.getElementById('custom-range-controls');
                if (this.value === 'custom') {
                    customRangeControls.classList.remove('hidden');
                } else {
                    customRangeControls.classList.add('hidden');
                }
            });
            
            document.getElementById('generate-report-btn').addEventListener('click', generateReport);
        }
        
        // Settings forms
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', handleProfileUpdate);
        }
        
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', handlePasswordChange);
        }
        
        // Service form
        const serviceForm = document.getElementById('service-form');
        if (serviceForm) {
            serviceForm.addEventListener('submit', handleServiceSubmit);
            
            // Set current date for service
            const serviceDateInput = document.getElementById('service-date');
            if (serviceDateInput) {
                serviceDateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Add consumable button
            const addConsumableBtn = document.getElementById('add-consumable-btn');
            if (addConsumableBtn) {
                addConsumableBtn.addEventListener('click', addConsumableItem);
            }
            
            // Labor cost and total calculation
            const laborCostInput = document.getElementById('labor-cost');
            const totalServiceCostInput = document.getElementById('total-service-cost');
            
            if (laborCostInput && totalServiceCostInput) {
                laborCostInput.addEventListener('input', calculateTotalServiceCost);
                // Also recalculate when consumables change
                document.addEventListener('consumablesChanged', calculateTotalServiceCost);
            }
            
            // Reset button for service form
            const serviceResetBtn = serviceForm.querySelector('button[type="reset"]');
            if (serviceResetBtn) {
                serviceResetBtn.addEventListener('click', function() {
                    setTimeout(() => {
                        // Reset date to today
                        serviceDateInput.value = new Date().toISOString().split('T')[0];
                        // Clear consumables and restore placeholder
                        const consumablesList = document.getElementById('consumables-list');
                        consumablesList.innerHTML = '<div class="no-consumables"><p>No consumables added yet. Click "Add Item" to add parts and materials used in this service.</p></div>';
                        // Reset totals
                        document.getElementById('total-parts-cost').value = '';
                        calculateTotalServiceCost();
                    }, 10);
                });
            }
        }
        
        // Vehicle management - Use event delegation for better reliability
        document.addEventListener('click', function(e) {
            if (e.target.id === 'add-vehicle-btn' || e.target.id === 'add-first-vehicle') {
                showAddVehicleModal();
            }
            if (e.target.classList.contains('modal-close')) {
                hideAddVehicleModal();
            }
        });
        
        // Modal backdrop click to close
        document.getElementById('add-vehicle-modal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                hideAddVehicleModal();
            }
        });
        
        const addVehicleForm = document.getElementById('add-vehicle-form');
        if (addVehicleForm) {
            addVehicleForm.addEventListener('submit', handleAddVehicle);
        }
        
        // Settings tabs
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        if (tabName) {
            switchSettingsTab(tabName);
        }
    });
});
        
        // Dashboard refresh button
        const refreshDashboardBtn = document.getElementById('refresh-dashboard-btn');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', function() {
                refreshDashboard();
            });
        }
        
        // Service history vehicle filter
        const serviceHistoryVehicleSelect = document.getElementById('service-history-vehicle-select');
        
        if (serviceHistoryVehicleSelect) {
            serviceHistoryVehicleSelect.addEventListener('change', function() {
                // Don't auto-load, just update the selection
                console.log('Service history vehicle filter changed:', this.value);
            });
        }
        
        // Date filter controls
        const generateServiceHistoryBtn = document.getElementById('generate-service-history-btn');
        const serviceHistoryPeriod = document.getElementById('service-history-period');
        const serviceCustomRangeControls = document.getElementById('service-custom-range-controls');
        const serviceStartDate = document.getElementById('service-start-date');
        const serviceEndDate = document.getElementById('service-end-date');
        
        // Handle period selection change
        if (serviceHistoryPeriod) {
            serviceHistoryPeriod.addEventListener('change', function() {
                const period = this.value;
                if (period === 'custom') {
                    serviceCustomRangeControls.classList.remove('hidden');
                    // Set previous month as default for custom range
                    if (serviceStartDate && serviceEndDate) {
                        const now = new Date();
                        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                        
                        // Format dates as YYYY-MM-DD for date inputs
                        const startDate = oneMonthAgo.toISOString().split('T')[0];
                        const endDate = now.toISOString().split('T')[0];
                        
                        serviceStartDate.value = startDate;
                        serviceEndDate.value = endDate;
                    }
                } else {
                    serviceCustomRangeControls.classList.add('hidden');
                    // Clear custom date inputs when not in custom mode
                    if (serviceStartDate) serviceStartDate.value = '';
                    if (serviceEndDate) serviceEndDate.value = '';
                }
            });
        }
        
        if (generateServiceHistoryBtn) {
            generateServiceHistoryBtn.addEventListener('click', function() {
                loadServiceHistory();
            });
        }
        
        // Remove auto-apply functionality - only apply when Filter button is clicked
        // Date inputs will not trigger API calls automatically
    }
    
    // Auth functions
    function switchAuthTab(tabName) {
        const authContainer = document.getElementById('auth-container');
        
        if (tabName === 'register') {
            authContainer.classList.add('right-panel-active');
        } else {
            authContainer.classList.remove('right-panel-active');
        }
        
        // Legacy support for old auth tab system
        authTabs.forEach(tab => tab.classList.remove('active'));
        const activeTab = document.querySelector(`.auth-tab[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }
    
    async function handleLogin(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('login-btn');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Validation
    if (!username || !password) {
        showToast('Please enter both username and password', 'error');
        return;
    }
    
    try {
        // Show button loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        showLoading();
        
        const response = await fetch(`${apiBaseUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        // Handle non-JSON responses
        const responseText = await response.text();
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error('Invalid server response');
        }

        if (!response.ok) {
            // Handle specific error cases
            if (response.status === 401) {
                throw new Error('Invalid username or password');
            } else if (response.status === 400) {
                throw new Error(data.message || 'Please enter both username and password');
            } else {
                // Use the server's error message if available, otherwise use a generic message
                const errorMessage = data.message || `Login failed (HTTP ${response.status})`;
                throw new Error(errorMessage);
            }
        }

        // Validate response structure
        if (!data.token || !data.userId) {
            throw new Error('Invalid login response format');
        }

        // Store auth data
        currentUser = {
            userId: data.userId,
            username: data.username,
            email: data.email,
            fullName: data.fullName
        };
        
        authToken = data.token;
        
        // Secure storage
        localStorage.setItem('fuelTrackerUser', JSON.stringify(currentUser));
        localStorage.setItem('fuelTrackerToken', data.token);
        
        // Passkey 
        const enableBtn = document.getElementById('enable-passkey-btn');
        if (enableBtn) enableBtn.style.display = 'block';
        
        // Set automatic token refresh (optional)
        // scheduleTokenRefresh();
        
        // Update UI
        showMainScreen();
        loadDashboard();
        showToast('Login successful', 'success');
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Clear any partial auth data on failure
        localStorage.removeItem('fuelTrackerUser');
        localStorage.removeItem('fuelTrackerToken');
        currentUser = null;
        authToken = null;
        
        // Show error message - don't navigate to dashboard
        showToast(error.message, 'error');
    } finally {
        // Remove button loading state
        const loginBtn = document.getElementById('login-btn');
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        hideLoading();
    }
}

    // Expose passkey login handler globally
    window.onPasskeyLogin = function(result) {
        currentUser = {
            username: result.username,
            // map any other fields the server returns
        };
        authToken = result.token;
        localStorage.setItem('fuelTrackerToken', result.token);
        localStorage.setItem('fuelTrackerUser', JSON.stringify(currentUser));
        localStorage.setItem('passkeyLoggedIn', 'true');
        
        const enableBtn = document.getElementById('enable-passkey-btn');
            if (enableBtn) {
            enableBtn.style.display = 'block';
            enableBtn.classList.add('passkey-active');
        }
        
        showMainScreen();
        loadDashboard();
        showToast('Signed in with passkey', 'success');
    };
    // Token refresh scheduler (optional)
// function scheduleTokenRefresh() {
//     // Refresh token 5 minutes before expiration
//     const token = localStorage.getItem('fuelTrackerToken');
//     if (!token) return;
    
//     try {
//         const payload = JSON.parse(atob(token.split('.')[1]));
//         const expiresAt = payload.exp * 1000;
//         const refreshTime = expiresAt - Date.now() - 300000; // 5 min buffer
        
//         if (refreshTime > 0) {
//             setTimeout(refreshToken, refreshTime);
//         }
//     } catch {
//         console.warn('Failed to parse token for refresh scheduling');
//     }
// }

// async function refreshToken() {
//     try {
//         const response = await fetch(`${NoapiBaseUrl}/refresh-token`, {
//             headers: {
//                 'Authorization': `Bearer ${localStorage.getItem('fuelTrackerToken')}`
//             }
//         });
        
//         if (response.ok) {
//             const { token } = await response.json();
//             localStorage.setItem('fuelTrackerToken', token);
//             scheduleTokenRefresh(); // Schedule next refresh
//         }
//     } catch (error) {
//         console.error('Token refresh failed:', error);
//     }
// }
    async function handleRegister(e) {
        e.preventDefault();
        
        const registerBtn = document.getElementById('register-btn');
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const fullName = document.getElementById('register-fullname').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!username || !fullName || !email || !password || !confirmPassword) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        if (username.length < 3 || username.length > 50) {
        showToast('Username must be between 3 and 50 characters', 'error');
        return;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        if (fullName.length < 3 || fullName.length > 50) {
        showToast('Please enter the correct full name.', 'error');
        return;
        }
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        if (password .length < 4) {
            showToast('Passwords must be 4 characters long!', 'error');
            return;
        }
        
        try {
            // Show button loading state
            registerBtn.classList.add('loading');
            registerBtn.disabled = true;
            showLoading();
            
            const response = await fetch(`${apiBaseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, fullName, password })
            });

            // Handle non-JSON responses
            const responseText = await response.text();
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error('Invalid server response');
            }

            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 400) {
                    throw new Error(data.message || 'Please fill in all required fields correctly');
                } else if (response.status === 409) {
                    throw new Error('Username or email already exists. Please choose different ones.');
                } else if (response.status === 500) {
                    throw new Error('Registration failed due to server error. Please try again later.');
                } else {
                    // Use the server's error message if available, otherwise use a generic message
                    const errorMessage = data.message || `Registration failed (HTTP ${response.status})`;
                    throw new Error(errorMessage);
                }
            }

            showToast('Registration completed successfully! Please login', 'success');
            switchAuthTab('login');
            document.getElementById('register-form').reset();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            // Remove button loading state
            registerBtn.classList.remove('loading');
            registerBtn.disabled = false;
            hideLoading();
        }
    }
    
    function handleLogout(showToastMessage = true) {
        currentUser = null;
        authToken = null;
        dashboardLoaded = false; // Reset dashboard loaded flag
        localStorage.removeItem('fuelTrackerUser');
        localStorage.removeItem('fuelTrackerToken');
        showAuthScreen();
        if (showToastMessage) {
            showToast('Logged out successfully', 'success');
        }
    }
    
    // UI functions
    function showAuthScreen() {
    
    authScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm && loginForm.reset) loginForm.reset();
    if (registerForm && registerForm.reset) registerForm.reset();
}
    
    function showMainScreen() {
        authScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        usernameDisplay.textContent = currentUser.username;
        
        // Populate profile form
        if (document.getElementById('profile-username')) {
            document.getElementById('profile-username').value = currentUser.username;
            document.getElementById('profile-email').value = currentUser.email || '';
            document.getElementById('profile-fullname').value = currentUser.fullName || '';
        }
    }
    
    function switchContentTab(tabName) {
        navBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-btn[data-tab="${tabName}"]`).classList.add('active');
        
        contentTabs.forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load data for the tab if needed
        if (tabName === 'dashboard') {
            // Only load dashboard data if it hasn't been loaded yet
            if (!dashboardLoaded) {
                loadDashboard();
            }
        } else if (tabName === 'add-entry') {
            // Set current date and time when switching to add entry tab
            setCurrentDateTime();
        } else if (tabName === 'add-service') {
            // Load vehicles for service tab and set current date
            loadVehiclesForService();
            const serviceDateInput = document.getElementById('service-date');
            if (serviceDateInput && !serviceDateInput.value) {
                serviceDateInput.value = new Date().toISOString().split('T')[0];
            }
        } else if (tabName === 'service-history') {
            // Set previous month date range if dates are empty
            setDefaultServiceDateRange();
            // Do not auto-load service history - user must click Generate button
        } else if (tabName === 'reports') {
            // Initialize reports tab
        } else if (tabName === 'settings') {
            loadSettings();
        }
    }
    
    function switchSettingsTab(tabName) {
    // Get all tab buttons and content areas
    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    const tabContents = document.querySelectorAll('.settings-content');
    
    // Verify elements exist before manipulation
    if (!tabButtons.length || !tabContents.length) {
        console.error('Settings tabs not found in DOM');
        return;
    }

    // Switch active tab
    tabButtons.forEach(btn => {
        if (btn) {  // Null check
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        }
    });

    // Show corresponding content
    tabContents.forEach(content => {
        if (content) {  // Null check
            content.classList.toggle('active', content.id === `${tabName}-settings`);
        }
    });

    // Special handling for vehicles tab
    if (tabName === 'vehicles') {
        const addVehicleBtn = document.getElementById('add-vehicle-btn');
        if (addVehicleBtn) {
            addVehicleBtn.style.display = 'block';
        }
    }
}
    
    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }
    
    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    function formatLastOilChangeDistance(distanceSinceLastOilChange) {
        if (distanceSinceLastOilChange === null || distanceSinceLastOilChange === undefined || distanceSinceLastOilChange === '') {
            return '--';
        }

        if (typeof distanceSinceLastOilChange === 'number') {
            return `${distanceSinceLastOilChange.toLocaleString()} km`;
        }

        if (typeof distanceSinceLastOilChange === 'string') {
            const normalizedValue = distanceSinceLastOilChange.trim();

            if (normalizedValue.toUpperCase() === 'N/A') {
                return 'N/A';
            }

            const numericValue = Number(normalizedValue);
            if (!Number.isNaN(numericValue)) {
                return `${numericValue.toLocaleString()} km`;
            }

            return normalizedValue;
        }

        return String(distanceSinceLastOilChange);
    }

    function setLastOilChangeStat(distanceSinceLastOilChange) {
        const statElement = document.getElementById('last-oil-change-km');
        if (statElement) {
            statElement.textContent = formatLastOilChangeDistance(distanceSinceLastOilChange);
        }
    }
    
    // Helper function to reposition all toasts after one is removed
    function repositionToasts() {
        const allToasts = document.querySelectorAll('.toast');
        let bottomPosition = 20; // Base position
        
        allToasts.forEach(toast => {
            toast.style.bottom = `${bottomPosition}px`;
            const rect = toast.getBoundingClientRect();
            bottomPosition = window.innerHeight - rect.top + 10; // Add 10px gap
        });
    }
    
    function showToast(message, type = 'info') {
        
        // Get toast container fresh each time to ensure it exists
        const toastContainer = document.getElementById('toast-container');
        
        if (!toastContainer) {
            console.error('Toast container not found! Falling back to alert.');
            alert(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        // Calculate bottom position based on existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        let bottomPosition = 20; // Base position in pixels
        
        existingToasts.forEach(existingToast => {
            const rect = existingToast.getBoundingClientRect();
            const currentBottom = window.innerHeight - rect.top;
            if (currentBottom > bottomPosition) {
                bottomPosition = currentBottom + 10; // Add 10px gap between toasts
            }
        });
        
        
        // Add inline styles to ensure visibility with fixed positioning
        toast.style.cssText = `
            position: fixed !important;
            bottom: ${bottomPosition}px !important;
            right: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 1rem 1.5rem !important;
            margin-bottom: 0.5rem !important;
            border-radius: 4px !important;
            min-width: 250px !important;
            max-width: 400px !important;
            color: white !important;
            background-color: ${type === 'error' ? '#ea4335' : type === 'success' ? '#34a853' : type === 'warning' ? '#fbbc05' : '#343a40'} !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important;
            opacity: 1 !important;
            visibility: visible !important;
            transform: translateX(0) !important;
            z-index: 9999 !important;
            border: 2px solid rgba(255, 255, 255, 0.3) !important;
            font-size: 14px !important;
            font-family: inherit !important;
            pointer-events: auto !important;
            transition: bottom 0.3s ease !important;
        `;
        
        // Add event listener for close button
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.style.cssText = `
                background: none !important;
                border: none !important;
                color: inherit !important;
                font-size: 1.25rem !important;
                cursor: pointer !important;
                margin-left: 1rem !important;
                padding: 0 !important;
                opacity: 0.8 !important;
            `;
            closeBtn.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.remove();
                    // Reposition remaining toasts
                    repositionToasts();
                }
            });
        }
        
        // Add toast directly to body instead of container to avoid any positioning issues
        document.body.appendChild(toast);
        
        // Debug: Check if toast is visible
        const toastRect = toast.getBoundingClientRect();
        const containerRect = toastContainer.getBoundingClientRect();
        
        // Force reflow to ensure the toast is rendered
        toast.offsetHeight;
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
                // Reposition remaining toasts
                repositionToasts();
            }
        }, 4000);
    }
    
    // Dashboard functions
    async function loadDashboard() {
        if (!currentUser) return;
        
        try {
            showLoading();
            
            // Load user's vehicles
            const vehiclesResponse = await fetch(`${apiBaseUrl}/getVehicles`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('fuelTrackerToken')}`
                }
            });

            if (!vehiclesResponse.ok) {
                throw new Error('Failed to load vehicles');
            }

            userVehicles = await vehiclesResponse.json();
            
            // Populate vehicle selectors
            populateVehicleSelectors();
            
            // If user has vehicles, load stats for the first one and set it as selected
            if (userVehicles.length > 0) {
                // Get the updated dashboard select elements after populateVehicleSelectors
                const dashboardSelect = document.getElementById('dashboard-vehicle-select');
                const mobileDashboardSelect = document.getElementById('mobile-dashboard-vehicle-select');
                
                // Set both selectors to the first vehicle
                dashboardSelect.value = userVehicles[0].VehicleId;
                mobileDashboardSelect.value = userVehicles[0].VehicleId;
                
                await loadVehicleStats(userVehicles[0].VehicleId);
            } else {
                // Show empty state
                document.getElementById('avg-consumption').textContent = '--';
                document.getElementById('total-distance').textContent = '--';
                document.getElementById('total-fuel').textContent = '--';
                document.getElementById('total-cost').textContent = '--';
                setLastOilChangeStat('--');
                
                if (consumptionChart) {
                    consumptionChart.destroy();
                }
                
                const ctx = document.getElementById('consumption-chart').getContext('2d');
                consumptionChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [
    {
        label: 'Full Tank',
        data: fullTankPoints,
        parsing: false,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgb(75, 192, 192)',
        pointBackgroundColor: 'rgb(75, 192, 192)',
        pointBorderColor: 'rgb(75, 192, 192)',
        pointRadius: 5,
        pointHoverRadius: 7,
        showLine: true,
        tension: 0.2,
        fill: false
    },
    {
        label: 'Partial Fuel',
        data: partialFuelPoints,
        parsing: false,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgb(255, 159, 64)',
        pointBackgroundColor: 'rgb(255, 159, 64)',
        pointBorderColor: 'rgb(255, 159, 64)',
        pointRadius: 7,
        pointHoverRadius: 9,
        pointStyle: 'triangle',
        showLine: false
    }
]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: false
                            }
                        }
                    }
                });
            }
            
            // Mark dashboard as loaded
            dashboardLoaded = true;
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Function to refresh dashboard data
    async function refreshDashboard() {
        // Reset the loaded flag to force a reload
        dashboardLoaded = false;
        await loadDashboard();
        showToast('Dashboard refreshed successfully', 'success');
    }
    
    function populateVehicleSelectors() {
        const dashboardSelect = document.getElementById('dashboard-vehicle-select');
        const mobileDashboardSelect = document.getElementById('mobile-dashboard-vehicle-select');
        const entrySelect = document.getElementById('entry-vehicle');
        const serviceSelect = document.getElementById('service-vehicle');
        const serviceHistorySelect = document.getElementById('service-history-vehicle-select');
        const reportSelect = document.getElementById('report-vehicle-select');
        
        // Clear existing options
        dashboardSelect.innerHTML = '';
        mobileDashboardSelect.innerHTML = '';
        entrySelect.innerHTML = '<option value="">Select a vehicle</option>';
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Select a vehicle</option>';
        }
        if (serviceHistorySelect) {
            serviceHistorySelect.innerHTML = '<option value="">All Vehicles</option>';
        }
        reportSelect.innerHTML = '<option value="">All Vehicles</option>';
        
        if (userVehicles.length === 0) {
            dashboardSelect.innerHTML = '<option value="">No vehicles found</option>';
            mobileDashboardSelect.innerHTML = '<option value="">No vehicles found</option>';
            return;
        }
        
        userVehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.VehicleId;
            option.textContent = `${vehicle.Make} ${vehicle.Model}${vehicle.Year ? ` (${vehicle.Year})` : ''}`;
            
            dashboardSelect.appendChild(option.cloneNode(true));
            mobileDashboardSelect.appendChild(option.cloneNode(true));
            entrySelect.appendChild(option.cloneNode(true));
            if (serviceSelect) {
                serviceSelect.appendChild(option.cloneNode(true));
            }
            if (serviceHistorySelect) {
                serviceHistorySelect.appendChild(option.cloneNode(true));
            }
            reportSelect.appendChild(option.cloneNode(true));
        });
        
        // Remove any existing event listeners by cloning the element
        const newDashboardSelect = dashboardSelect.cloneNode(true);
        dashboardSelect.parentNode.replaceChild(newDashboardSelect, dashboardSelect);
        
        const newMobileDashboardSelect = mobileDashboardSelect.cloneNode(true);
        mobileDashboardSelect.parentNode.replaceChild(newMobileDashboardSelect, mobileDashboardSelect);
        
        // Update the reference to point to the new elements
        const updatedDashboardSelect = document.getElementById('dashboard-vehicle-select');
        const updatedMobileDashboardSelect = document.getElementById('mobile-dashboard-vehicle-select');
        
        // Add event listener to the desktop dashboard vehicle selector
        updatedDashboardSelect.addEventListener('change', function() {
            
            // Sync with mobile selector
            updatedMobileDashboardSelect.value = this.value;
            
            if (this.value) {
                loadVehicleStats(this.value);
            }
        });
        
        // Add event listener to the mobile dashboard vehicle selector
        updatedMobileDashboardSelect.addEventListener('change', function() {
            // Sync with desktop selector
            updatedDashboardSelect.value = this.value;
            
            if (this.value) {
                loadVehicleStats(this.value);
            }
        });
    }
    
    async function loadVehicleStats(vehicleId) {
        if (!vehicleId) {
            return;
        }

        try {
            showLoading();

            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            // getFuelStats returns dashboard aggregates, the latest five
            // entries, and completed full-tank interval points for the
            // six-month chart. It does not return the complete FuelEntries
            // table.
            const response = await fetch(
                `${apiBaseUrl}/getFuelStats?vehicleId=${encodeURIComponent(vehicleId)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const oilChangeResponsePromise = fetch(
                `${apiBaseUrl}/getOilChangeStats?vehicleId=${encodeURIComponent(vehicleId)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            ).catch(error => {
                console.warn(
                    `Failed to start oil change stats request for vehicle ${vehicleId}:`,
                    error
                );
                return null;
            });

            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }

            if (!response.ok) {
                let errorMessage = 'Failed to load vehicle stats';

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    const errorText = await response.text();
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();

            const oilChangeResponse = await oilChangeResponsePromise;
            let oilChangeData = null;

            if (oilChangeResponse && oilChangeResponse.ok) {
                oilChangeData = await oilChangeResponse.json();
            }

            const stats = data.stats;
            const recentEntries = Array.isArray(data.recentEntries)
                ? data.recentEntries
                : [];
            const chartData = Array.isArray(data.chartData)
                ? data.chartData
                : [];

            // Keep the vehicle's latest odometer in the client-side vehicle
            // object without loading the complete fuel-entry history.
            const vehicle = userVehicles.find(
                item => String(item.VehicleId) === String(vehicleId)
            );

            if (vehicle) {
                vehicle.lastOdometer =
                    recentEntries.length > 0
                        ? recentEntries[0].Odometer
                        : data.vehicle?.CurrentOdometer;
            }

            /*
             * Dashboard tiles:
             *
             * Avg Efficiency = whole-history distance / whole-history fuel
             * Total Cost     = whole-history fuel-entry cost
             *
             * These values come directly from SQL. No browser-side
             * reconstruction of all fuel entries is performed.
             */
            if (stats) {
                document.getElementById('avg-consumption').textContent =
                    stats.avgEfficiency == null
                        ? '--'
                        : Number(stats.avgEfficiency).toFixed(2);

                document.getElementById('total-distance').textContent =
                    Number(stats.totalDistance || 0).toFixed(1);

                document.getElementById('total-fuel').textContent =
                    Number(stats.totalLiters || 0).toFixed(1);

                document.getElementById('total-cost').textContent =
                    Number(stats.totalCost || 0).toFixed(2);

                setLastOilChangeStat(
                    oilChangeData?.distanceSinceLastOilChange
                );
            } else {
                document.getElementById('avg-consumption').textContent = '--';
                document.getElementById('total-distance').textContent = '--';
                document.getElementById('total-fuel').textContent = '--';
                document.getElementById('total-cost').textContent = '--';
                setLastOilChangeStat(
                    oilChangeData?.distanceSinceLastOilChange
                );
            }

            /*
             * Trend uses the latest two completed full-tank intervals
             * returned by the API. This is KM/L directly; no 100/x
             * conversion is required.
             */
            const trendElement = document.getElementById('consumption-trend');
            const populatedChartPoints = chartData
                .filter(
                    point => point.efficiency != null && Number(point.efficiency) > 0
                )
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (populatedChartPoints.length >= 2) {
                const lastEfficiency =
                    Number(populatedChartPoints[populatedChartPoints.length - 1].efficiency);

                const previousEfficiency =
                    Number(populatedChartPoints[populatedChartPoints.length - 2].efficiency);

                if (previousEfficiency > 0) {
                    const percentageChange =
                        ((lastEfficiency - previousEfficiency) / previousEfficiency) * 100;

                const roundedChange = Number(percentageChange.toFixed(1));

                let trendClass = 'stat-trend neutral';
                let trendIcon = 'fas fa-minus';

                if (roundedChange >= 0.1) {
                    trendClass = 'stat-trend up';
                    trendIcon = 'fas fa-arrow-up';

                    trendElement.className = trendClass;
                    trendElement.innerHTML = `
                        <i class="${trendIcon}"></i>
                        ${roundedChange.toFixed(1)}%
                    `;
                } else if (roundedChange <= -0.1) {
                    trendClass = 'stat-trend down';
                    trendIcon = 'fas fa-arrow-down';

                    trendElement.className = trendClass;
                    trendElement.innerHTML = `
                        <i class="${trendIcon}"></i>
                        ${Math.abs(roundedChange).toFixed(1)}%
                    `;
                } else {
                    // Less than 0.1% change = neutral
                    trendElement.className = 'stat-trend neutral';
                    trendElement.innerHTML = `
                        <i class="fas fa-minus"></i>
                    `;
                }
                }
            } else {
                trendElement.className = 'stat-trend';
                trendElement.innerHTML = '<i class="fas fa-minus"></i>';
            }

            if (stats?.calculationNote) {
                showToast(stats.calculationNote, 'info');
            }

            /*
             * Dashboard chart:
             *
             * The new API returns only COMPLETED full-tank intervals.
             *
             * Example:
             *   FULL -> PARTIAL -> PARTIAL -> FULL
             *
             * becomes one chart point at the closing FULL entry.
             * Partial fills are already included in that interval's
             * `liters` value by the API, so the browser must NOT create
             * separate partial-fuel points.
             *
             * chartData fields:
             *   date             = closing full-tank date
             *   efficiency       = interval KM/L
             *   distance         = interval distance
             *   liters           = fuel used in the interval
             *   cost             = fuel cost in the interval
             *   partialFillCount = number of partial fills in the interval
             *   startDate        = opening full-tank date
             *   endDate          = closing full-tank date
             */
            if (consumptionChart) {
                consumptionChart.destroy();
                consumptionChart = null;
            }

            const now = new Date();

            /*
             * Always display exactly six calendar months:
             * current month + previous five months.
             *
             * This range is independent of how many chart points the API
             * returns, so empty months remain visible.
             */
            const sixMonthStart = new Date(
                now.getFullYear(),
                now.getMonth() - 5,
                1,
                0,
                0,
                0,
                0
            );

            const sixMonthEnd = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
            );

            /*
             * Every API chart point is already a valid full-tank interval.
             * Do not filter by IsFullTank or create a Partial Fuel dataset.
             */
            const intervalPoints = chartData
                .filter(point => {
                    const date = parseApiDateAsEntered(point.date);

                    return (
                        !Number.isNaN(date.getTime()) &&
                        date >= sixMonthStart &&
                        date <= sixMonthEnd &&
                        point.efficiency != null &&
                        Number.isFinite(Number(point.efficiency))
                    );
                })
                .sort(
                    (a, b) =>
                        parseApiDateAsEntered(a.date).getTime() -
                        parseApiDateAsEntered(b.date).getTime()
                );

            const chartPoints = intervalPoints.map(point => ({
                x: parseApiDateAsEntered(point.date).getTime(),
                y: Number(point.efficiency),
                entry: point
            }));

            const ctx = document
                .getElementById('consumption-chart')
                .getContext('2d');

            consumptionChart = new Chart(ctx, {
                type: 'line',

                data: {
                    datasets: [{
                        label: 'Fuel Efficiency',
                        data: chartPoints,
                        parsing: false,

                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',

                        pointBackgroundColor: 'rgb(75, 192, 192)',
                        pointBorderColor: 'rgb(75, 192, 192)',
                        pointRadius: 5,
                        pointHoverRadius: 7,

                        borderWidth: 2,
                        showLine: true,
                        tension: 0.2,
                        fill: false,

                        /*
                         * Keep the line continuous only between actual
                         * completed intervals. There are no artificial
                         * monthly points.
                         */
                        spanGaps: false
                    }]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    interaction: {
                        mode: 'nearest',
                        intersect: false
                    },

                    scales: {
                        x: {
                            type: 'linear',

                            min: sixMonthStart.getTime(),
                            max: sixMonthEnd.getTime(),

                            display: true,

                            title: {
                                display: true,
                                text: 'Last 6 Months'
                            },

                            ticks: {
                                autoSkip: false,
                                maxTicksLimit: 6,

                                callback: function(value) {
                                    return new Date(value).toLocaleDateString(
                                        undefined,
                                        {
                                            month: 'short',
                                            year: 'numeric'
                                        }
                                    );
                                }
                            },

                            grid: {
                                display: true
                            }
                        },

                        y: {
                            beginAtZero: false,

                            title: {
                                display: true,
                                text: 'Kilometers per Liter (KM/L)'
                            },

                            ticks: {
                                callback: value => `${value} KM/L`
                            }
                        }
                    },

                    plugins: {
                        title: {
                            display: true,

                            text: chartPoints.length > 0
                                ? 'Fuel Efficiency - Last 6 Months'
                                : 'No completed full-tank intervals in the last 6 months'
                        },

                        legend: {
                            display: true
                        },

                        tooltip: {
                            callbacks: {
                                title: function(items) {
                                    if (!items.length) {
                                        return '';
                                    }

                                    const point = items[0].raw?.entry;
                                    const date = point
                                        ? parseApiDateAsEntered(point.date)
                                        : new Date(items[0].parsed.x);

                                    return date.toLocaleDateString(
                                        undefined,
                                        {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        }
                                    );
                                },

                                label: function(context) {
                                    return `Efficiency: ${Number(
                                        context.parsed.y
                                    ).toFixed(2)} KM/L`;
                                },

                                afterLabel: function(context) {
                                    const point = context.raw?.entry;

                                    if (!point) {
                                        return [];
                                    }

                                    const lines = [
                                        `Distance: ${Number(
                                            point.distance || 0
                                        ).toFixed(1)} km`,

                                        `Fuel used: ${Number(
                                            point.liters || 0
                                        ).toFixed(2)} L`
                                    ];

                                    if (point.cost != null) {
                                        lines.push(
                                            `Fuel cost: ${Number(
                                                point.cost
                                            ).toFixed(2)}`
                                        );
                                    }

                                    if (point.startDate) {
                                        lines.push(
                                            `From: ${parseApiDateAsEntered(
                                                point.startDate
                                            ).toLocaleDateString(
                                                undefined,
                                                {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                }
                                            )}`
                                        );
                                    }

                                    if (point.endDate) {
                                        lines.push(
                                            `To: ${parseApiDateAsEntered(
                                                point.endDate
                                            ).toLocaleDateString(
                                                undefined,
                                                {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                }
                                            )}`
                                        );
                                    }

                                    const partialCount = Number(
                                        point.partialFillCount || 0
                                    );

                                    if (partialCount > 0) {
                                        lines.push(
                                            `Partial fills included: ${partialCount}`
                                        );
                                    }

                                    return lines;
                                }
                            }
                        }
                    }
                }
            });

            /*
             * Recent entries:
             * The API already calculated DistanceKm using SQL LAG().
             * No full-history array is needed here.
             */
            const tbody = document.querySelector('#recent-entries-table tbody');
            tbody.innerHTML = '';

            if (recentEntries.length === 0) {
                tbody.innerHTML =
                    '<tr><td colspan="7">No entries found. Add your first fuel entry!</td></tr>';
            } else {
                recentEntries.forEach(entry => {
                    const distance = Number(entry.DistanceKm || 0);

                    const row = document.createElement('tr');
                    if (entry.IsFullTank === true) {
                        row.classList.add('full-tank-row');
                    }
                    row.innerHTML = `
                        <td>${formatDateTime(entry.EntryDate)}</td>
                        <td>${Number(entry.Odometer).toFixed(1)}</td>
                        <td>${distance > 0 ? distance.toFixed(1) : '0.0'}</td>
                        <td>${Number(entry.Liters || 0).toFixed(2)}</td>
                        <td>${entry.PricePerLiter == null
                            ? '--'
                            : Number(entry.PricePerLiter).toFixed(2)}</td>
                        <td>${Number(entry.TotalCost || 0).toFixed(2)}</td>
                        <td>
                            <button class="btn-delete-entry"
                                    onclick="deleteFuelEntry('${entry.EntryId}', '${entry.VehicleId}')"
                                    title="Delete Entry">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;

                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }

        // Add entry functions
    async function handleAddEntry(e) {
        e.preventDefault();
        
        const vehicleId = document.getElementById('entry-vehicle').value;
        const date = document.getElementById('entry-date').value;
        const odometer = parseFloat(document.getElementById('entry-odometer').value);
        const liters = parseFloat(document.getElementById('entry-liters').value);
        const pricePerLiter = parseFloat(document.getElementById('entry-price').value);
        const totalCost = parseFloat(document.getElementById('entry-total').value);
        const isFullTank = document.getElementById('entry-full-tank').checked;
        const notes = document.getElementById('entry-notes').value;
        
        // Convert the date to properly preserve local time
        let entryDate = date;
        if (date) {
            // Parse the date as local time and format it as ISO string with local timezone
            const localDate = new Date(date);
            if (!isNaN(localDate.getTime())) {
                // Create ISO string but keep it as local time by adjusting for timezone offset
                const offsetMs = localDate.getTimezoneOffset() * 60000;
                const localISOTime = new Date(localDate.getTime() - offsetMs).toISOString();
                entryDate = localISOTime;
            }
        }
        
        if (!vehicleId || !date || isNaN(odometer) || isNaN(liters) || isNaN(pricePerLiter)) {
            showToast('Please fill in all required fields with valid values', 'error');
            return;
        }
        
        // Warn about unusually high fuel prices (likely user error)
        // if (pricePerLiter > 10) {
        //     const proceed = confirm(`Warning: Price per liter (${pricePerLiter}) seems unusually high. Did you mean ${(pricePerLiter/100).toFixed(2)} instead? Click OK to continue with ${pricePerLiter}, or Cancel to review.`);
        //     if (!proceed) {
        //         return;
        //     }
        // }
        
        // Validate the total cost calculation
        const expectedTotal = liters * pricePerLiter;
        if (Math.abs(totalCost - expectedTotal) > 0.01) {
            console.warn(`Total cost mismatch: Form shows ${totalCost}, calculated ${expectedTotal}`);
        }
        
        // Validate odometer reading progression
        if (userVehicles.length > 0) {
            const currentVehicle = userVehicles.find(v => v.VehicleId === vehicleId);
            if (currentVehicle && currentVehicle.lastOdometer && odometer <= currentVehicle.lastOdometer) {
                const proceed = confirm(`Warning: Odometer reading (${odometer} km) is not greater than the last recorded reading (${currentVehicle.lastOdometer} km). This may affect fuel efficiency calculations. Do you want to continue?`);
                if (!proceed) {
                    return;
                }
            }
        }
        
        try {
            showLoading();
            
            // Get token from localStorage to ensure it's fresh
            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            const response = await fetch(`${apiBaseUrl}/fuelEntries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    vehicleId,
                    odometer,
                    liters,
                    pricePerLiter,
                    totalCost: totalCost || (liters * pricePerLiter),
                    isFullTank,
                    notes,
                    entryDate: entryDate
                })
            });
            
            // Handle unauthorized response
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to add fuel entry: ${errorText}`);
            }
            
            const data = await response.json();
            
            showToast('Fuel entry added successfully', 'success');
            document.getElementById('add-entry-form').reset();
            
            // Reset date to current time after form reset
            setCurrentDateTime();
            
            // Reload dashboard if on the same vehicle
            const dashboardSelect = document.getElementById('dashboard-vehicle-select');
            if (dashboardSelect.value === vehicleId) {
                await loadVehicleStats(vehicleId);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Report functions
    async function generateReport() {
        const vehicleId = document.getElementById('report-vehicle-select').value;
        const period = document.getElementById('report-period').value;
        
        let startDate, endDate = new Date();
        
        if (period === 'month') {
            startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            
            // Set end date to end of current month
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'year') {
            // Create start date as January 1st of current year in local time
            startDate = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
            
            // Set end date to end of current year (December 31st) in local time
            endDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (period === 'custom') {
            startDate = new Date(document.getElementById('report-start-date').value);
            endDate = new Date(document.getElementById('report-end-date').value);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                showToast('Please select valid date range', 'error');
                return;
            }
            
            // Set end of day for end date
            endDate.setHours(23, 59, 59, 999);
        }
        
        try {
            showLoading();
            
            // Get token from localStorage to ensure it's fresh
            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            const params = new URLSearchParams();

if (vehicleId) {
    params.append('vehicleId', vehicleId);
}

if (startDate) {
    const startUtc = new Date(
        Date.UTC(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            0,
            0,
            0,
            0
        )
    );

    params.append('startDate', startUtc.toISOString());
}

if (endDate) {
    const endUtc = new Date(
        Date.UTC(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23,
            59,
            59,
            999
        )
    );

    params.append('endDate', endUtc.toISOString());
}

            const queryString = params.toString();
            const url = queryString ? `${apiBaseUrl}/getFuelEntries?${queryString}` : `${apiBaseUrl}/getFuelEntries`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Handle unauthorized response
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load fuel entries: ${errorText}`);
            }
            
            const entries = await response.json();
            
            if (entries.length === 0) {
                showToast('No entries found for the selected criteria', 'info');
                return;
            }
            
            // Process data for charts
            const vehicleMap = {};
            userVehicles.forEach(v => vehicleMap[v.VehicleId] = `${v.Make} ${v.Model}`);
            
            // Mileage is calculated by the API using full-tank -> full-tank
            // intervals. Do not recalculate mileage from the filtered entries
            // in the browser, because the previous full-tank entry may be
            // outside the selected report date range.
            //
            // API contract:
            //   IsFullTank = true  + Mileage number -> calculated mileage
            //   IsFullTank = true  + Mileage null   -> no previous full tank
            //   IsFullTank = false                  -> partial fill; always --
            function getApiMileage(entry) {
                if (!entry || entry.IsFullTank !== true) {
                    return null;
                }

                const mileage = Number(entry.Mileage);

                return Number.isFinite(mileage) && mileage >= 0
                    ? mileage
                    : null;
            }

            // Group entries by vehicle/month for the report chart. The chart
            // uses only valid API-calculated full-tank mileage values.
            // Partial entries remain visible in the table but never affect
            // the mileage calculation.
            function calculateEfficiencyForPeriod(periodEntries) {
                let totalCost = 0;
                let totalFuelPurchased = 0;
                let totalDistance = 0;
                let validMileageCount = 0;

                periodEntries.forEach(entry => {
                    totalCost += Number(entry.TotalCost) || 0;
                    totalFuelPurchased += Number(entry.Liters) || 0;

                    const mileage = getApiMileage(entry);

                    if (mileage !== null) {
                        const liters = Number(entry.Liters) || 0;
                        if (liters > 0) {
                            totalDistance += mileage * liters;
                            validMileageCount++;
                        }
                    }
                });

                const efficiency = validMileageCount > 0 && totalFuelPurchased > 0
                    ? totalDistance / periodEntries
                        .filter(entry => getApiMileage(entry) !== null)
                        .reduce((sum, entry) => sum + (Number(entry.Liters) || 0), 0)
                    : null;

                return {
                    totalLiters: totalFuelPurchased,
                    totalCost,
                    totalDistance,
                    efficiency
                };
            }

            // Determine grouping strategy based on period
            let groupedData = {};
            
            if (period === 'month' || period === 'year') {
                // Group by month for chart display
                entries.forEach(entry => {
                    const date = parseApiDateAsEntered(entry.EntryDate);
                    const monthYear = date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        : null;

                    if (!monthYear) return;
                    
                    if (!groupedData[monthYear]) {
                        groupedData[monthYear] = [];
                    }
                    groupedData[monthYear].push(entry);
                });
            } else {
                // Custom period - treat as single group
                groupedData['custom'] = entries;
            }
            
            // Calculate efficiency for each group
            const monthlyData = {};
            Object.keys(groupedData).forEach(groupKey => {
                const groupEntries = groupedData[groupKey];
                const result = calculateEfficiencyForPeriod(groupEntries, groupKey);
                
                monthlyData[groupKey] = {
                    totalLiters: result.totalFuelPurchased,
                    totalCost: result.totalCost,
                    totalDistance: result.totalDistance,
                    totalFuelConsumed: result.totalFuelConsumed,
                    efficiency: result.efficiency
                };
            });
            
            // Prepare data for charts
            const months = Object.keys(monthlyData).sort();
            
            // Generate efficiency data from calculated results
            const efficiencyData = months.map(month => {
                const data = monthlyData[month];
                return data.efficiency || 0;
            });
            
            const costData = months.map(month => monthlyData[month].totalCost);
            
            // Update consumption chart
            if (reportConsumptionChart) {
                reportConsumptionChart.destroy();
            }
            
            // Generate appropriate labels based on period type
            let chartLabels;
            let xAxisTitle;
            
            if (period === 'custom') {
                // For custom period, show the date range
                const startDateFormatted = startDate.toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                });
                const endDateFormatted = endDate.toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                });
                chartLabels = [`${startDateFormatted} to ${endDateFormatted}`];
                xAxisTitle = 'Date Range';
            } else {
                // For month/year periods, show month-year format
                chartLabels = months.map(m => {
                    const [year, month] = m.split('-');
                    const date = new Date(year, month - 1);
                    return `${String(date.getMonth() + 1).padStart(2, '0')}-${year}`;
                });
                xAxisTitle = period === 'year' ? 'Month' : 'Period';
            }
            
            const consumptionCtx = document.getElementById('report-consumption-chart').getContext('2d');
            reportConsumptionChart = new Chart(consumptionCtx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Avg Efficiency (KM/L)',
                        data: efficiencyData,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'category',
                            display: true,
                            title: {
                                display: true,
                                text: xAxisTitle
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Kilometers per Liter (KM/L)'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} KM/L`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Update cost chart
            if (reportCostChart) {
                reportCostChart.destroy();
            }
            
            const costCtx = document.getElementById('report-cost-chart').getContext('2d');
            reportCostChart = new Chart(costCtx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Total Cost',
                        data: costData,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'category',
                            display: true,
                            title: {
                                display: true,
                                text: xAxisTitle
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Total Cost'
                            }
                        }
                    }
                }
            });
            
            // Update report table
            const tableBody = document.querySelector('#report-table tbody');
            tableBody.innerHTML = '';
            
            // Sort entries: first by date (newest first), then by odometer (highest first) for same dates
            entries.sort((a, b) => {
                const dateA = new Date(a.EntryDate);
                const dateB = new Date(b.EntryDate);
                
                // If dates are different, sort by date (newest first)
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateB.getTime() - dateA.getTime();
                }
                
                // If dates are the same, sort by odometer (highest first)
                return b.Odometer - a.Odometer;
            });
            
            entries.forEach((entry, index) => {
                let consumption = '--';
                let kmDriven = '--';
                
                // Calculate distance driven for this entry
                // Find all entries for the same vehicle, sorted by date (oldest first for distance calculation)
                const vehicleEntries = entries.filter(e => e.VehicleId === entry.VehicleId)
                    .sort((a, b) => new Date(a.EntryDate) - new Date(b.EntryDate));
                
                // Find the current entry's position in the sorted list
                const currentIndex = vehicleEntries.findIndex(e => 
                    e.EntryDate === entry.EntryDate && e.Odometer === entry.Odometer
                );
                
                // Calculate distance from previous entry
                if (currentIndex > 0) {
                    const previousEntry = vehicleEntries[currentIndex - 1];
                    const distance = entry.Odometer - previousEntry.Odometer;
                    if (distance > 0) {
                        kmDriven = distance.toFixed(1);
                    } else if (distance === 0) {
                        kmDriven = '0.0';
                    } else {
                        kmDriven = 'Invalid'; // Negative distance indicates data error
                    }
                }
                
            // Mileage comes directly from the API.
            //
            // Initial fuel entry:
            //     "Initial FUEL Entry"
            //
            // Partial fuel entry:
            //     "--"
            //
            // Full-tank entry with a previous full-tank interval:
            //     calculated KM/L
            //
            // Full-tank entry without a previous full-tank interval:
            //     "--"
            if (entry.IsInitialEntry === true) {
                consumption = 'First Fuel Entry';
            } else {
                const apiMileage = getApiMileage(entry);

                if (apiMileage !== null) {
                    consumption = `${apiMileage.toFixed(2)} KM/L`;
                }
            }

                const row = document.createElement('tr');

                if (entry.IsFullTank === true) {
                    row.classList.add('full-tank-row');
                    row.dataset.fullTank = 'true';
                }
                row.innerHTML = `
                    <td>${formatDateTime(entry.EntryDate)}</td>
                    <td>${vehicleMap[entry.VehicleId] || 'Unknown'}</td>
                    <td>${entry.Odometer.toFixed(1)}</td>
                    <td>${kmDriven}</td>
                    <td>${entry.Liters.toFixed(2)}</td>
                    <td>${entry.PricePerLiter.toFixed(2)}</td>
                    <td>${entry.TotalCost.toFixed(2)}</td>
                    <td>${consumption}</td>
                    <td>
                        <button class="btn-delete-entry" 
                                onclick="deleteFuelEntry('${entry.EntryId}', '${entry.VehicleId}')"
                                title="Delete Entry">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Delete fuel entry function
    async function deleteFuelEntry(entryId, vehicleId) {
        if (!confirm('Are you sure you want to delete this fuel entry? This action cannot be undone.')) {
            return;
        }
        
        try {
            showLoading();
            
            const token = localStorage.getItem('fuelTrackerToken');
            
            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            const response = await fetch(`${apiBaseUrl}/fuelEntries/${entryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            //  Handle unauthorized
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete fuel entry: ${errorText}`);
            }
            
            showToast('Fuel entry deleted successfully', 'success');
            
            // Refresh dashboard
            const dashboardSelect = document.getElementById('dashboard-vehicle-select');
            if (dashboardSelect && dashboardSelect.value === vehicleId) {
                await loadVehicleStats(vehicleId);
            }
            
            // Refresh report
            const reportTable = document.querySelector('#report-table tbody');
            if (reportTable && reportTable.children.length > 0 && 
                !reportTable.querySelector('td[colspan]')) {
                await generateReport();
            }
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Make deleteFuelEntry available globally for event handlers
    window.deleteFuelEntry = deleteFuelEntry;
    
    // Make supporting functions globally accessible for deleteFuelEntry
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showToast = showToast;
    window.handleLogout = handleLogout;
    window.loadVehicleStats = loadVehicleStats;
    window.generateReport = generateReport;
    window.handleAddVehicle = handleAddVehicle;
    window.loadUserVehicles = loadUserVehicles;

    // Service functions
    function loadVehiclesForService() {
        const serviceVehicleSelect = document.getElementById('service-vehicle');
        if (serviceVehicleSelect && userVehicles.length > 0) {
            serviceVehicleSelect.innerHTML = '<option value="">Select a vehicle</option>';
            userVehicles.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.VehicleId;
                option.textContent = `${vehicle.Make} ${vehicle.Model} (${vehicle.Year})`;
                serviceVehicleSelect.appendChild(option);
            });
        }
    }
    
    function addConsumableItem() {
        const consumablesList = document.getElementById('consumables-list');
        
        // Validate existing consumables before adding a new one
        const existingItems = consumablesList.querySelectorAll('.consumable-item');
        let hasEmptyFields = false;
        
        existingItems.forEach(item => {
            const nameInput = item.querySelector('input[id$="-name"]');
            const quantityInput = item.querySelector('input[id$="-quantity"]');
            const unitPriceInput = item.querySelector('input[id$="-unit-price"]');
            
            // Clear previous error states
            nameInput.classList.remove('error');
            quantityInput.classList.remove('error');
            unitPriceInput.classList.remove('error');
            
            // Check if any required fields are empty
            if (!nameInput.value.trim()) {
                nameInput.classList.add('error');
                hasEmptyFields = true;
            }
            if (!quantityInput.value || parseFloat(quantityInput.value) <= 0) {
                quantityInput.classList.add('error');
                hasEmptyFields = true;
            }
            if (!unitPriceInput.value || parseFloat(unitPriceInput.value) < 0) {
                unitPriceInput.classList.add('error');
                hasEmptyFields = true;
            }
        });
        
        // If there are empty fields, show toast and don't add new item
        if (hasEmptyFields) {
            showToast('Please fill in all fields for existing consumables before adding a new one', 'error');
            return;
        }
        
        // Remove no-consumables placeholder if it exists
        const noConsumables = consumablesList.querySelector('.no-consumables');
        if (noConsumables) {
            noConsumables.remove();
        }
        
        const itemId = 'consumable-' + Date.now();
        
        const consumableItem = document.createElement('div');
        consumableItem.className = 'consumable-item';
        consumableItem.innerHTML = `
            <div class="form-group">
                <label for="${itemId}-name">Item Name</label>
                <input type="text" id="${itemId}-name" placeholder="e.g. Engine Oil, Air Filter..." required>
            </div>
            <div class="form-group">
                <label for="${itemId}-quantity">Quantity</label>
                <input type="number" id="${itemId}-quantity" step="1" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label for="${itemId}-unit-price">Unit Price</label>
                <input type="number" id="${itemId}-unit-price" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label for="${itemId}-total">Total</label>
                <input type="number" id="${itemId}-total" step="0.01" min="0" readonly>
            </div>
            <button type="button" class="remove-consumable-btn" title="Remove item">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        consumablesList.appendChild(consumableItem);
        
        // Add event listeners for calculation
        const quantityInput = consumableItem.querySelector(`#${itemId}-quantity`);
        const unitPriceInput = consumableItem.querySelector(`#${itemId}-unit-price`);
        const totalInput = consumableItem.querySelector(`#${itemId}-total`);
        const removeBtn = consumableItem.querySelector('.remove-consumable-btn');
        const nameInput = consumableItem.querySelector(`#${itemId}-name`);
        
        // Add event listeners to clear error state when user starts typing
        [nameInput, quantityInput, unitPriceInput].forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('error');
            });
        });
        
        // Calculate item total when quantity or unit price changes
        [quantityInput, unitPriceInput].forEach(input => {
            input.addEventListener('input', function() {
                const quantity = parseFloat(quantityInput.value) || 0;
                const unitPrice = parseFloat(unitPriceInput.value) || 0;
                totalInput.value = (quantity * unitPrice).toFixed(2);
                
                // Trigger recalculation of total parts cost
                calculateTotalPartsCost();
            });
        });
        
        // Remove item functionality
        removeBtn.addEventListener('click', function() {
            consumableItem.remove();
            calculateTotalPartsCost();
            
            // Show no-consumables placeholder if no items left
            const remainingItems = consumablesList.querySelectorAll('.consumable-item');
            if (remainingItems.length === 0) {
                const noConsumables = document.createElement('div');
                noConsumables.className = 'no-consumables';
                noConsumables.innerHTML = '<p>No consumables added yet. Click "Add Item" to add parts and materials used in this service.</p>';
                consumablesList.appendChild(noConsumables);
            }
        });
        
        // Focus on the item name input
        consumableItem.querySelector(`#${itemId}-name`).focus();
    }
    
    function calculateTotalPartsCost() {
        const consumableItems = document.querySelectorAll('.consumable-item');
        let totalPartsCost = 0;
        
        consumableItems.forEach(item => {
            const totalInput = item.querySelector('input[id$="-total"]');
            if (totalInput && totalInput.value) {
                totalPartsCost += parseFloat(totalInput.value) || 0;
            }
        });
        
        const totalPartsCostInput = document.getElementById('total-parts-cost');
        if (totalPartsCostInput) {
            totalPartsCostInput.value = totalPartsCost.toFixed(2);
        }
        
        // Trigger total service cost calculation
        calculateTotalServiceCost();
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('consumablesChanged'));
    }
    
    function calculateTotalServiceCost() {
        const totalPartsCost = parseFloat(document.getElementById('total-parts-cost').value) || 0;
        const laborCost = parseFloat(document.getElementById('labor-cost').value) || 0;
        const totalServiceCostInput = document.getElementById('total-service-cost');
        
        // Only auto-calculate if the total service cost is empty or was previously auto-calculated
        if (totalServiceCostInput && (!totalServiceCostInput.value || totalServiceCostInput.dataset.autoCalculated)) {
            const totalServiceCost = totalPartsCost + laborCost;
            if (totalServiceCost > 0) {
                totalServiceCostInput.value = totalServiceCost.toFixed(2);
                totalServiceCostInput.dataset.autoCalculated = 'true';
                // Add visual feedback
                totalServiceCostInput.style.backgroundColor = '#e8f5e8';
                setTimeout(() => {
                    totalServiceCostInput.style.backgroundColor = '';
                }, 1000);
            }
        }
    }
    
    async function handleServiceSubmit(e) {
        e.preventDefault();
        
        const vehicleId = document.getElementById('service-vehicle').value;
        const serviceDate = document.getElementById('service-date').value;
        const serviceType = document.getElementById('service-type').value;
        const billNumber = document.getElementById('service-bill-number').value;
        const odometer = parseFloat(document.getElementById('service-odometer').value) || null;
        const laborCost = parseFloat(document.getElementById('labor-cost').value) || 0;
        const totalServiceCost = parseFloat(document.getElementById('total-service-cost').value);
        const serviceNotes = document.getElementById('service-notes').value;

        if (!vehicleId || !serviceDate || !serviceType || isNaN(totalServiceCost) || totalServiceCost <= 0) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const consumables = [];
        const consumableItems = document.querySelectorAll('.consumable-item');

        consumableItems.forEach(item => {
            const name = item.querySelector('input[id$="-name"]').value;
            const quantity = parseFloat(item.querySelector('input[id$="-quantity"]').value) || 0;
            const unitPrice = parseFloat(item.querySelector('input[id$="-unit-price"]').value) || 0;
            const total = parseFloat(item.querySelector('input[id$="-total"]').value) || 0;

            if (name.trim() && quantity > 0 && unitPrice >= 0) {
                consumables.push({
                    name: name.trim(),
                    quantity,
                    unitPrice,
                    totalPrice: total
                });
            }
        });

        try {
            showLoading();

            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            const serviceData = {
                vehicleId,
                serviceDate,
                serviceType,
                billNumber,
                odometer,
                laborCost,
                totalServiceCost,
                serviceNotes,
                consumables
            };

            const response = await fetch(`${apiBaseUrl}/service-addService`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(serviceData)
            });

            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                handleLogout();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save service record: ${errorText}`);
            }

            showToast('Service record saved successfully', 'success');
            document.getElementById('service-form').reset();

            document.getElementById('service-date').value = new Date().toISOString().split('T')[0];

            const consumablesList = document.getElementById('consumables-list');
            consumablesList.innerHTML = '<div class="no-consumables"><p>No consumables added yet.</p></div>';
            document.getElementById('total-parts-cost').value = '';

            const serviceHistoryTable = document.querySelector('#service-history-table tbody');
            if (serviceHistoryTable) {
                loadServiceHistory();
            }

        } catch (error) {
            console.error('Service submission error:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Service History functions
    function setDefaultServiceDateRange() {
        const serviceHistoryPeriod = document.getElementById('service-history-period');
        const serviceCustomRangeControls = document.getElementById('service-custom-range-controls');
        
        // Set default to "This Month" and hide custom range controls
        if (serviceHistoryPeriod) {
            serviceHistoryPeriod.value = 'month';
        }
        if (serviceCustomRangeControls) {
            serviceCustomRangeControls.classList.add('hidden');
        }
    }
    
    function getServiceDateRange() {
        const serviceHistoryPeriod = document.getElementById('service-history-period');
        const serviceStartDate = document.getElementById('service-start-date');
        const serviceEndDate = document.getElementById('service-end-date');
        
        if (!serviceHistoryPeriod) {
            return { startDate: '', endDate: '' };
        }
        
        const period = serviceHistoryPeriod.value;
        let startDate, endDate;
        
        if (period === 'month') {
            // This month
            startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'year') {
            // This year
            startDate = new Date();
            startDate.setMonth(0, 1); // January 1st
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date();
            endDate.setMonth(11, 31); // December 31st
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'custom') {
            // Custom range from inputs
            const startDateValue = serviceStartDate ? serviceStartDate.value : '';
            const endDateValue = serviceEndDate ? serviceEndDate.value : '';
            
            if (startDateValue) {
                startDate = new Date(startDateValue);
                startDate.setHours(0, 0, 0, 0);
            }
            
            if (endDateValue) {
                endDate = new Date(endDateValue);
                endDate.setHours(23, 59, 59, 999);
            }
        }
        
        return {
            startDate: startDate ? startDate.toISOString().split('T')[0] : '',
            endDate: endDate ? endDate.toISOString().split('T')[0] : ''
        };
    }
    
    async function loadServiceHistory() {
        try {
            showLoading();

            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            const vehicleSelect = document.getElementById('service-history-vehicle-select');
            const selectedVehicleId = vehicleSelect ? vehicleSelect.value : '';

            const { startDate, endDate } = getServiceDateRange();

            const params = new URLSearchParams();
            if (selectedVehicleId) params.append('vehicleId', selectedVehicleId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const url = `${apiBaseUrl}/service-getServices?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load service history: ${errorText}`);
            }

            const data = await response.json();

            const serviceRecords = data?.services || [];

            // FIX: Ensure summary always exists
            const summary = {
                totalServices: data?.summary?.totalServices ?? serviceRecords.length,
                totalCost: data?.summary?.totalCost ?? 0,
                avgCost: data?.summary?.avgCost ?? 0,
                lastServiceDate: data?.summary?.lastServiceDate ?? null
            };

            updateServiceHistoryStats(serviceRecords, summary);
            updateServiceHistoryTable(serviceRecords);
            updateFilteringStatus(startDate, endDate, selectedVehicleId);

        } catch (error) {
            console.error('Service history loading error:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    function updateServiceHistoryStats(serviceRecords, summary) {
        const totalServicesElement = document.getElementById('total-services');
        const totalServiceCostElement = document.getElementById('total-service-history-cost');
        const avgServiceCostElement = document.getElementById('avg-service-cost');
        const lastServiceDateElement = document.getElementById('last-service-date');
        
        if (serviceRecords.length === 0) {
            if (totalServicesElement) totalServicesElement.textContent = '0';
            if (totalServiceCostElement) totalServiceCostElement.textContent = '0.00';
            if (avgServiceCostElement) avgServiceCostElement.textContent = '0.00';
            if (lastServiceDateElement) lastServiceDateElement.textContent = 'Never';
            return;
        }
        
        // Use summary data if available, otherwise calculate from records
        const totalServices = summary?.totalServices > 0 
            ? summary.totalServices 
            : serviceRecords.length;

        const totalCost = summary?.totalCost > 0 
            ? summary.totalCost 
            : serviceRecords.reduce((sum, record) => sum + (record.TotalServiceCost || 0), 0);

        const avgCost = summary?.avgCost > 0 
            ? summary.avgCost 
            : (totalServices > 0 ? totalCost / totalServices : 0);

        const lastServiceDate = summary?.lastServiceDate 
            ? summary.lastServiceDate 
            : (serviceRecords.length > 0 ? serviceRecords[0].ServiceDate : null);
        
        if (totalServicesElement) totalServicesElement.textContent = totalServices.toString();
        if (totalServiceCostElement) totalServiceCostElement.textContent = totalCost.toFixed(2);
        if (avgServiceCostElement) avgServiceCostElement.textContent = avgCost.toFixed(2);
        if (lastServiceDateElement) {
            lastServiceDateElement.textContent = lastServiceDate ? 
                formatDate(lastServiceDate) : 'Never';
        }
    }
    
    function updateServiceHistoryTable(serviceRecords) {
        const tbody = document.querySelector('#service-history-table tbody');
        tbody.innerHTML = '';
        
        if (serviceRecords.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="9">No service records found. Add your first service record to get started.</td>';
            tbody.appendChild(row);
            return;
        }
        
        // Sort by date (newest first)
        serviceRecords.sort((a, b) => {
            const dateA = new Date(a.ServiceDate);
            const dateB = new Date(b.ServiceDate);
            return dateB - dateA;
        });
        
        // Create vehicle map for display
        const vehicleMap = {};
        userVehicles.forEach(v => vehicleMap[v.VehicleId] = `${v.Make} ${v.Model}`);
        
        serviceRecords.forEach(record => {
            const row = document.createElement('tr');
            
            // Calculate parts total from consumables
            const partsTotal = record.consumables ? 
                record.consumables.reduce((sum, item) => sum + (item.TotalPrice || 0), 0) : 0;
            
            row.innerHTML = `
                <td>${formatDate(record.ServiceDate)}</td>
                <td>${vehicleMap[record.VehicleId] || record.Make + ' ' + record.Model || 'Unknown'}</td>
                <td>${record.ServiceType}</td>
                <td>${record.BillNumber || '--'}</td>
                <td>${record.Odometer ? record.Odometer.toFixed(1) : '--'}</td>
                <td>${partsTotal.toFixed(2)}</td>
                <td>${record.LaborCost ? record.LaborCost.toFixed(2) : '0.00'}</td>
                <td>${record.TotalServiceCost.toFixed(2)}</td>
                <td>
                    <button class="btn-view-service" onclick="viewServiceDetails('${record.ServiceId}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-delete-service" onclick="deleteServiceRecord('${record.ServiceId}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    function updateFilteringStatus(startDate, endDate, vehicleId) {
        // Remove existing filter status
        const existingStatus = document.querySelector('.filter-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Check if any filters are active
        const hasDateFilter = startDate || endDate;
        const hasVehicleFilter = vehicleId;
        
        if (!hasDateFilter && !hasVehicleFilter) {
            return; // No filters active
        }
        
        // Create filter status element
        const statusElement = document.createElement('div');
        statusElement.className = 'filter-status';
        
        let statusText = '';
        const filters = [];
        
        if (hasDateFilter) {
            // Get the period selection to show appropriate message
            const serviceHistoryPeriod = document.getElementById('service-history-period');
            const period = serviceHistoryPeriod ? serviceHistoryPeriod.value : 'custom';
            
            if (period === 'month') {
                statusText = 'Showing services from this month';
            } else if (period === 'year') {
                statusText = 'Showing services from this year';
            } else {
                statusText = 'Filters active: ';
                if (startDate && endDate) {
                    filters.push(`Date: ${formatDate(startDate)} to ${formatDate(endDate)}`);
                } else if (startDate) {
                    filters.push(`Date: From ${formatDate(startDate)}`);
                } else if (endDate) {
                    filters.push(`Date: Until ${formatDate(endDate)}`);
                }
            }
        } else {
            statusText = 'Filters active: ';
        }
        
        if (hasVehicleFilter) {
            // Get vehicle name from select element
            const vehicleSelect = document.getElementById('service-history-vehicle-select');
            const vehicleName = vehicleSelect ? vehicleSelect.options[vehicleSelect.selectedIndex].text : 'Selected Vehicle';
            filters.push(`Vehicle: ${vehicleName}`);
        }
        
        if (filters.length > 0 && statusText === 'Filters active: ') {
            statusText += filters.join(', ');
        }
        
        statusElement.textContent = statusText;
        
        // Insert after the service history header
        const tabHeader = document.querySelector('#service-history-tab .tab-header');
        if (tabHeader) {
            tabHeader.insertAdjacentElement('afterend', statusElement);
        }
    }
    
    async function viewServiceDetails(serviceId) {
        try {
            showLoading();

            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            //  No userId in query
            const response = await fetch(`${apiBaseUrl}/service-getServices`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            //  Proper auth handling
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load service details: ${errorText}`);
            }

            const data = await response.json();
            const serviceRecord = (data.services || []).find(
                item => item.ServiceId === serviceId
            );

            if (!serviceRecord) {
                showToast('Service record not found', 'error');
                return;
            }

            showServiceDetailsModal(serviceRecord);

        } catch (error) {
            console.error('View service details error:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    function showServiceDetailsModal(serviceRecord) {
        const vehicleMap = {};
        userVehicles.forEach(v => vehicleMap[v.VehicleId] = `${v.Make} ${v.Model}`);
        
        const modal = document.createElement('div');
        modal.className = 'service-details-modal';
        modal.innerHTML = `
            <div class="service-details-content">
                <div class="service-details-header">
                    <h3>Service Details</h3>
                    <button class="service-details-close">&times;</button>
                </div>
                
                <div class="service-detail-item">
                    <span class="service-detail-label">Vehicle:</span>
                    <span class="service-detail-value">${vehicleMap[serviceRecord.VehicleId] || serviceRecord.Make + ' ' + serviceRecord.Model || 'Unknown'}</span>
                </div>
                
                <div class="service-detail-item">
                    <span class="service-detail-label">Service Type:</span>
                    <span class="service-detail-value">${serviceRecord.ServiceType}</span>
                </div>
                
                <div class="service-detail-item">
                    <span class="service-detail-label">Service Date:</span>
                    <span class="service-detail-value">${formatDate(serviceRecord.ServiceDate)}</span>
                </div>
                
                ${serviceRecord.BillNumber ? `
                <div class="service-detail-item">
                    <span class="service-detail-label">Bill Number:</span>
                    <span class="service-detail-value">${serviceRecord.BillNumber}</span>
                </div>
                ` : ''}
                
                <div class="service-detail-item">
                    <span class="service-detail-label">Odometer:</span>
                    <span class="service-detail-value">${serviceRecord.Odometer ? serviceRecord.Odometer.toFixed(1) + ' km' : 'Not specified'}</span>
                </div>
                
                <div class="service-detail-item">
                    <span class="service-detail-label">Labor Cost:</span>
                    <span class="service-detail-value">${serviceRecord.LaborCost ? serviceRecord.LaborCost.toFixed(2) : '0.00'}</span>
                </div>
                
                <div class="service-detail-item">
                    <span class="service-detail-label">Parts Cost:</span>
                    <span class="service-detail-value">${serviceRecord.consumables ? serviceRecord.consumables.reduce((sum, item) => sum + (item.TotalPrice || 0), 0).toFixed(2) : '0.00'}</span>
                </div>
                
                <div class="service-detail-item">
                    <span class="service-detail-label">Total Cost:</span>
                    <span class="service-detail-value">${serviceRecord.TotalServiceCost.toFixed(2)}</span>
                </div>
                
                ${serviceRecord.ServiceNotes ? `
                <div class="service-detail-item">
                    <span class="service-detail-label">Notes:</span>
                    <span class="service-detail-value">${serviceRecord.ServiceNotes}</span>
                </div>
                ` : ''}
                
                ${serviceRecord.consumables && serviceRecord.consumables.length > 0 ? `
                <div class="service-consumables-list">
                    <h4>Consumables Used:</h4>
                    ${serviceRecord.consumables.map(item => `
                        <div class="service-consumable-item">
                            <span>${item.ConsumableName}</span>
                            <span>${item.Quantity} x ${item.UnitPrice.toFixed(2)} = ${item.TotalPrice.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.service-details-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    async function deleteServiceRecord(serviceId) {
        if (!confirm('Are you sure you want to delete this service record? This action cannot be undone.')) {
            return;
        }

        try {
            showLoading();

            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            const response = await fetch(`${apiBaseUrl}/service-deleteService/${serviceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Auth errors
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                handleLogout();
                return;
            }

            // Permission error
            if (response.status === 403) {
                showToast('You are not allowed to delete this record', 'error');
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete service record: ${errorText}`);
            }

            showToast('Service record deleted successfully', 'success');

            // Proper refresh
            await loadServiceHistory();

        } catch (error) {
            console.error('Delete service record error:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Make service history functions globally available
    window.viewServiceDetails = viewServiceDetails;
    window.deleteServiceRecord = deleteServiceRecord;

    // Settings functions
    function loadSettings() {
        loadUserVehicles();
    }
    
async function loadUserVehicles() {
    try {
        showLoading();

        const authToken = localStorage.getItem('fuelTrackerToken');

        if (!authToken) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${apiBaseUrl}/getVehicles`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        // Handle auth failure
        if (response.status === 401) {
            localStorage.removeItem('fuelTrackerToken');
            localStorage.removeItem('fuelTrackerUser');
            window.location.href = '/login';
            return;
        }

        if (response.status === 403) {
            showToast('Access denied', 'error');
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to load vehicles');
        }

        const vehicles = await response.json();

        userVehicles = vehicles;
        renderUserVehicles();

    } catch (error) {
        console.error('Load vehicles error:', error);
        showToast(`Failed to load vehicles: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}
    
function renderUserVehicles() {
    const vehiclesList = document.getElementById('vehicles-list');
    
    if (userVehicles.length === 0) {
        vehiclesList.innerHTML = `
            <div class="no-vehicles">
                <p>You don't have any vehicles yet.</p>
                <button class="btn-primary" id="add-first-vehicle">Add Your First Vehicle</button>
            </div>
        `;
        return;
    }
    
    vehiclesList.innerHTML = '';
    
    userVehicles.forEach(vehicle => {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.innerHTML = `
            <h3 class="vehicle-make-model">${vehicle.Make} ${vehicle.Model}</h3>
            <div class="vehicle-year">${vehicle.Year || '--'}</div>
            <div class="vehicle-odometer">Odometer: ${vehicle.CurrentOdometer.toFixed(1)} km</div>
            <div class="vehicle-fuel-type">Fuel: ${vehicle.FuelType || '--'}</div>
            <div class="vehicle-actions">
                <button class="btn-secondary btn-delete-vehicle" data-id="${vehicle.VehicleId}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        vehiclesList.appendChild(card);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
        btn.addEventListener('click', function() {
            const vehicleId = this.getAttribute('data-id');
            deleteVehicle(vehicleId);
        });
    });
}
    
  // Modal Control Functions
function showAddVehicleModal() {
    const modal = document.getElementById('add-vehicle-modal');
    if (!modal) {
        console.error('Add vehicle modal not found');
        return;
    }
    
    // Reset form and show modal
    document.getElementById('add-vehicle-form')?.reset();
    modal.classList.remove('hidden');
    modal.classList.add('active');
    
    // Set focus to first input for accessibility
    document.getElementById('vehicle-make')?.focus();
    
    // Add escape key listener
    const handleEscape = (e) => {
        if (e.key === 'Escape') hideAddVehicleModal();
    };
    modal._escapeHandler = handleEscape;
    document.addEventListener('keydown', handleEscape);
}

function hideAddVehicleModal() {
    const modal = document.getElementById('add-vehicle-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.classList.add('hidden');
    
    // Clean up event listener
    if (modal._escapeHandler) {
        document.removeEventListener('keydown', modal._escapeHandler);
        delete modal._escapeHandler;
    }
}

// Vehicle Submission Handler 
async function handleAddVehicle(e) {
    e.preventDefault();

    const make = document.getElementById('vehicle-make')?.value.trim();
    const model = document.getElementById('vehicle-model')?.value.trim();
    const year = document.getElementById('vehicle-year')?.value;
    const fuelType = document.getElementById('vehicle-fuel-type')?.value;
    const odometer = parseFloat(document.getElementById('vehicle-odometer')?.value) || 0;

    if (!make || !model) {
        showToast('Make and model are required', 'error');
        if (!make) document.getElementById('vehicle-make').classList.add('error');
        if (!model) document.getElementById('vehicle-model').classList.add('error');
        return;
    }

    try {
        showLoading();

        const token = localStorage.getItem('fuelTrackerToken');

        if (!token) {
            showToast('Please log in again', 'error');
            handleLogout();
            return;
        }

        const response = await fetch(`${apiBaseUrl}/vehicles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                make,
                model,
                year: year ? parseInt(year) : null,
                initialOdometer: odometer,
                fuelType
            })
        });

        // Auth handling
        if (response.status === 401) {
            localStorage.removeItem('fuelTrackerToken');
            localStorage.removeItem('fuelTrackerUser');
            showToast('Session expired. Please log in again.', 'error');
            handleLogout();
            return;
        }

        if (response.status === 403) {
            showToast('Unauthorized action', 'error');
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to add vehicle');
        }

        await response.json();

        showToast('Vehicle added successfully', 'success');
        hideAddVehicleModal();

        dashboardLoaded = false;
        await loadUserVehicles();

    } catch (error) {
        console.error('Add vehicle error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Helper function to format dates as dd-mm-yyyy hh:mm
function parseApiDateAsEntered(dateString) {
    if (!dateString) return null;

    // FuelNFix stores the user's entered IST date/time in the API value.
    // Even when the serialized value ends with "Z", do not timezone-convert
    // it. Preserve the exact calendar date/time components returned by the API.
    if (typeof dateString === 'string') {
        const match = dateString.match(
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?/
        );

        if (match) {
            const year = Number(match[1]);
            const month = Number(match[2]) - 1;
            const day = Number(match[3]);
            const hours = Number(match[4]);
            const minutes = Number(match[5]);
            const seconds = Number(match[6] || 0);
            const milliseconds = Number(
                (match[7] || '').padEnd(3, '0') || 0
            );

            return new Date(
                year,
                month,
                day,
                hours,
                minutes,
                seconds,
                milliseconds
            );
        }
    }

    const fallback = new Date(dateString);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateTime(dateString) {
    const date = parseApiDateAsEntered(dateString);

    if (!date) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid Date';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        return `${day}-${month}-${year} ${hours}:${minutes}`;
    }

    return `${day}-${month}-${year} ${hours}:${minutes}`;
}

// Helper function to set current date and time
function setCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    const entryDateInput = document.getElementById('entry-date');
    if (entryDateInput) {
        entryDateInput.value = currentDateTime;
    }
}

// // Add a token validation test function
// function testTokenValidation() {
//     const token = localStorage.getItem('fuelTrackerToken');
//     const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
    
//     console.log('=== Token Validation Test ===');
//     console.log('Token exists:', !!token);
//     console.log('User data:', userData);
    
//     if (token) {
//         try {
//             // Decode JWT payload (this is just for debugging - normally you shouldn't do this client-side)
//             const parts = token.split('.');
//             if (parts.length === 3) {
//                 const payload = JSON.parse(atob(parts[1]));
//                 console.log('Token payload:', payload);
//                 console.log('Token expires:', new Date(payload.exp * 1000));
//                 console.log('Token is expired:', Date.now() > payload.exp * 1000);
//             }
//         } catch (e) {
//             console.log('Error decoding token:', e.message);
//         }
        
//         // Test with backend
//         fetch(`${NoapiBaseUrl}/test-token`, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         }).then(response => {
//             console.log('Backend token test response status:', response.status);
//             return response.json();
//         }).then(data => {
//             console.log('Backend token test response:', data);
//         }).catch(err => {
//             console.log('Backend token test error:', err);
//         });
//     }
//     console.log('=== End Test ===');
// }

// // Make it available globally for debugging
// window.testTokenValidation = testTokenValidation;

// Helper function to attempt token refresh
// async function tryRefreshToken() {
//     try {
//         const refreshToken = localStorage.getItem('refreshToken'); // If you have refresh tokens
//         if (!refreshToken) return false;
        
//         const response = await fetch(`${NoapiBaseUrl}/auth/refresh`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${refreshToken}`
//             }
//         });
        
//         if (response.ok) {
//             const { token } = await response.json();
//             localStorage.setItem('fuelTrackerToken', token);
//             return true;
//         }
//     } catch (error) {
//         console.error('Token refresh failed:', error);
//     }
//     return false;
// }


// Token verification utility function
function checkAuthToken() {
    const token = localStorage.getItem('fuelTrackerToken');
    
    // 1. Check if token exists
    if (!token) {
        return { isValid: false, reason: 'Token missing' };
    }

    try {
        // 2. Decode the token payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // 3. Check expiration
        const isExpired = Date.now() >= payload.exp * 1000;
        
        return {
            isValid: !isExpired,
            isExpired,
            payload
        };
    } catch (error) {
        return { isValid: false, reason: 'Invalid token' };
    }
}

// Initialize Event Listeners
function initVehicleModal() {
    // Modal triggers
    document.querySelectorAll('[data-action="show-add-vehicle"]').forEach(btn => {
        btn.addEventListener('click', showAddVehicleModal);
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', hideAddVehicleModal);
    });

    // Click outside to close
    const modal = document.getElementById('add-vehicle-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideAddVehicleModal();
        });
    }

    // Form submission
    const form = document.getElementById('add-vehicle-form');
    if (form) {
        form.addEventListener('submit', handleAddVehicle);
        
        // Clear error states on input
        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('error');
            });
        });
    }
}

// Call this when loading the settings page
document.addEventListener('DOMContentLoaded', initVehicleModal);
    
    async function deleteVehicle(vehicleId) {
        if (!confirm('Are you sure you want to delete this vehicle? All associated fuel entries will also be deleted.')) {
            return;
        }

        try {
            showLoading();

            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            const response = await fetch(`${apiBaseUrl}/deleteVehicle?vehicleId=${encodeURIComponent(vehicleId)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // ✅ Auth handling
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }

            if (response.status === 403) {
                showToast('You are not allowed to delete this vehicle', 'error');
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to delete vehicle');
            }

            await response.json();

            showToast('Vehicle deleted successfully', 'success');

            // Refresh UI
            dashboardLoaded = false;
            await loadUserVehicles();
            await loadDashboard();

        } catch (error) {
            console.error('Delete vehicle error:', error);
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    async function handleProfileUpdate(e) {
        e.preventDefault();

        const email = document.getElementById('profile-email').value.trim();
        const fullName = document.getElementById('profile-fullname').value.trim();

        if (!email) {
            showToast('Email is required', 'error');
            return;
        }

        try {
            showLoading();

            const token = localStorage.getItem('fuelTrackerToken');

            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            const response = await fetch(`${apiBaseUrl}/updateProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    fullName
                })
            });

            // Auth handling
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }

            if (response.status === 403) {
                showToast('Unauthorized action', 'error');
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to update profile');
            }

            const data = await response.json();

            showToast('Profile updated successfully', 'success');

            // Update local user cache safely
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');

            userData.email = email;
            userData.fullName = fullName;

            localStorage.setItem('fuelTrackerUser', JSON.stringify(userData));

            // Sync runtime state
            if (typeof currentUser !== 'undefined' && currentUser) {
                currentUser.email = email;
                currentUser.fullName = fullName;
            }

        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    async function handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all password fields', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        try {
            showLoading();
            
            // Get token from localStorage to ensure it's fresh
            const token = localStorage.getItem('fuelTrackerToken');
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            const response = await fetch(`${apiBaseUrl}/changePassword`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: userData.userId,
                    currentPassword,
                    newPassword
                })
            });
            
            // Handle unauthorized response
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to change password: ${errorText}`);
            }
            
            const data = await response.json();
            
            showToast('Password changed successfully', 'success');
            document.getElementById('password-form').reset();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Initialize date fields
    setCurrentDateTime(); // Use our helper function for datetime-local input
    
    const today = new Date();
    const reportStartDate = document.getElementById('report-start-date');
    const reportEndDate = document.getElementById('report-end-date');
    
    if (reportStartDate) {
        reportStartDate.valueAsDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    if (reportEndDate) {
        reportEndDate.valueAsDate = today;
    }
});

const fuelReportInfo = document.getElementById('fuel-report-info');
const fuelReportLegend = document.getElementById('fuel-report-legend');

if (fuelReportInfo && fuelReportLegend) {
    fuelReportInfo.addEventListener('click', function (event) {
        event.stopPropagation();

        fuelReportLegend.classList.toggle('visible');
    });

    document.addEventListener('click', function () {
        fuelReportLegend.classList.remove('visible');
    });
}