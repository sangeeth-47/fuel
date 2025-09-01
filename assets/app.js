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
    const apiBaseUrl = 'https://sangeeth2314105883websitecounter.azurewebsites.net/api';
    
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
            showMainScreen();
            loadDashboard();
        } catch (e) {
            console.error('Error parsing stored user data:', e);
            showAuthScreen();
        }
    } else {
        showAuthScreen();
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
                    console.log(`Rule 3: Total exists + Liters modified → Price = ${total} ÷ ${liters} = ${calculatedPrice}`);
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
                        setTimeout(() => { totalInput.style.backgroundColor = ''; }, 1000);
                        console.log(`Rule 1: Liters exists + Price modified → Total = ${liters} × ${price} = ${calculatedTotal}`);
                    }
                    // Rule 4: Total exists + Price modified → Auto-fill Liters
                    else if (total > 0) {
                        const calculatedLiters = (total / price).toFixed(2);
                        litersInput.value = calculatedLiters;
                        litersInput.style.backgroundColor = '#e8f5e8';
                        setTimeout(() => { litersInput.style.backgroundColor = ''; }, 1000);
                        console.log(`Rule 4: Total exists + Price modified → Liters = ${total} ÷ ${price} = ${calculatedLiters}`);
                    }
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
                    console.log(`Rule 2: Liters exists + Total modified → Price = ${total} ÷ ${liters} = ${calculatedPrice}`);
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
                        
                        console.log('Set custom range default to previous month:', { startDate, endDate });
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
        
        // Set automatic token refresh (optional)
        scheduleTokenRefresh();
        
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
    // Token refresh scheduler (optional)
function scheduleTokenRefresh() {
    // Refresh token 5 minutes before expiration
    const token = localStorage.getItem('fuelTrackerToken');
    if (!token) return;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        const refreshTime = expiresAt - Date.now() - 300000; // 5 min buffer
        
        if (refreshTime > 0) {
            setTimeout(refreshToken, refreshTime);
        }
    } catch {
        console.warn('Failed to parse token for refresh scheduling');
    }
}

