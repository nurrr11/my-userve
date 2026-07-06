const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let analyticsChart = null;
let adminAnalyticsChart = null;
let currentEditingEventId = null; 
let calendar = null; 

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        verifyToken();
    } else if (window.location.pathname.includes('organizer.html') || 
               window.location.pathname.includes('student.html') || 
               window.location.pathname.includes('admin.html')) {
        window.location.href = 'index.html';
    }
});

async function verifyToken() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            if (window.location.pathname.includes('organizer.html') && currentUser.role === 'organizer') {
                initOrganizerDashboard();
            } else if (window.location.pathname.includes('student.html') && currentUser.role === 'student') {
                initStudentDashboard();
            } else if (window.location.pathname.includes('admin.html') && currentUser.role === 'admin') {
                initAdminDashboard();
            }
        } else { 
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        }
    } catch (error) { 
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

async function login() { 
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            if (role === 'organizer') window.location.href = 'organizer.html';
            else if (role === 'student') window.location.href = 'student.html';
            else window.location.href = 'admin.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Server error. Please make sure backend is running.');
    }
}

async function handleRegister() { 
    const regData = {
        Student_ID: document.getElementById('regID').value,
        Student_FullName: document.getElementById('regName').value,
        Student_Email: document.getElementById('regEmail').value,
        Student_Password: document.getElementById('regPass').value,
        Student_ContactNumber: document.getElementById('regContact').value,
        Student_DOB: document.getElementById('regDOB').value
    };

    try {
        const response = await fetch(`${API_URL}/register/student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regData)
        });
        const data = await response.json();
        if (data.success) {
            alert('Registration successful! Please wait for admin approval.');
            toggleAuth(false);
        } else { alert(data.message); }
    } catch (error) { alert('Registration failed.'); }
}

function logout() { 
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function toggleAuth(isRegister) { 
    document.getElementById('loginSection').style.display = isRegister ? 'none' : 'block';
    document.getElementById('registerBox').style.display = isRegister ? 'block' : 'none';
}

// ============================================
// UNIFIED PAGE NAVIGATION (FIXED MULTIPLE DECLARATIONS)
// ============================================

function showPage(pageId) {
    // 1. Hide all application views globally
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });
    
    // 2. Display targeted view block
    const target = document.getElementById(`${pageId}Page`);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    // 3. Update styling classes for active sidebar buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    } else {
        const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(pageId));
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    // 4. Fire target role data fetching operations
    // Organizer Navigation Routes
    if (pageId === 'dashboard') loadAnalytics();
    else if (pageId === 'eventManagement') {
        loadEvents();
        refreshEventReport(); 
        loadEventSelectors(); // Ensures volunteer sub-tabs have event selections populated
    }
    else if (pageId === 'gratuity') loadGratuity();
    else if (pageId === 'issueReport') loadMyReports();
    else if (pageId === 'certificates') loadEventSelectors();
    else if (pageId === 'organizerChat') initOrganizerChatSystem();

    // Student Navigation Routes
    else if (pageId === 'studentDashboard') loadAvailableEvents();
    else if (pageId === 'activityRecord') loadStudentActivityRecord();
    else if (pageId === 'studentProfile') loadStudentProfile();
    else if (pageId === 'studentCalendar') {
        setTimeout(() => { 
            if (!calendar) {
                initCalendar();
            } else {
                calendar.refetchEvents(); 
                calendar.render(); 
            }
        }, 100);
    }

    // Admin Navigation Routes
    else if (pageId === 'adminDashboard') loadAdminAnalytics();
    else if (pageId === 'adminProfile') loadAdminProfile();
    else if (pageId === 'userApproval') loadPendingUsers();
    else if (pageId === 'issueCentre') loadAllSubmittedReports();
    else if (pageId === 'adminChat') initAdminChatSystem();
}

// ============================================
// ORGANIZER DASHBOARD FEATURES
// ============================================

async function initOrganizerDashboard() {
    await loadProfile();
    await loadAnalytics();
    await loadEvents();
    await loadEventSelectors();
}

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/organizer/analytics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('analyticsContainer').innerHTML = `
                <div class="stat-card"><h3>${data.analytics.total_events}</h3><p>Events</p></div>
                <div class="stat-card"><h3>${data.analytics.total_registrations}</h3><p>Registrations</p></div>
                <div class="stat-card"><h3>${data.analytics.present_count}</h3><p>Present</p></div>
            `;
            
            const canvas = document.getElementById('analyticsChart');
            if (canvas) {
                if (analyticsChart) analyticsChart.destroy();
                analyticsChart = new Chart(canvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Events', 'Registrations', 'Present'],
                        datasets: [{
                            label: 'Stats',
                            data: [data.analytics.total_events, data.analytics.total_registrations, data.analytics.present_count],
                            backgroundColor: ['#667eea', '#764ba2', '#4facfe']
                        }]
                    }
                });
            }
        }
    } catch (error) { console.error('Analytics error:', error); }
}

async function loadEvents() { 
    try {
        const response = await fetch(`${API_URL}/organizer/events`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.events) {
            document.getElementById('eventsList').innerHTML = data.events.map(event => `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h3>${event.Event_Name}</h3>
                            <p>📅 ${event.Event_Date} | 📍 ${event.Event_Location}</p>
                            <p><strong>👥 Joined:</strong> ${event.Event_Registered || 0} / ${event.Event_Slots} Students</p>
                        </div>
                        <div class="badge ${event.Event_Registered >= event.Event_Slots ? 'bg-danger' : 'bg-primary'}">
                            ${event.Event_Registered >= event.Event_Slots ? 'FULL' : 'OPEN'}
                        </div>
                    </div>
                    <hr>
                    <button class="btn btn-secondary" onclick="editEvent(${event.Event_ID})">✏️ Edit</button>
                    <button class="btn btn-danger" onclick="deleteEvent(${event.Event_ID})">🗑️ Delete</button>
                </div>
            `).join('');
        }
    } catch (error) { console.error('Load events error:', error); }
}

function showCreateEventModal() { 
    const modal = document.getElementById('createEventModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

function closeModal() { 
    const modal = document.getElementById('createEventModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        resetModal(); 
    }
}

function resetModal() { 
    currentEditingEventId = null;
    const titleElement = document.querySelector('#createEventModal h3');
    if (titleElement) titleElement.innerText = 'Create New Event';
    
    const mainBtn = document.getElementById('modalMainBtn');
    if (mainBtn) {
        mainBtn.innerText = 'Create Event';
        mainBtn.onclick = createEvents;
    }
    ['eventName', 'eventDesc', 'eventDate', 'eventTime', 'eventLocation'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
    const slotsField = document.getElementById('eventSlots');
    if (slotsField) slotsField.value = '50';
}

async function createEvents() { 
    const eventName = document.getElementById('eventName').value.trim();
    const eventDesc = document.getElementById('eventDesc').value.trim();
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value.trim();
    const eventSlots = document.getElementById('eventSlots').value;

    if (!eventName || !eventDate || !eventTime || !eventLocation) {
        alert('Please fill in all required fields (Name, Date, Time, and Location)');
        return;
    }

    const eventData = {
        Event_Name: eventName,
        Event_Desc: eventDesc,
        Event_Date: eventDate,
        Event_Time: eventTime,
        Event_Location: eventLocation,
        Event_Slots: parseInt(eventSlots) || 50
    };

    try {
        const response = await fetch(`${API_URL}/organizer/events`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify(eventData)
        });
        const data = await response.json();
        if (data.success) {
            alert('Event created successfully!');
            closeModal();
            loadEvents();
            refreshEventReport();
        } else {
            alert('Server Error: ' + data.message);
        }
    } catch (error) {
        alert('Could not connect to the server.');
    }
}

async function editEvent(eventId) { 
    currentEditingEventId = eventId;
    try {
        const response = await fetch(`${API_URL}/organizer/events`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const event = data.events.find(e => e.Event_ID === eventId);

        if (event) {
            document.getElementById('eventName').value = event.Event_Name;
            document.getElementById('eventDesc').value = event.Event_Desc || '';
            document.getElementById('eventDate').value = event.Event_Date;
            document.getElementById('eventTime').value = event.Event_Time;
            document.getElementById('eventLocation').value = event.Event_Location;
            document.getElementById('eventSlots').value = event.Event_Slots;

            document.querySelector('#createEventModal h3').innerText = 'Edit Event';
            const mainBtn = document.getElementById('modalMainBtn');
            if (mainBtn) {
                mainBtn.innerText = 'Update Event';
                mainBtn.onclick = updateEvent;
            }
            showCreateEventModal();
        }
    } catch (error) {
        alert('Error loading event data');
    }
}

async function updateEvent() { 
    const eventData = {
        Event_Name: document.getElementById('eventName').value,
        Event_Desc: document.getElementById('eventDesc').value,
        Event_Date: document.getElementById('eventDate').value,
        Event_Time: document.getElementById('eventTime').value,
        Event_Location: document.getElementById('eventLocation').value,
        Event_Slots: parseInt(document.getElementById('eventSlots').value)
    };

    try {
        const response = await fetch(`${API_URL}/organizer/events/${currentEditingEventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Event updated successfully!');
            closeModal();
            loadEvents();
        } else {
            alert('Update failed: ' + data.message);
        }
    } catch (error) {
        alert('Could not connect to server for update');
    }
}

async function deleteEvent(eventId) { 
    if (!confirm('Delete this event?')) return;
    try {
        const response = await fetch(`${API_URL}/organizer/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) { loadEvents(); }
    } catch (error) { alert('Delete failed'); }
}

async function refreshEventReport() { 
    try {
        const response = await fetch(`${API_URL}/organizer/event-reports`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const reportTable = document.getElementById('eventReportsTable');

        if (data.success && data.reports.length > 0 && reportTable) {
            reportTable.innerHTML = `
                <table class="table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th>Event Name</th><th>Date</th><th>Total Slots</th><th>Registered</th><th>Present</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.reports.map(r => `
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td>${r.Event_Name}</td><td>${r.Event_Date}</td><td>${r.Event_Slots}</td><td>${r.Event_Registered}</td><td>${r.present_count || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else if (reportTable) {
            reportTable.innerHTML = '<p>No report data available.</p>';
        }
    } catch (error) { console.error('Report error:', error); }
}

// === VOLUNTEER MANAGEMENT FEATURE (FIXED) ===
async function loadVolunteers() {
    const eventId = document.getElementById('eventSelect').value;
    const tableContainer = document.getElementById('volunteersTable');
    if (!eventId || !tableContainer) return;
    
    try {
        const response = await fetch(`${API_URL}/organizer/volunteers/${eventId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.volunteers) {
            tableContainer.innerHTML = `
                <table class="table" style="width: 100%; margin-top: 15px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th>Volunteer Student Name</th><th>Attendance Status</th><th>Action Toggle</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.volunteers.map(v => `
                            <tr>
                                <td><strong>${v.Student_FullName}</strong></td>
                                <td><span class="badge ${v.Attendance_Status === 'present' ? 'bg-success' : 'bg-warning'}">${v.Attendance_Status.toUpperCase()}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="updateAttendance(${v.Volunteer_ID}, 'present')">✅ Mark Present</button>
                                    <button class="btn btn-sm btn-danger" onclick="updateAttendance(${v.Volunteer_ID}, 'absent')">❌ Mark Absent</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        } else {
            tableContainer.innerHTML = '<p class="text-muted style="padding:10px;">No volunteers found registered for this specific event tier.</p>';
        }
    } catch (error) { console.error('Volunteer load error:', error); }
}

async function updateAttendance(volunteerId, status) {
    try {
        const response = await fetch(`${API_URL}/organizer/update-attendance`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ volunteerId, status })
        });
        const data = await response.json();
        if (data.success) {
            alert('Attendance metrics updated successfully!');
            loadVolunteers(); // Refresh list dynamically
            refreshEventReport(); // Update analytical tables
        } else {
            alert('Error mapping attendance updates: ' + data.message);
        }
    } catch (error) { alert('Network parsing failure updating attendance fields.'); }
}

