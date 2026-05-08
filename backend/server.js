const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
}).promise();

// ============================================
// MIDDLEWARE: Verify Token
// ============================================
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
}

// ============================================
// PASSWORD VALIDATION
// ============================================
function validatePassword(password) {
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain lowercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain a number' };
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return { valid: false, message: 'Password must contain a special character' };
    return { valid: true, message: 'Valid' };
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Student Registration (with password hashing)
app.post('/api/student/register', async (req, res) => {
    const { Student_ID, Student_FullName, Student_DOB, Student_ContactNumber, Student_Email, Student_Password } = req.body;
    
    const passwordValidation = validatePassword(Student_Password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ success: false, message: passwordValidation.message });
    }
    
    try {
        // Store plain text password for demo (in production, use bcrypt)
        await db.query(
            `INSERT INTO students (Student_ID, Student_FullName, Student_DOB, Student_ContactNumber, Student_Email, Student_Password, is_approved) 
             VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
            [Student_ID, Student_FullName, Student_DOB, Student_ContactNumber, Student_Email, Student_Password]
        );
        res.json({ success: true, message: 'Registration successful! Please wait for admin approval.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Student ID or Email already exists' });
        } else {
            console.error(error);
            res.status(500).json({ success: false, message: 'Registration failed' });
        }
    }
});

// SIMPLIFIED LOGIN - Plain text password comparison
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    
    console.log(`Login attempt: ${email}, role: ${role}`);
    
    try {
        let user = null;
        
        if (role === 'student') {
            const [rows] = await db.query('SELECT * FROM students WHERE Student_Email = ?', [email]);
            user = rows[0];
            console.log('Student found:', user ? 'Yes' : 'No');
        } else if (role === 'organizer') {
            const [rows] = await db.query('SELECT * FROM organizers WHERE Organizer_Email = ?', [email]);
            user = rows[0];
            console.log('Organizer found:', user ? 'Yes' : 'No');
        } else if (role === 'admin') {
            const [rows] = await db.query('SELECT * FROM admins WHERE Admin_Email = ?', [email]);
            user = rows[0];
            console.log('Admin found:', user ? 'Yes' : 'No');
        }
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Plain text password comparison (since we stored plain text)
        let passwordMatch = false;
        if (role === 'student') {
            passwordMatch = (password === user.Student_Password);
        } else if (role === 'organizer') {
            passwordMatch = (password === user.Organizer_Password);
        } else if (role === 'admin') {
            passwordMatch = (password === user.Admin_Password);
        }
        
        console.log('Password match:', passwordMatch);
        
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        if (role === 'student' && !user.is_approved) {
            return res.status(401).json({ success: false, message: 'Account pending approval' });
        }
        
        // Get user info
        let userId, userName;
        if (role === 'student') {
            userId = user.Student_ID;
            userName = user.Student_FullName;
        } else if (role === 'organizer') {
            userId = user.Organizer_ID;
            userName = user.Organizer_Name;
        } else {
            userId = user.Admin_ID;
            userName = user.Admin_FullName;
        }
        
        const token = jwt.sign(
            { id: userId, name: userName, email: email, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            token, 
            user: { id: userId, name: userName, email, role } 
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed: ' + error.message });
    }
});

// Verify token
app.post('/api/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(401).json({ success: false });
    }
});

// ============================================
// ORGANIZER ROUTES
// ============================================

// Get Organizer Profile
app.get('/api/organizer/profile', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [rows] = await db.query('SELECT Organizer_ID, Organizer_Name, Organizer_DOE, Organizer_City, Organizer_ContactNumber, Organizer_Email FROM organizers WHERE Organizer_ID = ?', [req.user.id]);
        res.json({ success: true, profile: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Update Password (with plain text for demo)
app.put('/api/organizer/update-password', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    const { currentPassword, newPassword } = req.body;
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        return res.status(400).json({ success: false, message: passwordValidation.message });
    }
    
    try {
        const [rows] = await db.query('SELECT Organizer_Password FROM organizers WHERE Organizer_ID = ?', [req.user.id]);
        
        if (currentPassword !== rows[0].Organizer_Password) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        
        await db.query('UPDATE organizers SET Organizer_Password = ? WHERE Organizer_ID = ?', [newPassword, req.user.id]);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Get Analytics
app.get('/api/organizer/analytics', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [events] = await db.query('SELECT COUNT(*) as total_events, SUM(Event_Registered) as total_registrations FROM events WHERE Organizer_ID = ?', [req.user.id]);
        const [registrations] = await db.query('SELECT COUNT(*) as total_volunteers FROM volunteer_registrations WHERE Organizer_ID = ?', [req.user.id]);
        const [present] = await db.query('SELECT COUNT(*) as present FROM volunteer_registrations WHERE Organizer_ID = ? AND Attendance_Status = "present"', [req.user.id]);
        res.json({ success: true, analytics: { 
            total_events: events[0].total_events || 0, 
            total_registrations: events[0].total_registrations || 0, 
            total_volunteers: registrations[0].total_volunteers || 0, 
            present_count: present[0].present || 0 
        }});
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false });
    }
});

// Get Events - FIXED
app.get('/api/organizer/events', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    try {
        const [events] = await db.query(
            'SELECT * FROM events WHERE Organizer_ID = ? ORDER BY Event_Date DESC',
            [req.user.id]
        );
        console.log('Events found:', events.length);
        res.json({ success: true, events });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ success: false, message: 'Failed to load events' });
    }
});

// Create Event - FIXED VERSION
app.post('/api/organizer/events', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const { Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots } = req.body;
    
    // Validate required fields
    if (!Event_Name || !Event_Date || !Event_Location) {
        return res.status(400).json({ success: false, message: 'Event Name, Date, and Location are required' });
    }
    
    try {
        // Get organizer name from database
        const [organizer] = await db.query('SELECT Organizer_Name FROM organizers WHERE Organizer_ID = ?', [req.user.id]);
        
        if (!organizer || organizer.length === 0) {
            return res.status(404).json({ success: false, message: 'Organizer not found' });
        }
        
        const organizerName = organizer[0].Organizer_Name;
        
        // Insert event
        const [result] = await db.query(
            `INSERT INTO events (Organizer_ID, Organizer_Name, Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots, Event_Registered) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [req.user.id, organizerName, Event_Name, Event_Desc || '', Event_Date, Event_Time || '00:00:00', Event_Location, Event_Slots || 50]
        );
        
        console.log('Event created successfully:', result.insertId);
        res.json({ success: true, message: 'Event created successfully', eventId: result.insertId });
        
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ success: false, message: 'Failed to create event: ' + error.message });
    }
});