async function refreshToken() {
    try {
        const response = await fetch(`${apiBaseUrl}/refresh-token`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('fuelTrackerToken')}`
            }
        });
        
        if (response.ok) {
            const { token } = await response.json();
            localStorage.setItem('fuelTrackerToken', token);
            scheduleTokenRefresh(); // Schedule next refresh
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
}
    async function handleRegister(e) {
        e.preventDefault();
        
        const registerBtn = document.getElementById('register-btn');
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const fullName = document.getElementById('register-fullname').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!username || !email || !password || !confirmPassword) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
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
    
    function handleLogout() {
        currentUser = null;
        authToken = null;
        dashboardLoaded = false; // Reset dashboard loaded flag
        localStorage.removeItem('fuelTrackerUser');
        localStorage.removeItem('fuelTrackerToken');
        showAuthScreen();
        showToast('Logged out successfully', 'success');
    }
    
    // UI functions
    function showAuthScreen() {
    console.log('Showing auth screen');
    console.log('Login form exists:', !!document.getElementById('login-form'));
    console.log('Register form exists:', !!document.getElementById('register-form'));
    
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
    
    function showToast(message, type = 'info') {
        console.log('showToast called with:', { message, type });
        
        // Get toast container fresh each time to ensure it exists
        const toastContainer = document.getElementById('toast-container');
        
        if (!toastContainer) {
            console.error('Toast container not found! Falling back to alert.');
            alert(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        console.log('Toast container found, creating toast element');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        // Add inline styles to ensure visibility with fixed positioning
        toast.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
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
                console.log('Toast close button clicked');
                if (toast.parentNode) {
                    toast.remove();
                }
            });
        }
        
        // Add toast directly to body instead of container to avoid any positioning issues
        document.body.appendChild(toast);
        console.log('Toast added to body');
        
        // Debug: Check if toast is visible
        const toastRect = toast.getBoundingClientRect();
        const containerRect = toastContainer.getBoundingClientRect();
        console.log('Toast position details:', {
            toast: {
                x: toastRect.x,
                y: toastRect.y,
                width: toastRect.width,
                height: toastRect.height,
                top: toastRect.top,
                left: toastRect.left,
                right: toastRect.right,
                bottom: toastRect.bottom
            },
            container: {
                x: containerRect.x,
                y: containerRect.y,
                width: containerRect.width,
                height: containerRect.height,
                top: containerRect.top,
                left: containerRect.left,
                right: containerRect.right,
                bottom: containerRect.bottom
            },
            computedStyle: {
                display: window.getComputedStyle(toast).display,
                visibility: window.getComputedStyle(toast).visibility,
                opacity: window.getComputedStyle(toast).opacity,
                zIndex: window.getComputedStyle(toast).zIndex,
                position: window.getComputedStyle(toast).position,
                backgroundColor: window.getComputedStyle(toast).backgroundColor,
                color: window.getComputedStyle(toast).color
            },
            containerStyle: {
                display: window.getComputedStyle(toastContainer).display,
                visibility: window.getComputedStyle(toastContainer).visibility,
                opacity: window.getComputedStyle(toastContainer).opacity,
                zIndex: window.getComputedStyle(toastContainer).zIndex,
                position: window.getComputedStyle(toastContainer).position,
                top: window.getComputedStyle(toastContainer).top,
                right: window.getComputedStyle(toastContainer).right,
                bottom: window.getComputedStyle(toastContainer).bottom,
                left: window.getComputedStyle(toastContainer).left
            }
        });
        
        // Force reflow to ensure the toast is rendered
        toast.offsetHeight;
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            console.log('Auto-removing toast after 4 seconds');
            if (toast.parentNode) {
                toast.remove();
            }
        }, 4000);
    }
    
    // Dashboard functions
    async function loadDashboard() {
        if (!currentUser) return;
        
        try {
            showLoading();
            
            // Load user's vehicles
            const vehiclesResponse = await fetch(`${apiBaseUrl}/getVehicles?userId=${currentUser.userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('fuelTrackerToken')}`
                }
            });
            
            if (!vehiclesResponse.ok) {
                throw new Error('Failed to load vehicles');
            }
            
            userVehicles = await vehiclesResponse.json();
            
            // For each vehicle, try to get the latest odometer reading
            for (let vehicle of userVehicles) {
                try {
                    const statsResponse = await fetch(`${apiBaseUrl}/getFuelStats?userId=${currentUser.userId}&vehicleId=${vehicle.VehicleId}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('fuelTrackerToken')}`
                        }
                    });
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        if (statsData.entries && statsData.entries.length > 0) {
                            // Find the latest odometer reading
                            const latestEntry = statsData.entries
                                .sort((a, b) => new Date(b.EntryDate) - new Date(a.EntryDate))[0];
                            vehicle.lastOdometer = latestEntry.Odometer;
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to get latest odometer for vehicle ${vehicle.VehicleId}:`, error);
                }
            }
            
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
                
                if (consumptionChart) {
                    consumptionChart.destroy();
                }
                
                const ctx = document.getElementById('consumption-chart').getContext('2d');
                consumptionChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Fuel Consumption (L/100km)',
                            data: [],
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1,
                            fill: false
                        }]
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
            console.log('Desktop vehicle selected:', this.value);
            console.log('Available vehicles:', userVehicles.map(v => `${v.VehicleId}: ${v.Make} ${v.Model}`));
            
            // Sync with mobile selector
            updatedMobileDashboardSelect.value = this.value;
            
            if (this.value) {
                loadVehicleStats(this.value);
            }
        });
        
        // Add event listener to the mobile dashboard vehicle selector
        updatedMobileDashboardSelect.addEventListener('change', function() {
            console.log('Mobile vehicle selected:', this.value);
            console.log('Available vehicles:', userVehicles.map(v => `${v.VehicleId}: ${v.Make} ${v.Model}`));
            
            // Sync with desktop selector
            updatedDashboardSelect.value = this.value;
            
            if (this.value) {
                loadVehicleStats(this.value);
            }
        });
    }
    
    async function loadVehicleStats(vehicleId) {
    if (!vehicleId) {
        console.log('loadVehicleStats called with empty vehicleId');
        return;
    }
    
    console.log('Loading stats for vehicle:', vehicleId);
    
    try {
        showLoading();
        
        // Get token from localStorage to ensure it's fresh
        const token = localStorage.getItem('fuelTrackerToken');
        const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
        
        console.log('Token exists:', !!token);
        console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'null');
        console.log('User ID:', userData.userId);
        
        if (!token || !userData.userId) {
            showToast('Please log in again', 'error');
            handleLogout();
            return;
        }
        
        const response = await fetch(`${apiBaseUrl}/getFuelStats?userId=${userData.userId}&vehicleId=${vehicleId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API Response status:', response.status);
        console.log('API Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Handle unauthorized response
        if (response.status === 401) {
            console.log('401 Unauthorized - Token validation failed on server');
            
            // Try to get more details about the error
            try {
                const errorText = await response.text();
                console.log('401 Error details:', errorText);
            } catch (e) {
                console.log('Could not read error details');
            }
            
            showToast('Session expired. Please log in again.', 'error');
            localStorage.removeItem('fuelTrackerToken');
            localStorage.removeItem('fuelTrackerUser');
            handleLogout();
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to load vehicle stats: ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log('=== FULL API RESPONSE ===');
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
        console.log('=== END FULL API RESPONSE ===');
        
        console.log('Vehicle details:', data.vehicle);
        console.log('Number of entries:', data.entries?.length || 0);
        console.log('Entries data:', data.entries);
        console.log('Stats data:', data.stats);
        
        // Add detailed odometer analysis
        if (data.entries && data.entries.length > 0) {
            console.log('=== ODOMETER ANALYSIS ===');
            const sortedEntries = [...data.entries].sort((a, b) => new Date(a.EntryDate) - new Date(b.EntryDate));
            console.log('Entries sorted by date:', sortedEntries.map(e => ({
                date: e.EntryDate,
                odometer: e.Odometer,
                liters: e.Liters,
                cost: e.TotalCost,
                isFullTank: e.IsFullTank
            })));
            
            // Group by date to understand multiple fueling per day
            const dailyGroups = {};
            sortedEntries.forEach(entry => {
                const date = new Date(entry.EntryDate).toDateString();
                if (!dailyGroups[date]) {
                    dailyGroups[date] = [];
                }
                dailyGroups[date].push(entry);
            });
            
            console.log('Daily fuel groups:', Object.keys(dailyGroups).map(date => ({
                date,
                count: dailyGroups[date].length,
                totalLiters: dailyGroups[date].reduce((sum, e) => sum + e.Liters, 0),
                odometerRange: dailyGroups[date].length > 1 ? 
                    `${dailyGroups[date][0].Odometer} - ${dailyGroups[date][dailyGroups[date].length - 1].Odometer}` :
                    dailyGroups[date][0].Odometer
            })));
            
            // Check for odometer consistency across days
            const dailyKeys = Object.keys(dailyGroups).sort((a, b) => new Date(a) - new Date(b));
            let hasValidSequence = false;
            
            for (let i = 0; i < dailyKeys.length - 1; i++) {
                const currentDay = dailyGroups[dailyKeys[i]];
                const nextDay = dailyGroups[dailyKeys[i + 1]];
                
                // Use last odometer of current day and first odometer of next day
                const currentOdometer = currentDay[currentDay.length - 1].Odometer;
                const nextOdometer = nextDay[0].Odometer;
                const odometerDiff = nextOdometer - currentOdometer;
                
                console.log(`Day ${dailyKeys[i]} to ${dailyKeys[i + 1]}: ${currentOdometer} -> ${nextOdometer} (diff: ${odometerDiff})`);
                
                if (odometerDiff > 0) {
                    hasValidSequence = true;
                    console.log(`✓ Valid sequence found: ${odometerDiff} km`);
                } else if (odometerDiff < 0) {
                    console.log(`✗ Negative odometer difference: ${odometerDiff} km`);
                } else {
                    console.log(`⚠ Zero odometer difference`);
                }
            }
            
            console.log('Has valid odometer sequence:', hasValidSequence);
            console.log('=== END ODOMETER ANALYSIS ===');
        }
        
        // Check for "not enough data" case (stats will be null or all zeros)
        if (!data.stats || data.stats.avgConsumption === null || data.stats.totalDistance === 0) {
            console.log('Stats are null or zero - insufficient data for calculations');
            console.log('Raw stats data:', data.stats);
            console.log('Entries count:', data.entries?.length || 0);
            
            // Not enough data for full statistics - but we can show basic info
            const entries = data.entries || [];

            if (entries.length > 0) {
                console.log('Showing basic totals from entries:', entries);
                // Calculate basic totals from available entries
                const totalLiters = entries.reduce((sum, entry) => sum + (entry.Liters || 0), 0);
                const totalCost = entries.reduce((sum, entry) => sum + (entry.TotalCost || 0), 0);

                // Calculate total distance and efficiency from available data
                let totalDistance = '--';
                let avgEfficiency = '--';
                
                if (entries.length > 1) {
                    // Find min and max odometer for total distance calculation
                    const odometers = entries.map(e => e.Odometer).filter(o => typeof o === 'number');
                    console.log('Odometer readings for basic calculation:', odometers);
                    if (odometers.length > 1) {
                        const minOdo = Math.min(...odometers);
                        const maxOdo = Math.max(...odometers);
                        const distance = maxOdo - minOdo;
                        console.log(`Correct distance calculation: ${maxOdo} - ${minOdo} = ${distance} km`);
                        console.log(`Total fuel used: ${totalLiters} L`);
                        
                        if (distance > 0) {
                            totalDistance = distance.toFixed(1);
                            
                            // Calculate correct efficiency: KM/L = Total Distance / Total Fuel
                            if (totalLiters > 0) {
                                const efficiency = distance / totalLiters;
                                avgEfficiency = efficiency.toFixed(2);
                                console.log(`Correct efficiency calculation: ${distance} km / ${totalLiters} L = ${efficiency.toFixed(2)} KM/L`);
                                
                                // Also update the trend to show this is a corrected calculation
                                const trendElement = document.getElementById('consumption-trend');
                                trendElement.className = 'stat-trend';
                                trendElement.innerHTML = '<i class="fas fa-calculator"></i> Corrected';
                            }
                        } else {
                            totalDistance = '0.0';
                            console.log('Zero distance calculated - no movement between entries');
                        }
                    } else {
                        console.log('Insufficient odometer readings for distance calculation');
                    }
                }

                document.getElementById('avg-consumption').textContent = avgEfficiency;
                document.getElementById('total-distance').textContent = totalDistance;
                document.getElementById('total-fuel').textContent = totalLiters.toFixed(1);
                document.getElementById('total-cost').textContent = totalCost.toFixed(2);

                // Reset trend display if no efficiency calculated
                if (avgEfficiency === '--') {
                    const trendElement = document.getElementById('consumption-trend');
                    trendElement.className = 'stat-trend';
                    trendElement.innerHTML = '<i class="fas fa-minus"></i> --';
                }

                // Show informative message
                if (entries.length === 1) {
                    showToast('Add one more fuel entry to see consumption statistics', 'info');
                } else if (avgEfficiency !== '--') {
                    showToast(`Efficiency calculated: ${avgEfficiency} KM/L (total distance ÷ total fuel)`, 'success');
                } else {
                    const message = data.message || 'Not enough data to calculate consumption. For multiple daily fuel entries, ensure you have valid fuel amounts and odometer readings that progress correctly between days.';
                    showToast(message, 'info');
                }
            } else {
                // No entries at all
                document.getElementById('avg-consumption').textContent = '--';
                document.getElementById('total-distance').textContent = '--';
                document.getElementById('total-fuel').textContent = '--';
                document.getElementById('total-cost').textContent = '--';

                // Reset trend display
                const trendElement = document.getElementById('consumption-trend');
                trendElement.className = 'stat-trend';
                trendElement.innerHTML = '<i class="fas fa-minus"></i> --';

                showToast('No fuel entries found. Add your first entry to get started!', 'info');
            }
            
            // Clear chart
            if (consumptionChart) {
                consumptionChart.destroy();
            }
            
            const ctx = document.getElementById('consumption-chart').getContext('2d');
            consumptionChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Fuel Efficiency (KM/L)',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false
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
                                text: 'Date'
                            }
                        },
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Kilometers per Liter (KM/L)'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: entries.length === 1 ? 'Add more entries to see efficiency trends' : 'No data available'
                        }
                    }
                }
            });
            
            // Still show recent entries if available
            const recentEntries = entries
                .sort((a, b) => new Date(b.EntryDate) - new Date(a.EntryDate)) // Sort newest first
                .slice(0, 5);
            const tbody = document.querySelector('#recent-entries-table tbody');
            tbody.innerHTML = '';
            
            if (recentEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">No entries found. Add your first fuel entry!</td></tr>';
            } else {
                // Get all entries for the current vehicle to calculate distances
                const allEntries = data.entries || [];
                
                recentEntries.forEach(entry => {
                    let kmDriven = '--';
                    
                    // Calculate distance driven for this entry
                    if (allEntries.length > 1) {
                        // Find all entries for the same vehicle, sorted by date (oldest first for distance calculation)
                        const vehicleEntries = allEntries.filter(e => e.VehicleId === entry.VehicleId)
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
                    }
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${formatDateTime(entry.EntryDate)}</td>
                        <td>${entry.Odometer.toFixed(1)}</td>
                        <td>${kmDriven}</td>
                        <td>${entry.Liters.toFixed(2)}</td>
                        <td>${entry.PricePerLiter?.toFixed(2) || '--'}</td>
                        <td>${entry.TotalCost.toFixed(2)}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
            
            return;
        }
        
        // Update stats cards with calculated statistics
        // Check if server calculation is reasonable, if not use manual calculation
        let avgEfficiency;
        
        console.log('Server stats data:', {
            avgConsumption: data.stats.avgConsumption,
            totalDistance: data.stats.totalDistance,
            totalLiters: data.stats.totalLiters,
            totalCost: data.stats.totalCost
        });
        
        // Always calculate manually first for verification
        let manualEfficiency = 0;
        if (data.stats.totalDistance > 0 && data.stats.totalLiters > 0) {
            manualEfficiency = data.stats.totalDistance / data.stats.totalLiters;
            console.log(`Manual calculation: ${data.stats.totalDistance} km / ${data.stats.totalLiters} L = ${manualEfficiency.toFixed(2)} KM/L`);
        }
        
        // Try to determine server calculation
        if (data.stats.avgConsumption > 0) {
            // Check different possible formats the server might be using
            let serverEfficiency1 = data.stats.avgConsumption; // Direct KM/L
            let serverEfficiency2 = 100 / data.stats.avgConsumption; // L/100km converted to KM/L
            
            console.log(`Server value: ${data.stats.avgConsumption}`);
            console.log(`Option 1 (direct KM/L): ${serverEfficiency1.toFixed(2)}`);
            console.log(`Option 2 (converted from L/100km): ${serverEfficiency2.toFixed(2)}`);
            console.log(`Manual calculation: ${manualEfficiency.toFixed(2)}`);
            
            // Use the server value that's closest to manual calculation, or manual if both are way off
            const diff1 = Math.abs(serverEfficiency1 - manualEfficiency);
            const diff2 = Math.abs(serverEfficiency2 - manualEfficiency);
            const diff3 = 0; // Manual is always exact match to itself
            
            if (manualEfficiency > 0 && (diff1 > 10 && diff2 > 10)) {
                // Both server calculations are way off, use manual
                avgEfficiency = manualEfficiency;
                console.log(`Using manual calculation (server values too far off)`);
                showToast(`Corrected efficiency: ${avgEfficiency.toFixed(2)} KM/L (server calculation was incorrect)`, 'warning');
            } else if (diff1 <= diff2) {
                // Direct value is closer
                avgEfficiency = serverEfficiency1;
                console.log(`Using direct server value`);
            } else {
                // Converted value is closer
                avgEfficiency = serverEfficiency2;
                console.log(`Using converted server value (L/100km → KM/L)`);
            }
        } else {
            // Server didn't provide avgConsumption, use manual
            avgEfficiency = manualEfficiency;
            console.log(`Using manual calculation (no server avgConsumption)`);
        }
        
        console.log('Final Stats Update:', {
            avgConsumption: data.stats.avgConsumption,
            avgEfficiency: avgEfficiency,
            totalDistance: data.stats.totalDistance,
            totalLiters: data.stats.totalLiters,
            totalCost: data.stats.totalCost
        });
        
        document.getElementById('avg-consumption').textContent = avgEfficiency.toFixed(2);
        document.getElementById('total-distance').textContent = data.stats.totalDistance.toFixed(1);
        document.getElementById('total-fuel').textContent = data.stats.totalLiters.toFixed(1);
        document.getElementById('total-cost').textContent = data.stats.totalCost.toFixed(2);
        
        // Calculate and display consumption trend (percentage change from last fueling)
        const trendElement = document.getElementById('consumption-trend');
        if (data.stats.consumptionData && data.stats.consumptionData.length >= 2) {
            const consumptionData = data.stats.consumptionData;
            // Get the last two consumption values (convert from L/100km to KM/L)
            const lastEfficiency = consumptionData[consumptionData.length - 1].consumption > 0 ? 
                (100 / consumptionData[consumptionData.length - 1].consumption) : 0;
            const previousEfficiency = consumptionData[consumptionData.length - 2].consumption > 0 ? 
                (100 / consumptionData[consumptionData.length - 2].consumption) : 0;
            
            if (previousEfficiency > 0) {
                const percentageChange = ((lastEfficiency - previousEfficiency) / previousEfficiency) * 100;
                
                // Determine trend color based on percentage change
                let trendClass = 'stat-trend';
                let trendIcon = 'fas fa-minus';
                
                if (percentageChange > 0) {
                    // Positive change - show green
                    trendClass = 'stat-trend up';
                    trendIcon = 'fas fa-arrow-up';
                } else if (percentageChange < 0) {
                    // Negative change - show red
                    trendClass = 'stat-trend down';
                    trendIcon = 'fas fa-arrow-down';
                } else {
                    // No change (exactly 0%) - show blue
                    trendClass = 'stat-trend neutral';
                    trendIcon = 'fas fa-minus';
                }
                
                // Update trend display
                trendElement.className = trendClass;
                trendElement.innerHTML = `
                    <i class="${trendIcon}"></i> ${Math.abs(percentageChange).toFixed(1)}%
                `;
            } else {
                trendElement.className = 'stat-trend';
                trendElement.innerHTML = '<i class="fas fa-minus"></i> --';
            }
        } else {
            // Not enough data for trend calculation
            trendElement.className = 'stat-trend';
            trendElement.innerHTML = '<i class="fas fa-minus"></i> --';
        }
        
        // Show calculation note if present
        if (data.stats.calculationNote) {
            showToast(data.stats.calculationNote, 'info');
        }
        
        // Update consumption chart - convert L/100km to KM/L
        // Sort consumption data by date to ensure proper chronological order (oldest to newest)
        // Use more robust date parsing to handle various date formats
        const sortedConsumptionData = [...data.stats.consumptionData].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            console.log(`Comparing dates: ${a.date} (${dateA.toISOString()}) vs ${b.date} (${dateB.toISOString()})`);
            return dateA - dateB;
        });
        
        // Debug: Log the sorted data to verify order
        console.log('=== CONSUMPTION DATA SORTING DEBUG ===');
        console.log('Original data:', data.stats.consumptionData.map(item => ({ date: item.date, consumption: item.consumption })));
        console.log('Sorted data:', sortedConsumptionData.map(item => ({ date: item.date, consumption: item.consumption })));
        
        // Limit to last 6 consumption data points for cleaner dashboard display
        const last6ConsumptionData = sortedConsumptionData.slice(-6);
        console.log(`Limiting dashboard chart to last 6 consumption data points (out of ${sortedConsumptionData.length} total)`);
        
        // Use formatted dates for labels to ensure proper display
        const labels = last6ConsumptionData.map(item => 
            formatDate(item.date)
        );
        console.log('Chart labels in order:', labels);
        console.log('=== END SORTING DEBUG ===');
        
        // Convert from L/100km to KM/L: KM/L = 100 / (L/100km)
        const efficiencyData = last6ConsumptionData.map(item => 
            item.consumption > 0 ? (100 / item.consumption).toFixed(2) : 0
        );
        
        // Prepare fuel entry data points for overlay - limit to match chart labels
        const fuelEntryData = [];
        const fuelEntryLabels = [];
        
        if (data.entries && data.entries.length > 0) {
            // Sort entries by date and take only entries that match our limited chart labels
            const sortedEntries = [...data.entries].sort((a, b) => new Date(a.EntryDate) - new Date(b.EntryDate));
            
            console.log(`Matching fuel entries to limited chart labels (${labels.length} labels)`);
            
            sortedEntries.forEach(entry => {
                const entryDate = formatDate(entry.EntryDate);
                fuelEntryLabels.push(entryDate);
                
                // Only add fuel entry points if their date exists in our limited consumption chart labels
                // This ensures the fuel entry scatter points match the limited x-axis
                if (labels.includes(entryDate)) {
                    fuelEntryData.push({
                        x: entryDate,
                        y: entry.IsFullTank ? 1 : 0.5, // Different heights for full vs partial tank
                        liters: entry.Liters,
                        cost: entry.TotalCost,
                        isFullTank: entry.IsFullTank,
                        odometer: entry.Odometer
                    });
                }
            });
        }
        
        console.log('Fuel entry labels:', fuelEntryLabels);
        console.log('Filtered fuel entry data:', fuelEntryData.map(f => f.x));
        
        if (consumptionChart) {
            consumptionChart.destroy();
        }
        
        const ctx = document.getElementById('consumption-chart').getContext('2d');
        
        // Prepare datasets - efficiency line + fuel entry points
        const datasets = [{
            label: 'Fuel Efficiency (KM/L)',
            data: efficiencyData,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            tension: 0.1,
            fill: false,
            type: 'line',
            yAxisID: 'y'
        }];
        
        // Add fuel entry scatter points if we have entries
        if (fuelEntryData.length > 0) {
            datasets.push({
                label: 'Full Tank Entries',
                data: fuelEntryData.filter(entry => entry.isFullTank),
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgb(255, 99, 132)',
                pointRadius: 6,
                pointHoverRadius: 8,
                type: 'scatter',
                yAxisID: 'y1',
                showLine: false
            });
            
            datasets.push({
                label: 'Partial Tank Entries',
                data: fuelEntryData.filter(entry => !entry.isFullTank),
                backgroundColor: 'rgba(255, 206, 86, 0.8)',
                borderColor: 'rgb(255, 206, 86)',
                pointRadius: 4,
                pointHoverRadius: 6,
                type: 'scatter',
                yAxisID: 'y1',
                showLine: false
            });
        }
        
        consumptionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'point',
                    intersect: true,
                },
                hover: {
                    mode: 'point',
                    intersect: true,
                },
                scales: {
                    x: {
                        type: 'category',
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Kilometers per Liter (KM/L)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        min: 0,
                        max: 1.5,
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    tooltip: {
                        // Disable the default tooltip display
                        enabled: false,
                        // Custom positioning function
                        external: function(context) {
                            const {chart, tooltip} = context;
                            
                            // Tooltip element
                            let tooltipEl = chart.canvas.parentNode.querySelector('div.chartjs-tooltip');
                            
                            // Create element on first render
                            if (!tooltipEl) {
                                tooltipEl = document.createElement('div');
                                tooltipEl.className = 'chartjs-tooltip';
                                tooltipEl.style.background = 'rgba(0, 0, 0, 0.8)';
                                tooltipEl.style.borderRadius = '6px';
                                tooltipEl.style.color = 'white';
                                tooltipEl.style.fontSize = '12px';
                                tooltipEl.style.fontFamily = 'Arial, sans-serif';
                                tooltipEl.style.padding = '8px 12px';
                                tooltipEl.style.pointerEvents = 'none';
                                tooltipEl.style.position = 'absolute';
                                tooltipEl.style.zIndex = '1000';
                                tooltipEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                                tooltipEl.style.maxWidth = '200px';
                                tooltipEl.style.wordWrap = 'break-word';
                                tooltipEl.style.opacity = '0';
                                tooltipEl.style.visibility = 'hidden';
                                chart.canvas.parentNode.appendChild(tooltipEl);
                            }
                            
                            // Hide if no tooltip or no data points
                            if (tooltip.opacity === 0 || !tooltip.dataPoints || tooltip.dataPoints.length === 0) {
                                tooltipEl.style.opacity = '0';
                                tooltipEl.style.visibility = 'hidden';
                                return;
                            }
                            
                            // Filter out unwanted tooltips - only show for valid data
                            const dataPoint = tooltip.dataPoints[0];
                            const datasetIndex = dataPoint.datasetIndex;
                            
                            // Skip if it's a scatter point with y=0 (invisible placeholder)
                            if (datasetIndex > 0 && dataPoint.parsed.y === 0) {
                                tooltipEl.style.opacity = '0';
                                tooltipEl.style.visibility = 'hidden';
                                return;
                            }
                            
                            // Set tooltip content
                            let innerHtml = '';
                            
                            if (datasetIndex === 0) {
                                // Efficiency data (line chart)
                                innerHtml = `<div>Fuel Efficiency: ${dataPoint.parsed.y} KM/L</div>`;
                            } else {
                                // Fuel entry data (scatter points)
                                const entry = dataPoint.raw;
                                if (entry && entry.liters !== undefined) {
                                    innerHtml = `<div>${dataPoint.dataset.label}</div>`;
                                    innerHtml += `<div>Fuel: ${entry.liters.toFixed(2)}L</div>`;
                                    innerHtml += `<div>Cost: ${entry.cost.toFixed(2)}</div>`;
                                    innerHtml += `<div>Odometer: ${entry.odometer.toFixed(1)}km</div>`;
                                } else {
                                    // Invalid entry data, hide tooltip
                                    tooltipEl.style.opacity = '0';
                                    tooltipEl.style.visibility = 'hidden';
                                    return;
                                }
                            }
                            
                            tooltipEl.innerHTML = innerHtml;
                            
                            // Position tooltip
                            const position = chart.canvas.getBoundingClientRect();
                            const chartArea = chart.chartArea;
                            
                            // Calculate position relative to chart area (not screen)
                            const offsetX = 10;
                            const offsetY = 10;
                            
                            // Get tooltip dimensions (estimate if not available)
                            const tooltipWidth = tooltipEl.offsetWidth || 150;
                            const tooltipHeight = tooltipEl.offsetHeight || 50;
                            
                            // Calculate tooltip position relative to the chart area
                            let tooltipX, tooltipY;
                            
                            // Determine horizontal positioning (opposite side of chart)
                            if (tooltip.caretX < chartArea.width / 2) {
                                // Point is on left side - show tooltip on right side of point
                                tooltipX = position.left + chartArea.left + tooltip.caretX + offsetX;
                                tooltipEl.style.transform = 'translate(0%, -50%)';
                                
                                // Ensure tooltip doesn't go beyond right edge of chart area
                                const maxX = position.left + chartArea.right - tooltipWidth;
                                if (tooltipX > maxX) {
                                    tooltipX = maxX;
                                }
                            } else {
                                // Point is on right side - show tooltip on left side of point
                                tooltipX = position.left + chartArea.left + tooltip.caretX - tooltipWidth - offsetX;
                                tooltipEl.style.transform = 'translate(0%, -50%)';
                                
                                // Ensure tooltip doesn't go beyond left edge of chart area
                                const minX = position.left + chartArea.left;
                                if (tooltipX < minX) {
                                    tooltipX = minX;
                                }
                            }
                            
                            // Vertical positioning (centered on point, but within chart bounds)
                            tooltipY = position.top + chartArea.top + tooltip.caretY - (tooltipHeight / 2);
                            
                            // Ensure tooltip stays within chart vertical boundaries
                            const minY = position.top + chartArea.top;
                            const maxY = position.top + chartArea.bottom - tooltipHeight;
                            
                            if (tooltipY < minY) {
                                // Too close to top - position at top of chart
                                tooltipY = minY + 5;
                                tooltipEl.style.transform = 'translate(0%, 0%)';
                            } else if (tooltipY > maxY) {
                                // Too close to bottom - position at bottom of chart
                                tooltipY = maxY - 5;
                                tooltipEl.style.transform = 'translate(0%, -100%)';
                            }
                            
                            // Ensure final position is within chart bounds
                            const chartLeft = position.left + chartArea.left;
                            const chartRight = position.left + chartArea.right;
                            const chartTop = position.top + chartArea.top;
                            const chartBottom = position.top + chartArea.bottom;
                            
                            tooltipX = Math.max(chartLeft, Math.min(tooltipX, chartRight - tooltipWidth));
                            tooltipY = Math.max(chartTop, Math.min(tooltipY, chartBottom - tooltipHeight));
                            
                            // Set final position and show tooltip
                            tooltipEl.style.left = tooltipX + 'px';
                            tooltipEl.style.top = tooltipY + 'px';
                            tooltipEl.style.opacity = '1';
                            tooltipEl.style.visibility = 'visible';
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
        
        // Update recent entries table
        const recentEntries = data.entries ? 
            data.entries
                .sort((a, b) => new Date(b.EntryDate) - new Date(a.EntryDate)) // Sort newest first
                .slice(0, 5) : 
            [];
        const tbody = document.querySelector('#recent-entries-table tbody');
        tbody.innerHTML = '';
        
        if (recentEntries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No entries found</td></tr>';
        } else {
            // Get all entries for distance calculation
            const allEntries = data.entries || [];
            
            recentEntries.forEach(entry => {
                let kmDriven = '--';
                
                // Calculate distance driven for this entry
                if (allEntries.length > 1) {
                    // Find all entries for the same vehicle, sorted by date (oldest first for distance calculation)
                    const vehicleEntries = allEntries.filter(e => e.VehicleId === entry.VehicleId)
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
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDateTime(entry.EntryDate)}</td>
                    <td>${entry.Odometer.toFixed(1)}</td>
                    <td>${kmDriven}</td>
                    <td>${entry.Liters.toFixed(2)}</td>
                    <td>${entry.PricePerLiter?.toFixed(2) || '--'}</td>
                    <td>${entry.TotalCost.toFixed(2)}</td>
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
                console.log(`Date conversion for backend: "${date}" -> "${entryDate}"`);
            }
        }
        
        console.log('Form Values:', {
            vehicleId,
            date,
            entryDate,
            odometer,
            liters,
            pricePerLiter,
            totalCost,
            calculatedTotal: liters * pricePerLiter,
            isFullTank,
            notes
        });
        
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
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
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
                    userId: userData.userId,
                    vehicleId,
                    odometer,
                    liters,
                    pricePerLiter,
                    totalCost: totalCost || (liters * pricePerLiter), // Use form value or calculate
                    isFullTank,
                    notes,
                    entryDate: entryDate
                })
            });
            
            // Handle unauthorized response
            if (response.status === 401) {
                console.log('401 Unauthorized - Token validation failed on server');
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
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            let url = `${apiBaseUrl}/getFuelEntries?userId=${userData.userId}`;
            if (vehicleId) url += `&vehicleId=${vehicleId}`;
            if (startDate) url += `&startDate=${startDate.toISOString()}`;
            if (endDate) url += `&endDate=${endDate.toISOString()}`;
            
            console.log('=== REPORT DATE DEBUGGING ===');
            console.log('Period:', period);
            console.log('Start Date (Local):', startDate.toLocaleString());
            console.log('Start Date (ISO):', startDate.toISOString());
            console.log('End Date (Local):', endDate.toLocaleString());
            console.log('End Date (ISO):', endDate.toISOString());
            console.log('API URL:', url);
            console.log('=== END DATE DEBUGGING ===');
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Handle unauthorized response
            if (response.status === 401) {
                console.log('401 Unauthorized - Token validation failed on server');
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load fuel entries: ${errorText}`);
            }
            
            const entries = await response.json();
            
            console.log('=== ENTRIES RETURNED BY API ===');
            console.log('Total entries:', entries.length);
            entries.forEach((entry, index) => {
                const entryDate = new Date(entry.EntryDate);
                console.log(`Entry ${index + 1}:`, {
                    date: entry.EntryDate,
                    dateLocal: entryDate.toLocaleString(),
                    dateISO: entryDate.toISOString(),
                    vehicleId: entry.VehicleId,
                    odometer: entry.Odometer,
                    liters: entry.Liters,
                    cost: entry.TotalCost,
                    isInRange: entryDate >= startDate && entryDate <= endDate
                });
            });
            console.log('=== END ENTRIES DEBUG ===');
            
            if (entries.length === 0) {
                showToast('No entries found for the selected criteria', 'info');
                return;
            }
            
            // Process data for charts
            const vehicleMap = {};
            userVehicles.forEach(v => vehicleMap[v.VehicleId] = `${v.Make} ${v.Model}`);
            
            // Universal calculation function that works for any time period
            function calculateEfficiencyForPeriod(entries, periodLabel) {
                console.log(`\n=== CALCULATING EFFICIENCY FOR ${periodLabel} ===`);
                console.log('Total entries:', entries.length);
                
                // Group entries by vehicle
                const vehicleGroups = {};
                entries.forEach(entry => {
                    if (!vehicleGroups[entry.VehicleId]) {
                        vehicleGroups[entry.VehicleId] = [];
                    }
                    vehicleGroups[entry.VehicleId].push(entry);
                });
                
                let totalDistance = 0;
                let totalFuelConsumed = 0;
                let totalFuelPurchased = 0;
                let totalCost = 0;
                
                // Calculate for each vehicle using segment-based approach
                Object.keys(vehicleGroups).forEach(vehicleId => {
                    const vehicleEntries = vehicleGroups[vehicleId];
                    
                    // Sort entries by date/time ascending (oldest first)
                    const sortedEntries = vehicleEntries.sort((a, b) => new Date(a.EntryDate) - new Date(b.EntryDate));
                    
                    console.log(`\nVehicle ${vehicleId} (${vehicleMap[vehicleId] || 'Unknown'}):`);
                    console.log('Sorted entries:', sortedEntries.map(e => ({
                        date: e.EntryDate.substring(0, 16), // Show date and time
                        odometer: e.Odometer,
                        liters: e.Liters
                    })));
                    
                    let vehicleDistance = 0;
                    let vehicleFuelConsumed = 0;
                    
                    // Calculate distance per refuel: newer odometer - previous odometer
                    for (let i = 1; i < sortedEntries.length; i++) {
                        const currentEntry = sortedEntries[i];
                        const previousEntry = sortedEntries[i - 1];
                        
                        const distanceSegment = currentEntry.Odometer - previousEntry.Odometer;
                        
                        if (distanceSegment > 0) {
                            vehicleDistance += distanceSegment;
                            // The fuel consumed is from the current entry (fuel used to travel the distance)
                            vehicleFuelConsumed += currentEntry.Liters;
                            
                            console.log(`  Segment ${i}: ${currentEntry.Odometer} - ${previousEntry.Odometer} = ${distanceSegment} km, fuel used: ${currentEntry.Liters} L`);
                        } else if (distanceSegment < 0) {
                            console.log(`  Segment ${i}: INVALID - negative distance ${distanceSegment} km (${currentEntry.Odometer} - ${previousEntry.Odometer})`);
                        } else {
                            console.log(`  Segment ${i}: No distance change (${currentEntry.Odometer} - ${previousEntry.Odometer} = 0 km)`);
                        }
                    }
                    
                    // Calculate totals for this vehicle
                    const vehicleFuelPurchased = vehicleEntries.reduce((sum, e) => sum + e.Liters, 0);
                    const vehicleCost = vehicleEntries.reduce((sum, e) => sum + e.TotalCost, 0);
                    
                    console.log(`  Vehicle totals: ${vehicleDistance} km, ${vehicleFuelConsumed} L consumed, ${vehicleFuelPurchased} L purchased`);
                    
                    // Add to overall totals
                    totalDistance += vehicleDistance;
                    totalFuelConsumed += vehicleFuelConsumed;
                    totalFuelPurchased += vehicleFuelPurchased;
                    totalCost += vehicleCost;
                });
                
                console.log(`\n=== ${periodLabel} TOTALS ===`);
                console.log(`Total Distance: ${totalDistance} km`);
                console.log(`Total Fuel Consumed (for distance): ${totalFuelConsumed} L`);
                console.log(`Total Fuel Purchased: ${totalFuelPurchased} L`);
                console.log(`Total Cost: ${totalCost}`);
                
                // Calculate efficiency
                let efficiency = 0;
                if (totalDistance > 0 && totalFuelConsumed > 0) {
                    efficiency = totalDistance / totalFuelConsumed;
                    console.log(`Efficiency: ${totalDistance} ÷ ${totalFuelConsumed} = ${efficiency.toFixed(2)} KM/L`);
                } else {
                    console.log('Cannot calculate efficiency - insufficient data');
                }
                
                return {
                    totalDistance,
                    totalFuelConsumed,
                    totalFuelPurchased,
                    totalCost,
                    efficiency
                };
            }
            
            // Determine grouping strategy based on period
            let groupedData = {};
            
            if (period === 'month' || period === 'year') {
                // Group by month for chart display
                entries.forEach(entry => {
                    const date = new Date(entry.EntryDate);
                    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    
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
                
                // Only calculate consumption for full tank entries
                if (entry.IsFullTank) {
                    // Use the same vehicle entries list, but sorted by date (newest first) for consumption calculation
                    const vehicleEntriesNewestFirst = entries.filter(e => e.VehicleId === entry.VehicleId)
                        .sort((a, b) => new Date(b.EntryDate) - new Date(a.EntryDate));
                    
                    // Find the current entry's position in the sorted list
                    const currentIndexNewest = vehicleEntriesNewestFirst.findIndex(e => 
                        e.EntryDate === entry.EntryDate && e.Odometer === entry.Odometer
                    );
                    
                    // Look for the next entry chronologically (previous in our sorted list)
                    if (currentIndexNewest < vehicleEntriesNewestFirst.length - 1) {
                        const nextEntry = vehicleEntriesNewestFirst[currentIndexNewest + 1];
                        
                        // Check if the next entry is also a full tank
                        if (nextEntry.IsFullTank) {
                            // Check if there are any non-full tank entries between these two
                            const entriesBetween = vehicleEntriesNewestFirst.slice(currentIndexNewest + 1)
                                .filter(e => 
                                    new Date(e.EntryDate) > new Date(nextEntry.EntryDate) &&
                                    new Date(e.EntryDate) < new Date(entry.EntryDate)
                                );
                            
                            // Only show consumption if there are no non-full tank entries in between
                            const hasNonFullTankBetween = entriesBetween.some(e => !e.IsFullTank);
                            
                            if (!hasNonFullTankBetween) {
                                const distance = entry.Odometer - nextEntry.Odometer;
                                if (distance > 0) {
                                    // Calculate KM/L: distance traveled since last fill-up / fuel used in current fill-up
                                    consumption = (distance / entry.Liters).toFixed(2) + ' KM/L';
                                }
                            }
                        }
                    }
                }
                
                const row = document.createElement('tr');
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
            
            // Get token from localStorage to ensure it's fresh
            const token = localStorage.getItem('fuelTrackerToken');
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            const response = await fetch(`${apiBaseUrl}/fuelEntries/${entryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Handle unauthorized response
            if (response.status === 401) {
                console.log('401 Unauthorized - Token validation failed on server');
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete fuel entry: ${errorText}`);
            }
            
            showToast('Fuel entry deleted successfully', 'success');
            
            // Refresh the dashboard if we're viewing the same vehicle
            const dashboardSelect = document.getElementById('dashboard-vehicle-select');
            if (dashboardSelect && dashboardSelect.value === vehicleId) {
                await loadVehicleStats(vehicleId);
            }
            
            // Refresh the report if it's currently displayed
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
        
        // Collect consumables data
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
                    quantity: quantity,
                    unitPrice: unitPrice,
                    totalPrice: total
                });
            }
        });
        
        try {
            showLoading();
            
            const token = localStorage.getItem('fuelTrackerToken');
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            // Use the dedicated service-addService endpoint
            const serviceData = {
                userId: userData.userId,
                vehicleId: vehicleId,
                serviceDate: serviceDate,
                serviceType: serviceType,
                billNumber: billNumber,
                odometer: odometer,
                laborCost: laborCost,
                totalServiceCost: totalServiceCost,
                serviceNotes: serviceNotes,
                consumables: consumables
            };
            
            // Using dedicated service-addService endpoint
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
            
            // Reset date to today
            document.getElementById('service-date').value = new Date().toISOString().split('T')[0];
            
            // Clear consumables and restore placeholder
            const consumablesList = document.getElementById('consumables-list');
            consumablesList.innerHTML = '<div class="no-consumables"><p>No consumables added yet. Click "Add Item" to add parts and materials used in this service.</p></div>';
            document.getElementById('total-parts-cost').value = '';
            
            // Refresh service history if it's loaded
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
        
        console.log('Set default service history period to: This Month');
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
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            // Get selected vehicle filter
            const vehicleSelect = document.getElementById('service-history-vehicle-select'); 
            const selectedVehicleId = vehicleSelect ? vehicleSelect.value : '';
            
            // Get date filter values using the new dropdown approach
            const { startDate, endDate } = getServiceDateRange();
            
            // Use the dedicated service-getServices endpoint
            let url = `${apiBaseUrl}/service-getServices?userId=${userData.userId}`;
            if (selectedVehicleId) {
                url += `&vehicleId=${selectedVehicleId}`;
            }
            if (startDate) {
                url += `&startDate=${startDate}`;
            }
            if (endDate) {
                url += `&endDate=${endDate}`;
            }
            
            console.log('Loading service history with filters:', { 
                vehicleId: selectedVehicleId || 'all', 
                startDate: startDate || 'none', 
                endDate: endDate || 'none' 
            });
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load service history: ${errorText}`);
            }
            
            const data = await response.json();
            const serviceRecords = data.services || [];
            
            // Debug: Log the API response
            console.log('Service history API response:', {
                dataKeys: Object.keys(data),
                servicesCount: serviceRecords.length,
                summary: data.summary,
                firstService: serviceRecords[0]
            });
            
            // Update service history stats using API summary
            updateServiceHistoryStats(serviceRecords, data.summary);
            
            // Update service history table
            updateServiceHistoryTable(serviceRecords);
            
            // Show filtering status
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
        
        // Debug: Check if elements exist
        console.log('Service history elements found:', {
            totalServices: !!totalServicesElement,
            totalServiceCost: !!totalServiceCostElement,
            avgServiceCost: !!avgServiceCostElement,
            lastServiceDate: !!lastServiceDateElement
        });
        
        if (serviceRecords.length === 0) {
            if (totalServicesElement) totalServicesElement.textContent = '0';
            if (totalServiceCostElement) totalServiceCostElement.textContent = '0.00';
            if (avgServiceCostElement) avgServiceCostElement.textContent = '0.00';
            if (lastServiceDateElement) lastServiceDateElement.textContent = 'Never';
            return;
        }
        
        // Use summary data if available, otherwise calculate from records
        const totalServices = summary ? summary.totalServices : serviceRecords.length;
        const totalCost = summary ? summary.totalCost : serviceRecords.reduce((sum, record) => sum + (record.TotalServiceCost || 0), 0);
        const avgCost = summary ? summary.avgCost : (totalCost / totalServices);
        const lastServiceDate = summary ? summary.lastServiceDate : (serviceRecords.length > 0 ? serviceRecords[0].ServiceDate : null);
        
        // Debug: Log the calculated values
        console.log('Service history stats:', {
            totalServices,
            totalCost,
            avgCost,
            lastServiceDate,
            summary
        });
        
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
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
                hideLoading();
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }

            // Get service details from the service-getServices endpoint
            const response = await fetch(`${apiBaseUrl}/service-getServices?userId=${userData.userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                hideLoading();
                throw new Error('Failed to load service details');
            }
            
            const data = await response.json();
            const serviceRecord = data.services.find(item => item.ServiceId === serviceId);
            
            if (!serviceRecord) {
                hideLoading();
                showToast('Service record not found', 'error');
                return;
            }
            
            hideLoading();
            showServiceDetailsModal(serviceRecord);
            
        } catch (error) {
            hideLoading();
            console.error('View service details error:', error);
            showToast(error.message, 'error');
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
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            const response = await fetch(`${apiBaseUrl}/service-deleteService/${serviceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete service record: ${errorText}`);
            }
            
            showToast('Service record deleted successfully', 'success');
            loadServiceHistory(); // Refresh the service history
            
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
        
        // 1. Get token and user data from storage
        const authToken = localStorage.getItem('fuelTrackerToken');
        const userData = JSON.parse(localStorage.getItem('fuelTrackerUser'));
        
        if (!authToken || !userData?.userId) {
            throw new Error('Authentication required');
        }

        // 2. Make the GET request with authorization header
        const response = await fetch(`${apiBaseUrl}/getVehicles?userId=${userData.userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        // 3. Handle unauthorized response
        if (response.status === 401) {
            localStorage.removeItem('fuelTrackerToken');
            localStorage.removeItem('fuelTrackerUser');
            window.location.href = '/login';
            return;
        }

        // 4. Handle other errors
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to load vehicles');
        }

        // 5. Process successful response
        const vehicles = await response.json();
        userVehicles = vehicles; // Update global userVehicles array
        renderUserVehicles(); // Call the correct function to display vehicles
        
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
    
    // Get form values
    const make = document.getElementById('vehicle-make')?.value.trim();
    const model = document.getElementById('vehicle-model')?.value.trim();
    const year = document.getElementById('vehicle-year')?.value;
    const fuelType = document.getElementById('vehicle-fuel-type')?.value;
    const odometer = parseFloat(document.getElementById('vehicle-odometer')?.value) || 0;

    // Validate required fields
    if (!make || !model) {
        showToast('Make and model are required', 'error');
        if (!make) document.getElementById('vehicle-make').classList.add('error');
        if (!model) document.getElementById('vehicle-model').classList.add('error');
        return;
    }

    try {
        showLoading();
        
        // 1. Get token from storage
        const authToken = localStorage.getItem('fuelTrackerToken');
        if (!authToken) {
            throw new Error('Please log in first');
        }

        // 2. Get user data
        const userData = JSON.parse(localStorage.getItem('fuelTrackerUser'));
        if (!userData?.userId) {
            throw new Error('User data missing');
        }

        // 3. Make the request with authorization header
        const response = await fetch(`${apiBaseUrl}/vehicles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                userId: userData.userId,
                make,
                model,
                year: year ? parseInt(year) : null,
                initialOdometer: odometer,
                fuelType,
                timestamp: new Date().toISOString()
            })
        });

        // 4. Handle unauthorized response
        if (response.status === 401) {
            localStorage.removeItem('fuelTrackerToken');
            localStorage.removeItem('fuelTrackerUser');
            showToast('Session expired. Please log in again.', 'error');
            handleLogout();
            return;
        }

        // 5. Handle other errors
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Request failed');
        }

        // Success
        const data = await response.json();
        showToast('Vehicle added successfully', 'success');
        hideAddVehicleModal();
        dashboardLoaded = false; // Reset dashboard loaded flag so it refreshes with new vehicle
        await loadUserVehicles();

    } catch (error) {
        console.error('Add vehicle error:', error);
        showToast(`Failed to add vehicle: ${error.message}`, 'error');
        
        // Special handling for auth errors
        if (error.message.includes('token') || error.message.includes('auth')) {
            localStorage.removeItem('fuelTrackerToken');
        }
    } finally {
        hideLoading();
    }
}