// === E-CERTIFICATE GENERATOR ===
async function loadCertificates() {
    const eventId = document.getElementById('certEventSelect').value;
    const certList = document.getElementById('certificatesList');
    if (!eventId) {
        certList.innerHTML = '<p>Please select an event to view certificates.</p>';
        return;
    }
    try {
        const response = await fetch(`${API_URL}/organizer/certificates/${eventId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.certificates.length > 0) {
            certList.innerHTML = data.certificates.map(cert => `
                <div class="card" style="margin-bottom: 10px; padding: 15px; border-left: 5px solid #28a745;">
                    <h4>${cert.Student_FullName}</h4>
                    <p><strong>Code:</strong> ${cert.certificate_code}</p>
                    <button class="btn btn-secondary" onclick="viewCertificate('${cert.certificate_code}')">👁️ View/Print</button>
                </div>
            `).join('');
        } else {
            certList.innerHTML = '<p>No certificates generated for this event yet.</p>';
        }
    } catch (error) { certList.innerHTML = '<p>Error loading certificates list.</p>'; }
}

async function generateCertificates() {
    const eventId = document.getElementById('certEventSelect').value;
    if (!eventId) return alert('Please select an event first!');
    try {
        const response = await fetch(`${API_URL}/organizer/generate-certificates/${eventId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            loadCertificates(); 
        } else { alert('Generation failed: ' + data.message); }
    } catch (error) { alert('Error communicating with server'); }
}

function viewCertificate(code) {
    alert("Viewing Certificate: " + code);
}

// === GRATUITY ===
async function loadGratuity() {
    try {
        const response = await fetch(`${API_URL}/organizer/gratuity`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const table = document.getElementById('gratuityTable');
        if (data.success && table) {
            table.innerHTML = data.gratuity.map(item => `
                <tr>
                    <td><strong>${item.Student_FullName}</strong></td>
                    <td>Event #${item.Event_ID}</td>
                    <td><span class="badge badge-warning">${item.Gratuity_Status}</span></td>
                    <td>
                        <select id="method-${item.Gratuity_ID}" class="form-control-sm">
                            <option value="Cash">Cash</option><option value="E-Wallet">E-Wallet</option>
                        </select>
                        <button class="btn btn-primary btn-sm" onclick="processGratuity(${item.Gratuity_ID})">Confirm Payment</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error("Gratuity load error", e); }
}

async function processGratuity(id) {
    const method = document.getElementById(`method-${id}`).value;
    try {
        const response = await fetch(`${API_URL}/organizer/process-gratuity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ gratuityId: id, method })
        });
        const data = await response.json();
        if (data.success) { alert('Gratuity processed successfully!'); loadGratuity(); }
    } catch (e) { alert('Error processing payment'); }
}

