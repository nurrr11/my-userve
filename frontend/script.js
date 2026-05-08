const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let analyticsChart = null;

// ============================================
// AUTHENTICATION
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
            showMessage('loginMessage', data.message, 'error');
        }
    } catch (error) {
        showMessage('loginMessage', 'Server error. Please make sure backend is running.', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = message;
        el.className = `message ${type}`;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    } else {
        alert(message);
    }
}

// ============================================
// ORGANIZER DASHBOARD
// ============================================

async function initOrganizerDashboard() {
    await loadProfile();
    await loadAnalytics();
    await loadEvents();
    await loadEventSelectors();
}

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}Page`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (pageName === 'dashboard') loadAnalytics();
    else if (pageName === 'eventManagement') loadEvents();
    else if (pageName === 'gratuity') loadGratuity();
    else if (pageName === 'issueReport') loadMyReports();
}

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
                <p><strong>Date of Establishment:</strong> ${data.profile.Organizer_DOE}</p>
                <p><strong>City:</strong> ${data.profile.Organizer_City}</p>
                <p><strong>Contact Number:</strong> ${data.profile.Organizer_ContactNumber}</p>
                <p><strong>Email:</strong> ${data.profile.Organizer_Email}</p>
            `;
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

async function updatePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        alert('Password must be 8+ chars with uppercase, lowercase, number, and special character');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/organizer/update-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        if (data.success) {
            alert('Password updated successfully');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Failed to update password');
    }
}

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/organizer/analytics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('analyticsContainer').innerHTML = `
                <div class="stat-card"><h3>${data.analytics.total_events}</h3><p>Total Events Created</p></div>
                <div class="stat-card"><h3>${data.analytics.total_registrations}</h3><p>Total Registrations</p></div>
                <div class="stat-card"><h3>${data.analytics.total_volunteers}</h3><p>Unique Volunteers</p></div>
                <div class="stat-card"><h3>${data.analytics.present_count}</h3><p>Present Volunteers</p></div>
            `;
            
            if (analyticsChart) analyticsChart.destroy();
            const ctx = document.getElementById('analyticsChart').getContext('2d');
            analyticsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Events', 'Registrations', 'Volunteers', 'Present'],
                    datasets: [{
                        label: 'Statistics',
                        data: [data.analytics.total_events, data.analytics.total_registrations, data.analytics.total_volunteers, data.analytics.present_count],
                        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
                    }]
                }
            });
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