// Helper function to format dates as dd-mm-yyyy hh:mm
function formatDateTime(dateString) {
    // Handle the date conversion more carefully to preserve local timezone
    let date;
    
    // If the dateString looks like it's already in ISO format with Z (UTC), 
    // we need to convert it back to local time interpretation
    if (typeof dateString === 'string' && dateString.includes('T') && dateString.includes('Z')) {
        // This is a UTC timestamp, but we want to display it as if it were local time
        // because the user originally entered it as local time
        const utcDate = new Date(dateString);
        // Add back the timezone offset to get back to the original local time
        const offsetMs = utcDate.getTimezoneOffset() * 60000;
        date = new Date(utcDate.getTime() + offsetMs);
    } else if (typeof dateString === 'string' && dateString.includes('T') && !dateString.includes('Z')) {
        // This might be a local timestamp without timezone info
        // Treat it as local time
        date = new Date(dateString);
    } else {
        // Fallback for other formats
        date = new Date(dateString);
    }
    
    // Ensure we have a valid date
    if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid Date';
    }
    
    // Use local time methods to get the components
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Debug log to help troubleshoot timezone issues
    console.log(`Date conversion: "${dateString}" -> "${day}-${month}-${year} ${hours}:${minutes}" (Original: ${new Date(dateString).toLocaleString()}, Adjusted: ${date.toLocaleString()})`);
    
    // Check if screen is mobile size (this is approximate)
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // For mobile: shorter format with line break
        return `${day}/${month}/${year.toString().substr(-2)}<br><small>${hours}:${minutes}</small>`;
    } else {
        // For desktop: full format
        return `${day}-${month}-${year} ${hours}:${minutes}`;
    }
}