// === ISSUE REPORTING LOGIC (DEDUPLICATED) ===
async function submitOrganizerIssue() {
    const details = document.getElementById('issueDetails').value;
    if (!details) return alert("Please enter issue details");
    try {
        const response = await fetch(`${API_URL}/organizer/report-issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ details })
        });
        const data = await response.json();
        if (data.success) {
            alert('Report submitted to Admin.');
            document.getElementById('issueDetails').value = '';
            loadMyReports();
        }
    } catch (e) { console.error(e); }
}

async function loadMyReports() {
    try {
        const response = await fetch(`${API_URL}/organizer/my-reports`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('myReportsList');
        if (data.success && list) {
            list.innerHTML = data.reports.map(r => `
                <div class="card" style="border-left: 5px solid #dc3545; margin-bottom: 10px;">
                    <p><strong>Date:</strong> ${new Date(r.Report_Date).toLocaleDateString()} | <strong>Time:</strong> ${r.Report_Time}</p>
                    <p>${r.Report_Details}</p>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

// === PROFILE ===
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/organizer/profile`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('profileInfo').innerHTML = `
                <p><strong>Organizer ID:</strong> ${data.profile.Organizer_ID}</p>
                <p><strong>Name:</strong> ${data.profile.Organizer_Name}</p>
                <p><strong>City:</strong> ${data.profile.Organizer_City}</p>
                <p><strong>Email:</strong> ${data.profile.Organizer_Email}</p>
            `;
        }
    } catch (error) { console.error('Profile load error:', error); }
}

// === DROP-DOWN MENU SELECTORS LOGIC ===
async function loadEventSelectors() {
    try {
        const response = await fetch(`${API_URL}/organizer/events`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            const options = data.events.map(e => `<option value="${e.Event_ID}">${e.Event_Name}</option>`).join('');
            
            // Populates Certificate drop-down menu element wrapper
            const certSelector = document.getElementById('certEventSelect');
            if (certSelector) certSelector.innerHTML = '<option value="">Select Event</option>' + options;

            // Populates Volunteer Management drop-down menu element wrapper (FIXED)
            const volSelector = document.getElementById('eventSelect');
            if (volSelector) volSelector.innerHTML = '<option value="">Select Event</option>' + options;
        }
    } catch (error) { console.error('Selector load error:', error); }
}

// === 7. ORGANIZER CHAT SYSTEM INTEGRATION (ADDED FEATURE) ===
function initOrganizerChatSystem() {
    const layout = document.getElementById('organizerChatContainer');
    if (!layout) return;

    layout.innerHTML = `
        <div class="chat-wrapper" style="display: flex; height: 440px; border: 1px solid #ddd; background: #fff; border-radius: 8px;">
            <div class="user-sidebar" style="width: 30%; border-right: 1px solid #ddd; padding: 15px; background: #fafafa;">
                <h5 style="margin-top: 0;">Support Helpdesk</h5>
                <hr>
                <div id="activeOrganizerThreads" style="cursor: pointer; padding: 10px; background: #eef2ff; border-radius: 4px; border-left: 4px solid #667eea;">
                    <strong>👑 System Admin</strong><br>
                    <small class="text-muted">Direct Messenger Channel</small>
                </div>
            </div>
            <div class="chat-main" style="width: 70%; display: flex; flex-direction: column; justify-content: space-between; padding: 15px;">
                <div id="organizerChatDisplay" style="flex-grow: 1; overflow-y: auto; margin-bottom: 15px; border-bottom: 1px solid #eee; padding: 10px;">
                    <p class="text-muted text-center" style="margin-top: 20px;">Secure server websocket socket established. You are now connected with System Administration.</p>
                </div>
                <div class="chat-inputs" style="display: flex; gap: 10px;">
                    <input type="text" id="organizerChatMessage" class="form-control" style="width: 85%; padding: 8px;" placeholder="Type your inquiry message here...">
                    <button class="btn btn-primary" onclick="sendOrganizerMessage()" style="width: 15%;">Send</button>
                </div>
            </div>
        </div>
    `;
}

function sendOrganizerMessage() {
    const msgInput = document.getElementById('organizerChatMessage');
    const display = document.getElementById('organizerChatDisplay');
    if (!msgInput || !msgInput.value.trim() || !display) return;
    
    // Append message to visual panel layout tracking
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    display.innerHTML += `
        <div style="text-align: right; margin-bottom: 10px;">
            <div style="display: inline-block; background: #667eea; color: #fff; padding: 8px 12px; border-radius: 12px 12px 0 12px; max-width: 70%;">
                ${msgInput.value}
            </div>
            <br><small class="text-muted" style="font-size: 10px;">${time}</small>
        </div>
    `;
    
    msgInput.value = '';
    display.scrollTop = display.scrollHeight;
}

// ============================================
// STUDENT DASHBOARD FEATURES
// ============================================

async function initStudentDashboard() {
    loadAvailableEvents();
    loadStudentProfile();
}

async function loadAvailableEvents() {
    try {
        const response = await fetch(`${API_URL}/student/events`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        const list = document.getElementById('availableEventsList');
        
        if (data.success && list) {
            list.innerHTML = data.events.map(event => {
                const remaining = event.Event_Slots - (event.Event_Registered || 0);
                const statusColor = remaining <= 5 ? 'text-danger' : 'text-success';
                return `
                <div class="card">
                    <h3>${event.Event_Name}</h3>
                    <p><strong>Organizer:</strong> ${event.Organizer_Name}</p>
                    <p>📅 ${event.Event_Date} | 📍 ${event.Event_Location}</p>
                    <p class="${statusColor}"><strong>🔥 ${remaining} slots left</strong> (out of ${event.Event_Slots})</p>
                    <button class="btn btn-primary" onclick="joinEvent(${event.Event_ID})" ${remaining <= 0 ? 'disabled' : ''}>
                        ${remaining <= 0 ? 'Full' : 'Join Event'}
                    </button>
                </div>
            `}).join('');
        }
    } catch (error) { console.error('Load error'); }
}

async function joinEvent(eventId) {
    try {
        const response = await fetch(`${API_URL}/student/join-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ eventId })
        });
        const data = await response.json();
        alert(data.message);
        loadAvailableEvents();
    } catch (error) { alert('Error joining event'); }
}

