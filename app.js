document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentUser = null;
    let authToken = null;
    let userVehicles = [];
    let consumptionChart = null;
    let reportConsumptionChart = null;
    let reportCostChart = null;
    
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
        // Auth tab switching
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
            
            // Auto-calculate when liters or price per liter changes - immediate calculation
            [litersInput, priceInput].forEach(input => {
                input.addEventListener('input', function() {
                    if (isCalculating || userIsEditingTotal) return; // Prevent recursive calculations
                    
                    if (this === litersInput) lastModified = 'liters';
                    if (this === priceInput) lastModified = 'price';
                    
                    const liters = parseFloat(litersInput.value) || 0;
                    const price = parseFloat(priceInput.value) || 0;
                    
                    // Calculate total immediately when both values are available
                    if (liters > 0 && price > 0) {
                        isCalculating = true;
                        const calculatedTotal = (liters * price).toFixed(2);
                        console.log(`Auto-calculating total: ${liters} × ${price} = ${calculatedTotal}`);
                        totalInput.value = calculatedTotal;
                        isCalculating = false;
                    } else if (liters === 0 || price === 0) {
                        // Clear total if one of the values is cleared
                        if (!userIsEditingTotal) {
                            totalInput.value = '';
                        }
                    }
                });
            });
            
            // Auto-calculate when total amount changes - both immediate and on blur
            let totalInputTimeout = null;
            let userIsEditingTotal = false;
            
            // Immediate calculation as user types (with short debounce)
            totalInput.addEventListener('input', function() {
                if (isCalculating) return;
                
                lastModified = 'total';
                
                // Clear any existing timeout
                if (totalInputTimeout) {
                    clearTimeout(totalInputTimeout);
                }
                
                // Set a very short delay for immediate feedback
                totalInputTimeout = setTimeout(() => {
                    if (!userIsEditingTotal) return; // Only calculate if user is actively editing
                    performTotalCalculation();
                }, 300); // 300ms for immediate feel
            });
            
            // When user starts editing the total field
            totalInput.addEventListener('focus', function() {
                userIsEditingTotal = true;
                if (totalInputTimeout) {
                    clearTimeout(totalInputTimeout);
                }
            });
            
            // When user finishes editing the total field
            totalInput.addEventListener('blur', function() {
                userIsEditingTotal = false;
                performTotalCalculation();
            });
            
            // Also listen for Enter key to trigger calculation
            totalInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    this.blur(); // This will trigger the blur event and calculation
                }
            });
            
            function performTotalCalculation() {
                if (isCalculating || userIsEditingTotal) return; // Prevent recursive calculations
                
                lastModified = 'total';
                
                const total = parseFloat(totalInput.value) || 0;
                const liters = parseFloat(litersInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                
                if (total > 0) {
                    isCalculating = true;
                    
                    // If liters is filled but price is empty, calculate price per liter
                    if (liters > 0 && price === 0) {
                        priceInput.value = (total / liters).toFixed(2);
                    }
                    // If price is filled but liters is empty, calculate liters
                    else if (price > 0 && liters === 0) {
                        litersInput.value = (total / price).toFixed(2);
                    }
                    // If both liters and price are filled, determine which one to update
                    // based on which was modified last (before total)
                    else if (liters > 0 && price > 0) {
                        // If user was working with liters last, update price
                        if (lastModified === 'liters') {
                            priceInput.value = (total / liters).toFixed(2);
                        }
                        // If user was working with price last, update liters
                        else if (lastModified === 'price') {
                            litersInput.value = (total / price).toFixed(2);
                        }
                        // Default: update price per liter (more common scenario)
                        else {
                            priceInput.value = (total / liters).toFixed(2);
                        }
                    }
                    
                    isCalculating = false;
                }
            }
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
    }
    
    // Auth functions
    function switchAuthTab(tabName) {
        authTabs.forEach(tab => tab.classList.remove('active'));
        document.querySelector(`.auth-tab[data-tab="${tabName}"]`).classList.add('active');
        
        loginForm.classList.remove('active');
        registerForm.classList.remove('active');
        document.getElementById(`${tabName}-form`).classList.add('active');
    }
    
    async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Validation
    if (!username || !password) {
        showToast('Please enter both username and password', 'error');
        return;
    }
    
    try {
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
            throw new Error(data.message || `Login failed (HTTP ${response.status})`);
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
        
        showToast(
            error.message.includes('Invalid credentials') 
                ? 'Wrong username or password' 
                : error.message,
            'error'
        );
    } finally {
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
            showLoading();
            
            const response = await fetch(`${apiBaseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, fullName, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showToast('Registration successful! Please login', 'success');
                switchAuthTab('login');
                document.getElementById('register-form').reset();
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    function handleLogout() {
        currentUser = null;
        authToken = null;
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
            loadDashboard();
        } else if (tabName === 'add-entry') {
            // Set current date and time when switching to add entry tab
            setCurrentDateTime();
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
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
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
                // Get the updated dashboard select element after populateVehicleSelectors
                const dashboardSelect = document.getElementById('dashboard-vehicle-select');
                dashboardSelect.value = userVehicles[0].VehicleId;
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
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
    function populateVehicleSelectors() {
        const dashboardSelect = document.getElementById('dashboard-vehicle-select');
        const entrySelect = document.getElementById('entry-vehicle');
        const reportSelect = document.getElementById('report-vehicle-select');
        
        // Clear existing options
        dashboardSelect.innerHTML = '';
        entrySelect.innerHTML = '<option value="">Select a vehicle</option>';
        reportSelect.innerHTML = '<option value="">All Vehicles</option>';
        
        if (userVehicles.length === 0) {
            dashboardSelect.innerHTML = '<option value="">No vehicles found</option>';
            return;
        }
        
        userVehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.VehicleId;
            option.textContent = `${vehicle.Make} ${vehicle.Model}${vehicle.Year ? ` (${vehicle.Year})` : ''}`;
            
            dashboardSelect.appendChild(option.cloneNode(true));
            entrySelect.appendChild(option.cloneNode(true));
            reportSelect.appendChild(option.cloneNode(true));
        });
        
        // Remove any existing event listeners by cloning the element
        const newDashboardSelect = dashboardSelect.cloneNode(true);
        dashboardSelect.parentNode.replaceChild(newDashboardSelect, dashboardSelect);
        
        // Update the reference to point to the new element
        const updatedDashboardSelect = document.getElementById('dashboard-vehicle-select');
        
        // Add event listener to the new dashboard vehicle selector
        updatedDashboardSelect.addEventListener('change', function() {
            console.log('Vehicle selected:', this.value);
            console.log('Available vehicles:', userVehicles.map(v => `${v.VehicleId}: ${v.Make} ${v.Model}`));
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
                    // Find min and max odometer
                    const odometers = entries.map(e => e.Odometer).filter(o => typeof o === 'number');
                    console.log('Odometer readings:', odometers);
                    if (odometers.length > 1) {
                        const minOdo = Math.min(...odometers);
                        const maxOdo = Math.max(...odometers);
                        const distance = maxOdo - minOdo;
                        console.log(`Distance calculation: ${maxOdo} - ${minOdo} = ${distance}`);
                        
                        if (distance > 0) {
                            totalDistance = distance.toFixed(1);
                            
                            // Calculate basic efficiency: KM/L = Total Distance / Total Fuel
                            if (totalLiters > 0) {
                                const efficiency = distance / totalLiters;
                                avgEfficiency = efficiency.toFixed(2);
                                console.log(`Basic efficiency calculation: ${distance} km / ${totalLiters} L = ${efficiency.toFixed(2)} KM/L`);
                                
                                // Also update the trend to show this is a basic calculation
                                const trendElement = document.getElementById('consumption-trend');
                                trendElement.className = 'stat-trend';
                                trendElement.innerHTML = '<i class="fas fa-calculator"></i> Basic';
                            }
                        } else {
                            totalDistance = '0.0';
                        }
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
                    showToast(`Basic efficiency calculated: ${avgEfficiency} KM/L. Add more sequential entries for detailed analytics.`, 'info');
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
                        y: {
                            beginAtZero: false
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
                tbody.innerHTML = '<tr><td colspan="5">No entries found. Add your first fuel entry!</td></tr>';
            } else {
                recentEntries.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${formatDateTime(entry.EntryDate)}</td>
                        <td>${entry.Odometer.toFixed(1)}</td>
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
        // Convert average consumption from L/100km to KM/L
        const avgEfficiency = data.stats.avgConsumption > 0 ? (100 / data.stats.avgConsumption) : 0;
        
        console.log('Stats Update:', {
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
                const isImprovement = percentageChange > 0;
                
                // Update trend display
                trendElement.className = `stat-trend ${isImprovement ? 'up' : 'down'}`;
                trendElement.innerHTML = `
                    <i class="fas fa-arrow-${isImprovement ? 'up' : 'down'}"></i> ${Math.abs(percentageChange).toFixed(1)}%
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
        const labels = data.stats.consumptionData.map(item => 
            formatDate(item.date)
        );
        // Convert from L/100km to KM/L: KM/L = 100 / (L/100km)
        const efficiencyData = data.stats.consumptionData.map(item => 
            item.consumption > 0 ? (100 / item.consumption).toFixed(2) : 0
        );
        
        // Prepare fuel entry data points for overlay
        const fuelEntryData = [];
        const fuelEntryLabels = [];
        
        if (data.entries && data.entries.length > 0) {
            // Sort entries by date and create data points for fuel entries
            const sortedEntries = [...data.entries].sort((a, b) => new Date(a.EntryDate) - new Date(b.EntryDate));
            
            sortedEntries.forEach(entry => {
                const entryDate = formatDate(entry.EntryDate);
                fuelEntryLabels.push(entryDate);
                
                // For fuel entries, we'll show them at a consistent height for visibility
                // but we could also calculate efficiency if we have previous entry data
                fuelEntryData.push({
                    x: entryDate,
                    y: entry.IsFullTank ? 1 : 0.5, // Different heights for full vs partial tank
                    liters: entry.Liters,
                    cost: entry.TotalCost,
                    isFullTank: entry.IsFullTank,
                    odometer: entry.Odometer
                });
            });
        }
        
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
            tbody.innerHTML = '<tr><td colspan="5">No entries found</td></tr>';
        } else {                recentEntries.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${formatDateTime(entry.EntryDate)}</td>
                        <td>${entry.Odometer.toFixed(1)}</td>
                        <td>${entry.Liters.toFixed(2)}</td>
                        <td>${entry.PricePerLiter?.toFixed(2) || '--'}</td>
                        <td>${entry.TotalCost.toFixed(2)}</td>
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
        
        console.log('Form Values:', {
            vehicleId,
            date,
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
        if (pricePerLiter > 10) {
            const proceed = confirm(`Warning: Price per liter (${pricePerLiter}) seems unusually high. Did you mean ${(pricePerLiter/100).toFixed(2)} instead? Click OK to continue with ${pricePerLiter}, or Cancel to review.`);
            if (!proceed) {
                return;
            }
        }
        
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
                    entryDate: date
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
            
            // Group by month and vehicle - calculate total distance and fuel for each month
            const monthlyData = {};
            
            // First, group entries by month and vehicle
            entries.forEach(entry => {
                const date = new Date(entry.EntryDate);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = {
                        totalLiters: 0,
                        totalCost: 0,
                        totalDistance: 0,
                        vehicles: {}
                    };
                }
                
                monthlyData[monthYear].totalLiters += entry.Liters;
                monthlyData[monthYear].totalCost += entry.TotalCost;
                
                if (!monthlyData[monthYear].vehicles[entry.VehicleId]) {
                    monthlyData[monthYear].vehicles[entry.VehicleId] = {
                        entries: [],
                        liters: 0,
                        cost: 0,
                        minOdometer: null,
                        maxOdometer: null
                    };
                }
                
                monthlyData[monthYear].vehicles[entry.VehicleId].entries.push(entry);
                monthlyData[monthYear].vehicles[entry.VehicleId].liters += entry.Liters;
                monthlyData[monthYear].vehicles[entry.VehicleId].cost += entry.TotalCost;
                
                // Track min and max odometer readings for each vehicle per month
                const vehicleData = monthlyData[monthYear].vehicles[entry.VehicleId];
                if (vehicleData.minOdometer === null || entry.Odometer < vehicleData.minOdometer) {
                    vehicleData.minOdometer = entry.Odometer;
                }
                if (vehicleData.maxOdometer === null || entry.Odometer > vehicleData.maxOdometer) {
                    vehicleData.maxOdometer = entry.Odometer;
                }
            });
            
            // Now calculate total distance for each month
            Object.keys(monthlyData).forEach(monthYear => {
                const month = monthlyData[monthYear];
                let monthTotalDistance = 0;
                
                Object.keys(month.vehicles).forEach(vehicleId => {
                    const vehicleData = month.vehicles[vehicleId];
                    const distance = vehicleData.maxOdometer - vehicleData.minOdometer;
                    if (distance > 0) {
                        monthTotalDistance += distance;
                        vehicleData.distance = distance;
                    }
                });
                
                month.totalDistance = monthTotalDistance;
            });
            
            // Prepare data for charts
            const months = Object.keys(monthlyData).sort();
            const consumptionData = months.map(month => {
                const data = monthlyData[month];
                return data.totalDistance > 0 ? 
                    (data.totalLiters / data.totalDistance) * 100 : 0;
            });
            
            const costData = months.map(month => monthlyData[month].totalCost);
            
            // Update consumption chart
            if (reportConsumptionChart) {
                reportConsumptionChart.destroy();
            }
            
            // Convert consumption data from L/100km to KM/L
            const efficiencyData = consumptionData.map(value => 
                value > 0 ? (100 / value) : 0
            );
            
            const consumptionCtx = document.getElementById('report-consumption-chart').getContext('2d');
            reportConsumptionChart = new Chart(consumptionCtx, {
                type: 'bar',
                data: {
                    labels: months.map(m => {
                        const [year, month] = m.split('-');
                        const date = new Date(year, month - 1);
                        return `${String(date.getMonth() + 1).padStart(2, '0')}-${year}`;
                    }),
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
                    labels: months.map(m => {
                        const [year, month] = m.split('-');
                        const date = new Date(year, month - 1);
                        return `${String(date.getMonth() + 1).padStart(2, '0')}-${year}`;
                    }),
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
                        y: {
                            beginAtZero: true
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
                
                // Only calculate consumption for full tank entries
                if (entry.IsFullTank) {
                    // Find all entries for the same vehicle, sorted by date (newest first)
                    const vehicleEntries = entries.filter(e => e.VehicleId === entry.VehicleId)
                        .sort((a, b) => new Date(b.EntryDate) - new Date(a.EntryDate));
                    
                    // Find the current entry's position in the sorted list
                    const currentIndex = vehicleEntries.findIndex(e => 
                        e.EntryDate === entry.EntryDate && e.Odometer === entry.Odometer
                    );
                    
                    // Look for the next entry chronologically (previous in our sorted list)
                    if (currentIndex < vehicleEntries.length - 1) {
                        const nextEntry = vehicleEntries[currentIndex + 1];
                        
                        // Check if the next entry is also a full tank
                        if (nextEntry.IsFullTank) {
                            // Check if there are any non-full tank entries between these two
                            const entriesBetween = vehicleEntries.slice(currentIndex + 1)
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
                    <td>${entry.Liters.toFixed(2)}</td>
                    <td>${entry.PricePerLiter.toFixed(2)}</td>
                    <td>${entry.TotalCost.toFixed(2)}</td>
                    <td>${consumption}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoading();
        }
    }
    
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
                <button class="btn-secondary btn-edit-vehicle" data-id="${vehicle.VehicleId}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-secondary btn-delete-vehicle" data-id="${vehicle.VehicleId}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        vehiclesList.appendChild(card);
    });

    // Add event listeners for edit/delete buttons
    document.querySelectorAll('.btn-edit-vehicle').forEach(btn => {
        btn.addEventListener('click', function() {
            const vehicleId = this.getAttribute('data-id');
            editVehicle(vehicleId);
        });
    });
    
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
                'Authorization': `Bearer ${authToken}`  // THIS IS CRUCIAL
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
            window.location.href = '/login';
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
    const date = new Date(dateString);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
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
    const date = new Date(dateString);
    
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
    async function editVehicle(vehicleId) {
        // In a real app, you would implement this to edit vehicle details
        showToast('Edit vehicle functionality not implemented in this demo', 'warning');
    }
    
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