// Load Events - FIXED
async function loadEvents() {
    console.log('Loading events...');
    try {
        const response = await fetch(`${API_URL}/organizer/events`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        console.log('Events response:', data);
        
        if (data.success && data.events && data.events.length > 0) {
            document.getElementById('eventsList').innerHTML = data.events.map(event => `
                <div class="event-card">
                    <h3>${event.Event_Name}</h3>
                    <p>${event.Event_Desc || 'No description'}</p>
                    <p><strong>📅 Date:</strong> ${event.Event_Date} at ${event.Event_Time}</p>
                    <p><strong>📍 Location:</strong> ${event.Event_Location}</p>
                    <p><strong>👥 Slots:</strong> ${event.Event_Registered || 0}/${event.Event_Slots}</p>
                    <p><strong>Status:</strong> ${(event.Event_Registered || 0) >= event.Event_Slots ? '🔴 Closed' : '🟢 Open'}</p>
                    <button class="btn btn-secondary" onclick="editEvent(${event.Event_ID})">✏️ Edit</button>
                    <button class="btn btn-danger" onclick="deleteEvent(${event.Event_ID})">🗑️ Delete</button>
                </div>
            `).join('');
        } else {
            document.getElementById('eventsList').innerHTML = '<div class="card"><p>No events created yet. Click "Create Event" to get started!</p></div>';
        }
    } catch (error) {
        console.error('Load events error:', error);
        document.getElementById('eventsList').innerHTML = '<div class="card"><p style="color:red">Error loading events. Check console for details.</p></div>';
    }
}

async function loadEventSelectors() {
    try {
        const response = await fetch(`${API_URL}/organizer/events`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            const options = data.events.map(e => `<option value="${e.Event_ID}">${e.Event_Name} (${e.Event_Date})</option>`).join('');
            document.getElementById('eventSelect').innerHTML = '<option value="">Select Event</option>' + options;
            document.getElementById('certEventSelect').innerHTML = '<option value="">Select Event</option>' + options;
        }
    } catch (error) {
        console.error('Failed to load event selectors:', error);
    }
}

async function loadVolunteers() {
    const eventId = document.getElementById('eventSelect').value;
    if (!eventId) return;
    
    try {
        const response = await fetch(`${API_URL}/organizer/volunteers/${eventId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.volunteers.length > 0) {
            document.getElementById('volunteersTable').innerHTML = `
                <table>
                    <thead><tr><th>Student ID</th><th>Student Name</th><th>Attendance</th><th>Gratuity Status</th><th>Action</th></tr></thead>
                    <tbody>
                        ${data.volunteers.map(v => `
                            <tr>
                                <td>${v.Student_ID}</td>
                                <td>${v.Student_FullName}</td>
                                <td><span class="status-badge status-${v.Attendance_Status}">${v.Attendance_Status}</span></td>
                                <td><span class="status-badge">${v.Gratuity_Status}</span></td>
                                <td>
                                    <select onchange="updateAttendance(${v.Volunteer_ID}, this.value)">
                                        <option value="">Change Status</option>
                                        <option value="present">Present</option>
                                        <option value="absent">Absent</option>
                                    </select>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            document.getElementById('volunteersTable').innerHTML = '<p>No volunteers registered for this event.</p>';
        }
    } catch (error) {
        console.error('Failed to load volunteers:', error);
    }
}

async function updateAttendance(volunteerId, status) {
    if (!status) return;
    try {
        const response = await fetch(`${API_URL}/organizer/update-attendance`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ volunteerId, status })
        });
        const data = await response.json();
        if (data.success) {
            alert('Attendance updated');
            loadVolunteers();
        }
    } catch (error) {
        alert('Failed to update attendance');
    }
}

async function generateEventReport() {
    try {
        const response = await fetch(`${API_URL}/organizer/event-reports`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.reports.length > 0) {
            document.getElementById('eventReportsTable').innerHTML = `
                <table>
                    <thead><tr><th>Event Name</th><th>Date</th><th>Location</th><th>Slots</th><th>Registered</th><th>Present</th><th>Absent</th></tr></thead>
                    <tbody>
                        ${data.reports.map(r => `
                            <tr>
                                <td>${r.Event_Name}</td>
                                <td>${r.Event_Date}</td>
                                <td>${r.Event_Location}</td>
                                <td>${r.Event_Slots}</td>
                                <td>${r.Event_Registered}</td>
                                <td>${r.present_count || 0}</td>
                                <td>${r.absent_count || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            document.getElementById('eventReportsTable').innerHTML = '<p>No reports available. Create events first.</p>';
        }
    } catch (error) {
        console.error('Failed to generate report:', error);
    }
}

async function generateCertificates() {
    const eventId = document.getElementById('certEventSelect').value;
    if (!eventId) {
        alert('Please select an event');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/organizer/generate-certificates/${eventId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            loadCertificates();
        }
    } catch (error) {
        alert('Failed to generate certificates');
    }
}

async function loadCertificates() {
    const eventId = document.getElementById('certEventSelect').value;
    if (!eventId) return;
    
    try {
        const response = await fetch(`${API_URL}/organizer/certificates/${eventId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.certificates.length > 0) {
            document.getElementById('certificatesList').innerHTML = `
                <table>
                    <thead><tr><th>Student Name</th><th>Student ID</th><th>Certificate Code</th><th>Issue Date</th><th>Action</th></tr></thead>
                    <tbody>
                        ${data.certificates.map(c => `
                            <tr>
                                <td>${c.Student_FullName}</td>
                                <td>${c.Student_ID}</td>
                                <td>${c.certificate_code}</td>
                                <td>${c.issue_date}</td>
                                <td><button onclick="downloadCertificate('${c.certificate_code}')">Download</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            document.getElementById('certificatesList').innerHTML = '<p>No certificates generated yet. Generate after marking attendance.</p>';
        }
    } catch (error) {
        console.error('Failed to load certificates:', error);
    }
}

function downloadCertificate(code) {
    alert(`Certificate ${code} would be downloaded. In production, this generates a PDF.`);
}

async function loadGratuity() {
    try {
        const response = await fetch(`${API_URL}/organizer/gratuity`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.gratuity.length > 0) {
            document.getElementById('gratuityTable').innerHTML = `
                <table>
                    <thead><tr><th>Student Name</th><th>Event</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        ${data.gratuity.map(g => `
                            <tr>
                                <td>${g.Student_ID}</td>
                                <td>${g.Event_ID}</td>
                                <td>RM ${g.Gratuity_Amount || '50.00'}</td>
                                <td>${g.Gratuity_Status}</td>
                                <td>
                                    ${g.Gratuity_Status === 'pending' && g.Attendance_Status === 'present' ? 
                                        `<select onchange="processGratuity(${g.Gratuity_ID}, this.value)">
                                            <option value="">Pay via</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="e_wallet">E-Wallet</option>
                                        </select>` : 'Not eligible'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            document.getElementById('gratuityTable').innerHTML = '<p>No pending gratuity payments.</p>';
        }
    } catch (error) {
        console.error('Failed to load gratuity:', error);
    }
}

async function processGratuity(gratuityId, method) {
    if (!method) return;
    try {
        const response = await fetch(`${API_URL}/organizer/process-gratuity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ gratuityId, method })
        });
        const data = await response.json();
        if (data.success) {
            alert('Gratuity paid successfully');
            loadGratuity();
        }
    } catch (error) {
        alert('Failed to process gratuity');
    }
}

async function submitIssueReport() {
    const details = document.getElementById('issueDetails').value;
    if (!details) {
        alert('Please enter issue details');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/organizer/report-issue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ details })
        });
        const data = await response.json();
        if (data.success) {
            alert('Issue reported successfully');
            document.getElementById('issueDetails').value = '';
            loadMyReports();
        }
    } catch (error) {
        alert('Failed to submit report');
    }
}

async function loadMyReports() {
    try {
        const response = await fetch(`${API_URL}/organizer/my-reports`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success && data.reports.length > 0) {
            document.getElementById('myReportsList').innerHTML = `
                <table>
                    <thead><tr><th>Date</th><th>Details</th><th>Status</th><th>Response</th></tr></thead>
                    <tbody>
                        ${data.reports.map(r => `
                            <tr>
                                <td>${r.Report_Date}</td>
                                <td>${r.Report_Details}</td>
                                <td>${r.status}</td>
                                <td>${r.response || 'Pending review'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            document.getElementById('myReportsList').innerHTML = '<p>No reports submitted yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load reports:', error);
    }
}

function showCreateEventModal() {
    console.log('Opening modal...'); // Debug log
    const modal = document.getElementById('createEventModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        // Clear form
        document.getElementById('eventName').value = '';
        document.getElementById('eventDesc').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventLocation').value = '';
        document.getElementById('eventSlots').value = '50';
    } else {
        console.error('Modal element not found!');
        alert('Error: Modal not found. Please check HTML.');
    }
}

function closeModal() {
    const modal = document.getElementById('createEventModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

 // Click outside to close
        window.onclick = function(event) {
            var modal = document.getElementById('createEventModal');
            if (event.target == modal) {
                closeModal();
            }
        }

// Create Event - FIXED
async function createEvent() {
    console.log('Create event function called');
    
    const eventData = {
        Event_Name: document.getElementById('eventName').value.trim(),
        Event_Desc: document.getElementById('eventDesc').value.trim(),
        Event_Date: document.getElementById('eventDate').value,
        Event_Time: document.getElementById('eventTime').value,
        Event_Location: document.getElementById('eventLocation').value.trim(),
        Event_Slots: parseInt(document.getElementById('eventSlots').value) || 50
    };
    
    // Validation
    if (!eventData.Event_Name) {
        alert('Please enter event name');
        return;
    }
    if (!eventData.Event_Date) {
        alert('Please select event date');
        return;
    }
    if (!eventData.Event_Location) {
        alert('Please enter event location');
        return;
    }
    if (Event_Slots <= 0) {
    return res.status(400).json({ success: false, message: 'Event slots must be greater than 0' });
    }

    console.log('Sending event data:', eventData);
    
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
        console.log('Response:', data);
        
        if (data.success) {
            alert('Event created successfully!');
            closeModal();
            loadEvents(); // Refresh the events list
            loadEventSelectors(); // Refresh dropdowns
        } else {
            alert(data.message || 'Failed to create event');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating event: ' + error.message);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        const response = await fetch(`${API_URL}/organizer/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            alert('Event deleted successfully');
            loadEvents();
            loadEventSelectors();
        }
    } catch (error) {
        alert('Failed to delete event');
    }
}

// Student and Admin placeholder functions (to be implemented)
function initStudentDashboard() { console.log('Student dashboard ready'); }
function initAdminDashboard() { console.log('Admin dashboard ready'); }