// Delete Event
app.delete('/api/organizer/events/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        await db.query('DELETE FROM events WHERE Event_ID=? AND Organizer_ID=?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Get Volunteers
app.get('/api/organizer/volunteers/:eventId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [volunteers] = await db.query('SELECT * FROM volunteer_registrations WHERE Event_ID=? AND Organizer_ID=?', [req.params.eventId, req.user.id]);
        res.json({ success: true, volunteers });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Update Attendance
app.put('/api/organizer/update-attendance', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    const { volunteerId, status } = req.body;
    try {
        await db.query('UPDATE volunteer_registrations SET Attendance_Status=? WHERE Volunteer_ID=?', [status, volunteerId]);
        res.json({ success: true, message: 'Attendance updated' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Get Event Reports
app.get('/api/organizer/event-reports', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [reports] = await db.query(`
            SELECT e.*, 
                (SELECT COUNT(*) FROM volunteer_registrations v WHERE v.Event_ID = e.Event_ID AND v.Attendance_Status = 'present') as present_count,
                (SELECT COUNT(*) FROM volunteer_registrations v WHERE v.Event_ID = e.Event_ID AND v.Attendance_Status = 'absent') as absent_count
            FROM events e 
            WHERE e.Organizer_ID = ?
        `, [req.user.id]);
        res.json({ success: true, reports });
    } catch (error) {
        console.error('Reports error:', error);
        res.status(500).json({ success: false });
    }
});

// Generate Certificates
app.post('/api/organizer/generate-certificates/:eventId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        // 1. Get Event Details first
        const [eventDetails] = await db.query('SELECT * FROM events WHERE Event_ID = ?', [req.params.eventId]);
        if (eventDetails.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        
        const event = eventDetails[0];

        // 2. Get Present Volunteers
        const [volunteers] = await db.query(
            'SELECT * FROM volunteer_registrations WHERE Event_ID=? AND Attendance_Status="present"',
            [req.params.eventId]
        );
        
        let generated = 0;
        for (const v of volunteers) {
            const [existing] = await db.query('SELECT * FROM certificates WHERE Volunteer_ID=?', [v.Volunteer_ID]);
            if (existing.length === 0) {
                const certCode = `USV-${Date.now()}-${v.Volunteer_ID}`;
                await db.query(
                    `INSERT INTO certificates (Volunteer_ID, Event_ID, Student_FullName, Student_ID, Event_Name, Event_Date, Event_Location, Organizer_Name, certificate_code) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [v.Volunteer_ID, v.Event_ID, v.Student_FullName, v.Student_ID, event.Event_Name, event.Event_Date, event.Event_Location, req.user.name, certCode]
                );
                generated++;
            }
        }
        res.json({ success: true, message: `Generated ${generated} certificates` });
    } catch (error) {
        console.error('Certificate error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get Certificates
app.get('/api/organizer/certificates/:eventId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [certificates] = await db.query('SELECT * FROM certificates WHERE Event_ID=?', [req.params.eventId]);
        res.json({ success: true, certificates });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Get Gratuity
app.get('/api/organizer/gratuity', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [gratuity] = await db.query(`
            SELECT g.*, v.Attendance_Status 
            FROM gratuity g 
            JOIN volunteer_registrations v ON g.Volunteer_ID = v.Volunteer_ID 
            WHERE g.Gratuity_Status = 'pending'
        `);
        res.json({ success: true, gratuity });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Process Gratuity
app.post('/api/organizer/process-gratuity', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    const { gratuityId, method } = req.body;
    try {
        await db.query('UPDATE gratuity SET Gratuity_Method=?, Gratuity_Status="completed" WHERE Gratuity_ID=?', [method, gratuityId]);
        res.json({ success: true, message: 'Gratuity paid' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Report Issue
app.post('/api/organizer/report-issue', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    const { details } = req.body;
    try {
        await db.query(
            'INSERT INTO issue_reports (Organizer_ID, Report_Details, Report_Date, Report_Time) VALUES (?, ?, CURDATE(), CURTIME())',
            [req.user.id, details]
        );
        res.json({ success: true, message: 'Issue reported' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Get My Reports
app.get('/api/organizer/my-reports', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [reports] = await db.query('SELECT * FROM issue_reports WHERE Organizer_ID=? ORDER BY Report_Date DESC', [req.user.id]);
        res.json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📝 Default credentials:`);
    console.log(`   Student: student@userve.com / Student@123`);
    console.log(`   Organizer: organizer@userve.com / Org@2024`);
    console.log(`   Admin: admin@userve.com / Admin@123`);
});