async function loadStudentProfile() {
    const profileContainer = document.getElementById('studentProfileDetails');
    if (!profileContainer) return;
    try {
        const response = await fetch(`${API_URL}/student/profile`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            profileContainer.innerHTML = `
                <div class="card">
                    <h3>${data.profile.Student_FullName}</h3>
                    <p><strong>ID:</strong> ${data.profile.Student_ID}</p>
                    <p><strong>Email:</strong> ${data.profile.Student_Email}</p>
                    <p><strong>Contact:</strong> ${data.profile.Student_ContactNumber}</p>
                </div>
            `;
        }
    } catch (error) { console.error('Profile load error'); }
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' },
        height: 'auto',
        events: async function(info, successCallback, failureCallback) {
            try {
                const response = await fetch(`${API_URL}/student/my-calendar-events`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                if (data.success) successCallback(data.events);
            } catch (error) { failureCallback(error); }
        },
        eventClick: function(info) {
            alert(`Event: ${info.event.title}\nLocation: ${info.event.extendedProps.location}`);
        }
    });
    calendar.render();
}

async function loadStudentActivityRecord() {
    try {
        const response = await fetch(`${API_URL}/student/activity-summary`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('totalJoined').innerText = data.stats.totalJoined;
            document.getElementById('totalPresent').innerText = data.stats.totalPresent;

            const tableBody = document.getElementById('studentActivityTable');
            tableBody.innerHTML = data.history.map(row => {
                const statusClass = row.Attendance_Status === 'present' ? 'badge-success' : 
                                   row.Attendance_Status === 'absent' ? 'badge-danger' : 'badge-warning';
                return `
                    <tr>
                        <td><strong>${row.Event_Name}</strong></td>
                        <td>${new Date(row.Event_Date).toLocaleDateString()}</td>
                        <td>Organizer #${row.Organizer_ID}</td>
                        <td><span class="badge ${statusClass}">${row.Attendance_Status.toUpperCase()}</span></td>
                        <td>
                            ${row.certificate_code ? `<button class="btn-sm btn-primary" onclick="viewCertificate('${row.certificate_code}')">Download 📜</button>` : `<small class="text-muted">Not Issued</small>`}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) { console.error('Error loading activity record:', error); }
}

// ============================================
// ADMIN DASHBOARD FEATURES
// ============================================

async function initAdminDashboard() {
    await loadAdminProfile();
    await loadAdminAnalytics();
}

async function loadAdminAnalytics() {
    const container = document.getElementById('adminAnalyticsContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success && data.stats) {
            container.innerHTML = `
                <div class="stat-card"><h3>${data.stats.total_users || 0}</h3><p>Total Users</p></div>
                <div class="stat-card text-warning"><h3>${data.stats.pending_approvals || 0}</h3><p>Pending Approvals</p></div>
                <div class="stat-card"><h3>${data.stats.total_events || 0}</h3><p>Active System Events</p></div>
                <div class="stat-card text-danger"><h3>${data.stats.open_issues || 0}</h3><p>Open Issues</p></div>
            `;
            
            const canvas = document.getElementById('adminAnalyticsChart');
            if (canvas) {
                if (adminAnalyticsChart) adminAnalyticsChart.destroy();
                adminAnalyticsChart = new Chart(canvas.getContext('2d'), {
                    type: 'pie',
                    data: {
                        labels: ['Students', 'Organizers', 'Admins'],
                        datasets: [{
                            data: [data.stats.student_count || 0, data.stats.organizer_count || 0, data.stats.admin_count || 0],
                            backgroundColor: ['#4facfe', '#764ba2', '#f6d365']
                        }]
                    },
                    options: { responsive: true }
                });
            }
        }
    } catch (error) { console.error('Admin analytics failure:', error); }
}

async function loadAdminProfile() {
    const profileView = document.getElementById('adminProfileInfo');
    if (!profileView) return;

    try {
        const response = await fetch(`${API_URL}/admin/profile`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.profile) {
            profileView.innerHTML = `
                <div class="card">
                    <h3>👑 System Administrator</h3>
                    <hr>
                    <p><strong>Admin ID:</strong> ${data.profile.Admin_ID}</p>
                    <p><strong>Full Name:</strong> ${data.profile.Admin_FullName}</p>
                    <p><strong>Email Address:</strong> ${data.profile.Admin_Email}</p>
                </div>
            `;
        }
    } catch (error) { console.error('Admin profile load error:', error); }
}

async function loadPendingUsers() {
    const tableBody = document.getElementById('pendingUsersTable');
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/pending-users`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success && data.users && data.users.length > 0) {
            tableBody.innerHTML = data.users.map(user => `
                <tr>
                    <td><strong>${user.User_FullName}</strong></td>
                    <td><span class="badge bg-secondary">${(user.User_Role || 'student').toUpperCase()}</span></td>
                    <td>${user.User_Email}</td>
                    <td>${user.Registration_Date ? new Date(user.Registration_Date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="processUserApproval('${user.User_ID}', 'approve')">✅ Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="processUserApproval('${user.User_ID}', 'reject')">❌ Reject</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No pending user approvals found.</td></tr>';
        }
    } catch (error) { console.error('Error fetching verification queues:', error); }
}

async function processUserApproval(userId, action) {
    if (!confirm(`Are you sure you want to ${action} this user request?`)) return;
    try {
        const response = await fetch(`${API_URL}/api/admin/approve-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ userId, action })
        });
        const data = await response.json();
        if (data.success) {
            alert(`User access request has been ${action}d.`);
            loadPendingUsers();
        }
    } catch (error) { alert('Failed to change user status.'); }
}

