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

// ==============================================================
//                    MIDDLEWARE: Verify Token
// ==============================================================
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

// ==============================================================
//                       PASSWORD VALIDATION
// ==============================================================
function validatePassword(password) {
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain lowercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain a number' };
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return { valid: false, message: 'Password must contain a special character' };
    return { valid: true, message: 'Valid' };
}

// ==============================================================
//                     AUTHENTICATION ROUTES
// ==============================================================

// Student Registration
app.post('/api/register/student', async (req, res) => {
    const { Student_ID, Student_FullName, Student_DOB, Student_ContactNumber, Student_Email, Student_Password } = req.body;
    
    const passwordValidation = validatePassword(Student_Password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ success: false, message: passwordValidation.message });
    }
    
    try {
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

// SIMPLIFIED LOGIN
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

// ==============================================================
//                         ORGANIZER ROUTES
// ==============================================================

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

// Update Password
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

// Get Events
app.get('/api/organizer/events', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
        const [events] = await db.query(
            'SELECT * FROM events WHERE Organizer_ID = ? ORDER BY Event_Date DESC',
            [req.user.id]
        );
        res.json({ success: true, events });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ success: false, message: 'Failed to load events' });
    }
});

// Create Event
app.post('/api/organizer/events', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots } = req.body;

    try {
        await db.query(
            `INSERT INTO events (Organizer_ID, Organizer_Name, Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, req.user.name, Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots]
        );
        res.json({ success: true, message: 'Event created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Update Event
app.put('/api/organizer/events/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false, message: 'Access denied' });
    
    const { Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots } = req.body;
    
    try {
        await db.query(
            `UPDATE events SET 
                Event_Name = ?, 
                Event_Desc = ?, 
                Event_Date = ?, 
                Event_Time = ?, 
                Event_Location = ?, 
                Event_Slots = ? 
             WHERE Event_ID = ? AND Organizer_ID = ?`,
            [Event_Name, Event_Desc || '', Event_Date, Event_Time || '00:00:00', Event_Location, Event_Slots || 50, req.params.id, req.user.id]
        );
        res.json({ success: true, message: 'Event updated successfully' });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ success: false, message: 'Update failed: ' + error.message });
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

// Update Attendance & Gratuity Route
app.post('/api/organizer/update-attendance', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') {
        return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }
    
    const { volunteerId, status } = req.body;
    
    try {
        // 1. Update the attendance status in volunteer_registrations
        await db.query(
            'UPDATE volunteer_registrations SET Attendance_Status = ? WHERE Volunteer_ID = ?', 
            [status, volunteerId]
        );
        
        // 2. If status is updated to 'present', handle clean gratuity mapping
        if (status === 'present') {
            // Check if a gratuity record already exists for this unique registration
            const [exists] = await db.query(
                'SELECT * FROM gratuity WHERE Volunteer_ID = ?', 
                [volunteerId]
            );
            
            // Relational mapping: Only insert Volunteer_ID and Gratuity_Status 
            // (Your database handles details via JOINs using Volunteer_ID!)
            if (exists.length === 0) {
                await db.query(
                    'INSERT INTO gratuity (Volunteer_ID, Gratuity_Status) VALUES (?, "pending")',
                    [volunteerId]
                );
            }
        }
        
        // Return a reliable, clean JSON response back to script.js
        return res.json({ 
            success: true, 
            message: 'Attendance metrics synchronized and gratuity processed successfully!' 
        });

    } catch (error) {
        console.error('❌ SQL Execution Failure inside Attendance Update:', error);
        res.status(500).json({ 
            success: false, 
            message: `Internal Server Database Error: ${error.message}` 
        });
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
        const [eventDetails] = await db.query('SELECT * FROM events WHERE Event_ID = ?', [req.params.eventId]);
        if (eventDetails.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        
        const event = eventDetails[0];

        const [volunteers] = await db.query(`
            SELECT v.*, e.Event_Location 
            FROM volunteer_registrations v 
            JOIN events e ON v.Event_ID = e.Event_ID 
            WHERE v.Event_ID=? AND v.Attendance_Status="present"`, 
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
    'INSERT INTO issue_reports (Organizer_ID, Report_Details, Report_Date, Report_Time, status) VALUES (?, ?, CURDATE(), CURTIME(), "pending")',
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

// ==============================================================
//                         STUDENT ROUTES
// ==============================================================

// Get Student Profile
app.get('/api/student/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students WHERE Student_ID = ?', [req.user.id]);
        res.json({ success: true, profile: rows[0] });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Get Student's Earned Certificates
app.get('/api/student/my-certificates', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM certificates WHERE Student_ID = ?', [req.user.id]);
        res.json({ success: true, certificates: rows });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Student Submit Issue
app.post('/api/student/report-issue', verifyToken, async (req, res) => {
    const { details } = req.body;
    try {
        await db.query(
    'INSERT INTO issue_reports (Student_ID, Report_Details, Report_Date, Report_Time, status) VALUES (?, ?, CURDATE(), CURTIME(), "pending")',
    [req.user.id, details]
);
        res.json({ success: true, message: 'Issue reported to admin' });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Get all available events for students to join
app.get('/api/student/events', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM events ORDER BY Event_Date ASC');
        res.json({ success: true, events: rows });
    } catch (error) {
        console.error('Error fetching events for students:', error);
        res.status(500).json({ success: false, message: 'Could not load events' });
    }
});

// Student joins an event (FIXED EXTENDED SELECTION)
app.post('/api/student/join-event', verifyToken, async (req, res) => {
    const { eventId } = req.body;
    const studentId = req.user.id;
    const studentName = req.user.name;

    try {
        // FIX: Changed from specific columns to '*' so we pull structural details like Event_Name, Organizer_ID, etc.
        const [eventRows] = await db.query('SELECT * FROM events WHERE Event_ID = ?', [eventId]);
        if (eventRows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        
        const event = eventRows[0];

        if (event.Event_Registered >= event.Event_Slots) {
            return res.status(400).json({ 
                success: false, 
                message: 'Sorry, this event just reached its maximum capacity!' 
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM volunteer_registrations WHERE Student_ID = ? AND Event_ID = ?', 
            [studentId, eventId]
        );
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'You are already registered for this event' });

        await db.query(
            `INSERT INTO volunteer_registrations 
            (Student_ID, Student_FullName, Event_ID, Event_Name, Organizer_ID, Event_Date, Attendance_Status) 
            VALUES (?, ?, ?, ?, ?, ?, 'absent')`,
            [studentId, studentName, event.Event_ID, event.Event_Name, event.Organizer_ID, event.Event_Date]
        );

        await db.query('UPDATE events SET Event_Registered = Event_Registered + 1 WHERE Event_ID = ?', [eventId]);

        res.json({ success: true, message: 'Successfully joined the event!' });
    } catch (error) {
        console.error('Join event error:', error);
        res.status(500).json({ success: false, message: 'Database error while joining' });
    }
});

// Get only joined events for the calendar
app.get('/api/student/my-calendar-events', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                e.Event_Name as title, 
                e.Event_Date as start,
                e.Event_Time,
                e.Event_Location as description
            FROM volunteer_registrations v
            JOIN events e ON v.Event_ID = e.Event_ID
            WHERE v.Student_ID = ?`, 
            [req.user.id]
        );
        
        const formattedEvents = rows.map(event => ({
            title: event.title,
            start: `${event.start.toISOString().split('T')[0]}T${event.Event_Time || '00:00:00'}`,
            extendedProps: {
                location: event.description
            },
            backgroundColor: '#667eea', 
            borderColor: '#764ba2'
        }));

        res.json({ success: true, events: formattedEvents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// Get Activity Record
app.get('/api/student/activity-summary', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.id;

        const [history] = await db.query(`
            SELECT v.*, c.certificate_code 
            FROM volunteer_registrations v
            LEFT JOIN certificates c ON v.Volunteer_ID = c.Volunteer_ID
            WHERE v.Student_ID = ?
            ORDER BY v.Event_Date DESC`, 
            [studentId]
        );

        const totalJoined = history.length;
        const totalPresent = history.filter(h => h.Attendance_Status === 'present').length;

        res.json({ 
            success: true, 
            history, 
            stats: { totalJoined, totalPresent } 
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// ==============================================================
//                         ADMIN ROUTES
// ==============================================================

// Helper: Ensure the calling authenticated token belongs to an administrator
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied: Admin credentials required' });
}

// 1. Get System Overview Data & User Proportions (Analytics)
app.get('/api/admin/analytics', verifyToken, requireAdmin, async (req, res) => {
    try {
        // Query high-level totals
        const [[{ total_students }]]   = await db.query('SELECT COUNT(*) as total_students FROM students');
        const [[{ pending_approvals }]] = await db.query('SELECT COUNT(*) as pending_approvals FROM students WHERE is_approved = FALSE');
        const [[{ total_organizers }]]  = await db.query('SELECT COUNT(*) as total_organizers FROM organizers');
        const [[{ total_admins }]]      = await db.query('SELECT COUNT(*) as total_admins FROM admins');
        const [[{ total_events }]]      = await db.query('SELECT COUNT(*) as total_events FROM events');
        const [[{ open_issues }]]       = await db.query('SELECT COUNT(*) as open_issues FROM issue_reports WHERE Is_Resolved = FALSE OR Is_Resolved IS NULL');

        res.json({
            success: true,
            stats: {
                total_users: total_students + total_organizers + total_admins,
                student_count: total_students,
                organizer_count: total_organizers,
                admin_count: total_admins,
                pending_approvals,
                total_events,
                open_issues
            }
        });
    } catch (error) {
        console.error('Admin Analytics Query Failure:', error);
        res.status(500).json({ success: false, message: 'Internal error compiling telemetry data' });
    }
});

// 2. Fetch Personal Administrator Account Record (Profile)
app.get('/api/admin/profile', verifyToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT Admin_ID, Admin_FullName, Admin_Email FROM admins WHERE Admin_ID = ?', 
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin record missing' });
        }
        
        res.json({ success: true, profile: rows[0] });
    } catch (error) {
        console.error('Admin Profile Fetch Failure:', error);
        res.status(500).json({ success: false, message: 'Server database read failure' });
    }
});

// 3a. Retrieve Unapproved Students List (User Approval Queue)
app.get('/api/admin/pending-users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT Student_ID as User_ID, Student_FullName as User_FullName, Student_Email as User_Email, Student_ContactNumber, "student" as User_Role, NOW() as Registration_Date FROM students WHERE is_approved = FALSE'
        );
        res.json({ success: true, users: rows });
    } catch (error) {
        console.error('Pending Approvals Query Error:', error);
        res.status(500).json({ success: false, message: 'Could not access pending registries' });
    }
});