// Helper function to format dates as dd-mm-yyyy (without time)
function formatDate(dateString) {
    // Handle the date conversion more carefully to preserve local timezone
    let date;
    
    // If the dateString looks like it's already in ISO format with Z (UTC), 
    // we need to convert it back to local time interpretation
    if (typeof dateString === 'string' && dateString.includes('T') && dateString.includes('Z')) {
        // This is a UTC timestamp, but we want to display it as if it were local time
        // because the user originally entered it as local time
        const utcDate = new Date(dateString);
        // Add back the timezone offset to get back to the original local time
        const offsetMs = utcDate.getTimezoneOffset() * 60000;
        date = new Date(utcDate.getTime() + offsetMs);
    } else if (typeof dateString === 'string' && dateString.includes('T') && !dateString.includes('Z')) {
        // This might be a local timestamp without timezone info
        date = new Date(dateString);
    } else {
        // Fallback for other formats
        date = new Date(dateString);
    }
    
    // Ensure we have a valid date
    if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid Date';
    }
    
    // Use local time methods to get the components
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
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

// Add a token validation test function
function testTokenValidation() {
    const token = localStorage.getItem('fuelTrackerToken');
    const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
    
    console.log('=== Token Validation Test ===');
    console.log('Token exists:', !!token);
    console.log('User data:', userData);
    
    if (token) {
        try {
            // Decode JWT payload (this is just for debugging - normally you shouldn't do this client-side)
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log('Token payload:', payload);
                console.log('Token expires:', new Date(payload.exp * 1000));
                console.log('Token is expired:', Date.now() > payload.exp * 1000);
            }
        } catch (e) {
            console.log('Error decoding token:', e.message);
        }
        
        // Test with backend
        fetch(`${apiBaseUrl}/test-token`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(response => {
            console.log('Backend token test response status:', response.status);
            return response.json();
        }).then(data => {
            console.log('Backend token test response:', data);
        }).catch(err => {
            console.log('Backend token test error:', err);
        });
    }
    console.log('=== End Test ===');
}