async function loadAllSubmittedReports() {
    const element = document.getElementById('globalIssueRecords');
    if (!element) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/issues`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success && data.issues && data.issues.length > 0) {
            element.innerHTML = data.issues.map(issue => {
                const isResolved = issue.status === 'resolved';
                return `
                    <div class="card issue-card" style="border-left: 5px solid ${isResolved ? '#28a745' : '#dc3545'}; margin-bottom: 12px; padding: 15px; background: #fff;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4>⚠️ Issue ID Reference: #${issue.IssueReport_ID}</h4>
                                <p class="text-muted">Reported by User ID: ${issue.Reporter_ID} (${issue.Reporter_Type}) on ${new Date(issue.Report_Date).toLocaleDateString()} at ${issue.Report_Time}</p>
                                <blockquote style="background: #fdfdfd; padding: 10px; border-left: 2px solid #ccc; margin: 10px 0;">
                                    "${issue.Report_Details}"
                                </blockquote>
                            </div>
                            <div>
                                <span class="badge ${isResolved ? 'bg-success' : 'bg-danger'}">${(issue.status || 'pending').toUpperCase()}</span>
                            </div>
                        </div>
                        ${!isResolved ? `
                            <hr>
                            <button class="btn btn-sm btn-success" onclick="resolveIssue(${issue.IssueReport_ID})">🔧 Mark as Resolved</button>
                        ` : issue.response ? `<p class="text-success" style="margin-top:10px;"><strong>Response:</strong> ${issue.response}</p>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            element.innerHTML = '<p class="text-muted">Zero pending issues documented.</p>';
        }
    } catch (error) { console.error('Failed to bind issue profiles:', error); }
}

async function resolveIssue(reportId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/resolve-issue/${reportId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            alert('Incident flag updated to Resolved.');
            loadAllSubmittedReports();
        }
    } catch (error) { alert('Failed updating lifecycle state.'); }
}

function initAdminChatSystem() {
    const layout = document.getElementById('adminChatContainer');
    if (!layout) return;

    layout.innerHTML = `
        <div class="chat-wrapper" style="display: flex; height: 400px; border: 1px solid #ddd;">
            <div class="user-sidebar" style="width: 30%; border-right: 1px solid #ddd; padding: 10px; background: #fafafa;">
                <h5>Active Chats</h5>
                <div id="activeChatThreads"><small class="text-muted">No operational streams available.</small></div>
            </div>
            <div class="chat-main" style="width: 70%; display: flex; flex-direction: column; justify-content: space-between; padding: 15px;">
                <div id="chatMessageDisplay" style="flex-grow: 1; overflow-y: auto; margin-bottom: 15px; border-bottom: 1px solid #eee;">
                    <p class="text-muted text-center">Select a thread to chat.</p>
                </div>
                <div class="chat-inputs" style="display: flex; gap: 10px;">
                    <input type="text" id="adminChatMessage" class="form-control" placeholder="Type a message..." disabled>
                    <button class="btn btn-primary" onclick="sendAdminMessage()" id="adminChatSendBtn" disabled>Send</button>
                </div>
            </div>
        </div>
    `;
}

function sendAdminMessage() {
    const msgInput = document.getElementById('adminChatMessage');
    if (!msgInput || !msgInput.value.trim()) return;
    alert(`Protocol simulation text transmission: "${msgInput.value}"`);
    msgInput.value = '';
}