// 3b. Commit Action State Change on Pending Registration (Approve or Reject)
app.post('/api/admin/approve-user', verifyToken, requireAdmin, async (req, res) => {
    const { userId, action } = req.body;
    
    try {
        if (action === 'approve') {
            await db.query('UPDATE students SET is_approved = TRUE WHERE Student_ID = ?', [userId]);
            res.json({ success: true, message: 'Account status provisioned to live successfully' });
        } else if (action === 'reject') {
            // Drop unapproved profile if rejected outright by policy
            await db.query('DELETE FROM students WHERE Student_ID = ? AND is_approved = FALSE', [userId]);
            res.json({ success: true, message: 'Registration profile dropped safely from system storage' });
        } else {
            res.status(400).json({ success: false, message: 'Unrecognized administrative response behavior token' });
        }
    } catch (error) {
        console.error('Approval Modification Core Failure:', error);
        res.status(500).json({ success: false, message: 'A server environment failure blocked user state update' });
    }
});

// 4a. Read Global Issue Feed logs (Issue Centre) - ALIGNED WITH YOUR ENUM & SCHEMA
app.get('/api/admin/issues', verifyToken, requireAdmin, async (req, res) => {
    try {
        // Pulling your exact columns, coalescing the reporter ID, and capturing your 'status' ENUM
        const [rows] = await db.query(`
            SELECT 
                IssueReport_ID, 
                COALESCE(Student_ID, Organizer_ID) as Reporter_ID, 
                IF(Student_ID IS NOT NULL, 'student', 'organizer') as Reporter_Type,
                Report_Details, 
                Report_Date, 
                Report_Time,
                status,
                response
            FROM issue_reports 
            ORDER BY 
                CASE status 
                    WHEN 'pending' THEN 1 
                    WHEN 'reviewed' THEN 2 
                    WHEN 'resolved' THEN 3 
                END ASC, 
                Report_Date DESC, 
                Report_Time DESC
        `);
        res.json({ success: true, issues: rows });
    } catch (error) {
        console.error('Global Incident Ledger Read Failure:', error);
        res.status(500).json({ success: false, message: 'Failed retrieving issue collection array' });
    }
});

// 4b. Update Lifecycle State flag on Ticket to 'resolved'
app.put('/api/admin/resolve-issue/:reportId', verifyToken, requireAdmin, async (req, res) => {
    const { reportId } = req.params;
    const adminId = req.user.id; // Capture which admin is resolving it
    
    try {
        // Updates your exact 'status' column to 'resolved' and logs the Admin_ID who handled it
        await db.query(
            'UPDATE issue_reports SET status = "resolved", Admin_ID = ?, response = "Resolved by Admin" WHERE IssueReport_ID = ?', 
            [adminId, reportId]
        );
        res.json({ success: true, message: 'Incident profile state updated to resolved.' });
    } catch (error) {
        console.error('Incident Modification Target Crash:', error);
        res.status(500).json({ success: false, message: 'Remote entity lifecycle state modification error' });
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