// Make it available globally for debugging
window.testTokenValidation = testTokenValidation;

// Helper function to attempt token refresh
async function tryRefreshToken() {
    try {
        const refreshToken = localStorage.getItem('refreshToken'); // If you have refresh tokens
        if (!refreshToken) return false;
        
        const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`
            }
        });
        
        if (response.ok) {
            const { token } = await response.json();
            localStorage.setItem('fuelTrackerToken', token);
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
    return false;
}


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
            
            // Get token from localStorage to ensure it's fresh
            const token = localStorage.getItem('fuelTrackerToken');
            if (!token) {
                showToast('Please log in again', 'error');
                handleLogout();
                return;
            }
            
            // Debug token information
            console.log('=== DELETE VEHICLE DEBUG ===');
            console.log('Vehicle ID:', vehicleId);
            console.log('Token exists:', !!token);
            console.log('Token preview:', token.substring(0, 20) + '...');
            console.log('Request URL:', `${apiBaseUrl}/deleteVehicle?vehicleId=${vehicleId}`);
            
            const response = await fetch(`${apiBaseUrl}/deleteVehicle?vehicleId=${vehicleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.status === 401) {
                console.log('401 Unauthorized received');
                const errorText = await response.text();
                console.log('Error response:', errorText);
                showToast('Session expired. Please log in again.', 'error');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response:', errorText);
                throw new Error(errorText || 'Failed to delete vehicle');
            }
            
            const result = await response.json();
            console.log('Delete successful:', result);
            
            showToast('Vehicle deleted successfully', 'success');
            dashboardLoaded = false; // Reset dashboard loaded flag so it refreshes after vehicle deletion
            await loadUserVehicles();
            
            // Update vehicle selectors
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
            
            // Get token from localStorage to ensure it's fresh
            const token = localStorage.getItem('fuelTrackerToken');
            const userData = JSON.parse(localStorage.getItem('fuelTrackerUser') || '{}');
            
            if (!token || !userData.userId) {
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
                    userId: userData.userId,
                    email,
                    fullName
                })
            });
            
            // Handle unauthorized response
            if (response.status === 401) {
                console.log('401 Unauthorized - Token validation failed on server');
                showToast('Session expired. Please log in again.', 'error');
                localStorage.removeItem('fuelTrackerToken');
                localStorage.removeItem('fuelTrackerUser');
                handleLogout();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update profile: ${errorText}`);
            }
            
            const data = await response.json();
            
            showToast('Profile updated successfully', 'success');
            
            // Update the stored user data
            userData.email = email;
            userData.fullName = fullName;
            localStorage.setItem('fuelTrackerUser', JSON.stringify(userData));
            
            // Update currentUser if it exists
            if (currentUser) {
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
                console.log('401 Unauthorized - Token validation failed on server');
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