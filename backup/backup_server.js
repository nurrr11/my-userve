const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// HTTP Server & Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

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
//                  FCFS WAITLIST HELPER FUNCTION
// ==============================================================
async function promoteNextFromWaitlist(eventId) {
    try {
        const [events] = await db.query('SELECT * FROM events WHERE Event_ID = ?', [eventId]);
        if (events.length === 0) return false;
        const event = events[0];

        if (event.Event_Registered < event.Event_Slots) {
            // Get earliest candidate in FCFS order
            const [waitlisted] = await db.query(
                'SELECT * FROM event_waitlist WHERE Event_ID = ? ORDER BY Created_At ASC LIMIT 1',
                [eventId]
            );

            if (waitlisted.length > 0) {
                const candidate = waitlisted[0];

                // Check for schedule overlap before promoting
                const [overlapping] = await db.query(
                    `SELECT e.Event_Name FROM volunteer_registrations v 
                     JOIN events e ON v.Event_ID = e.Event_ID 
                     WHERE v.Student_ID = ? AND e.Event_Date = ? AND e.Event_Time = ?`,
                    [candidate.Student_ID, event.Event_Date, event.Event_Time]
                );

                if (overlapping.length === 0) {
                    await db.query(
                        `INSERT INTO volunteer_registrations 
                        (Student_ID, Student_FullName, Event_ID, Event_Name, Organizer_ID, Event_Date, Attendance_Status) 
                        VALUES (?, ?, ?, ?, ?, ?, 'absent')`,
                        [candidate.Student_ID, candidate.Student_FullName, event.Event_ID, event.Event_Name, event.Organizer_ID, event.Event_Date]
                    );

                    await db.query('UPDATE events SET Event_Registered = Event_Registered + 1 WHERE Event_ID = ?', [eventId]);
                    await db.query('DELETE FROM event_waitlist WHERE Waitlist_ID = ?', [candidate.Waitlist_ID]);

                    console.log(`⚡ [FCFS Auto-Promote] Student ${candidate.Student_FullName} promoted from waitlist to Event #${eventId}`);
                    return true;
                } else {
                    // Candidate has time conflict, drop from waitlist and try next in queue
                    await db.query('DELETE FROM event_waitlist WHERE Waitlist_ID = ?', [candidate.Waitlist_ID]);
                    return promoteNextFromWaitlist(eventId);
                }
            }
        }
        return false;
    } catch (error) {
        console.error('FCFS Promotion Error:', error);
        return false;
    }
}

// ==============================================================
//                     AUTHENTICATION ROUTES
// ==============================================================

// Student Registration
app.post('/api/register/student', async (req, res) => {
    const { regID, regName, regEmail, regPass, regContact, regDOB } = req.body;

    const uitmEmailRegex = /^[a-zA-Z0-9.]+@student\.uitm\.edu\.my$/i;
    if (!regEmail || !uitmEmailRegex.test(regEmail)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid email address. Registration only permits UiTM student emails (@student.uitm.edu.my).' 
        });
    }

    const passCheck = validatePassword(regPass);
    if (!passCheck.valid) {
        return res.status(400).json({ success: false, message: passCheck.message });
    }

    try {
        const query = `
            INSERT INTO students 
            (Student_ID, Student_FullName, Student_Email, Student_Password, Student_ContactNumber, Student_DOB, is_approved) 
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `;
        await db.query(query, [regID, regName, regEmail, regPass, regContact, regDOB]);
        res.json({ success: true, message: 'Registration submitted successfully! Awaiting admin approval.' });
    } catch (err) {
        console.error('MySQL Registration Error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Student ID or Email already exists.' });
        }
        res.status(500).json({ success: false, message: 'Database error during registration.' });
    }
});

// Organizer Registration
app.post('/api/register/organizer', async (req, res) => {
    const { orgID, orgName, orgEmail, orgPass, orgContact, orgCity, orgDOE } = req.body;

    const standardEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!orgEmail || !standardEmailRegex.test(orgEmail)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid email address.' 
        });
    }

    const passCheck = validatePassword(orgPass);
    if (!passCheck.valid) {
        return res.status(400).json({ success: false, message: passCheck.message });
    }

    try {
        const query = `
            INSERT INTO organizers 
            (Organizer_ID, Organizer_Name, Organizer_Email, Organizer_Password, Organizer_ContactNumber, Organizer_City, Organizer_DOE, is_approved) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `;
        await db.query(query, [orgID, orgName, orgEmail, orgPass, orgContact, orgCity, orgDOE]);
        res.json({ success: true, message: 'Registration submitted successfully! Awaiting admin approval.' });
    } catch (err) {
        console.error('MySQL Registration Error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Organizer ID or Email already exists.' });
        }
        res.status(500).json({ success: false, message: 'Database error during registration.' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        let user = null;
        if (role === 'student') {
            const [rows] = await db.query('SELECT * FROM students WHERE Student_Email = ?', [email]);
            user = rows[0];
        } else if (role === 'organizer') {
            const [rows] = await db.query('SELECT * FROM organizers WHERE Organizer_Email = ?', [email]);
            user = rows[0];
        } else if (role === 'admin') {
            const [rows] = await db.query('SELECT * FROM admins WHERE Admin_Email = ?', [email]);
            user = rows[0];
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Please check your details again.' });
        }

        let passwordMatch = false;
        if (role === 'student') passwordMatch = (password === user.Student_Password);
        else if (role === 'organizer') passwordMatch = (password === user.Organizer_Password);
        else if (role === 'admin') passwordMatch = (password === user.Admin_Password);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if ((role === 'student' || role === 'organizer') && (user.is_approved === 0 || user.is_approved === false)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your registration is pending Admin approval. Please try again later.' 
            });
        }

        let userId = role === 'student' ? user.Student_ID : role === 'organizer' ? user.Organizer_ID : user.Admin_ID;
        let userName = role === 'student' ? user.Student_FullName : role === 'organizer' ? user.Organizer_Name : user.Admin_FullName;

        const token = jwt.sign(
            { id: userId, name: userName, email: email, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ success: true, token, user: { id: userId, name: userName, email, role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed: ' + error.message });
    }
});

// Verify Token
app.post('/api/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (error) {
        res.status(401).json({ success: false });
    }
});

// ==============================================================
//                     SOCKET.IO REAL-TIME CHAT
// ==============================================================
io.on('connection', (socket) => {
    socket.on('join_room', (userId) => {
        socket.join(userId);
    });

    socket.on('send_message', async (data) => {
        const { senderId, senderRole, receiverId, message } = data;
        try {
            await db.query(
                `INSERT INTO chats (Sender_ID, Sender_Role, Receiver_ID, Message) VALUES (?, ?, ?, ?)`,
                [senderId, senderRole, receiverId, message]
            );

            const messagePayload = { senderId, senderRole, receiverId, message, sentAt: new Date() };
            io.to(receiverId).emit('receive_message', messagePayload);
            io.to(senderId).emit('receive_message', messagePayload);
        } catch (err) {
            console.error('Socket Message Error:', err);
        }
    });
});

// Chat History API
app.get('/api/chat/contacts', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT u.id, u.name, u.role, MAX(m.Timestamp) as last_msg_time
            FROM (
                SELECT Student_ID as id, Student_FullName as name, 'student' as role FROM students
                UNION
                SELECT Organizer_ID as id, Organizer_Name as name, 'organizer' as role FROM organizers
                UNION
                SELECT Admin_ID as id, Admin_FullName as name, 'admin' as role FROM admins
            ) u
            INNER JOIN chats m 
                ON (m.Sender_ID = u.id AND m.Receiver_ID = ?) 
                OR (m.Receiver_ID = u.id AND m.Sender_ID = ?)
            WHERE u.id != ?
            GROUP BY u.id, u.name, u.role
            ORDER BY last_msg_time DESC;
        `;
        const [contacts] = await db.query(query, [userId, userId, userId]);
        res.json({ success: true, contacts });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch contacts list' });
    }
});

app.get('/api/chat/history/:otherUserId', verifyToken, async (req, res) => {
    const userId = req.user.id.toString();
    const otherUserId = req.params.otherUserId.toString();
    try {
        const [messages] = await db.query(
            `SELECT Chat_ID, Sender_ID, Sender_Role, Receiver_ID, Receiver_Role, Message, Timestamp
             FROM chats 
             WHERE (Sender_ID = ? AND Receiver_ID = ?) OR (Sender_ID = ? AND Receiver_ID = ?)
             ORDER BY Timestamp ASC`,
            [userId, otherUserId, otherUserId, userId]
        );
        const formattedMessages = messages.map(msg => ({
            id: msg.Chat_ID,
            senderId: msg.Sender_ID.toString(),
            senderRole: msg.Sender_Role,
            receiverId: msg.Receiver_ID.toString(),
            receiverRole: msg.Receiver_Role,
            message: msg.Message,
            timestamp: msg.Timestamp
        }));
        res.json({ success: true, messages: formattedMessages });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to retrieve chat history' });
    }
});

// ==============================================================
//                         ORGANIZER ROUTES
// ==============================================================

app.get('/api/organizer/profile', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [rows] = await db.query('SELECT Organizer_ID, Organizer_Name, Organizer_DOE, Organizer_City, Organizer_ContactNumber, Organizer_Email FROM organizers WHERE Organizer_ID = ?', [req.user.id]);
        res.json({ success: true, profile: rows[0] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/organizer/analytics', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [events] = await db.query('SELECT COUNT(*) as total_events, COALESCE(SUM(Event_Registered), 0) as total_registrations FROM events WHERE Organizer_ID = ?', [req.user.id]);
        const [registrations] = await db.query('SELECT COUNT(*) as total_volunteers FROM volunteer_registrations WHERE Organizer_ID = ?', [req.user.id]);
        const [present] = await db.query('SELECT COUNT(*) as present FROM volunteer_registrations WHERE Organizer_ID = ? AND Attendance_Status = "present"', [req.user.id]);

        res.json({ 
            success: true, 
            analytics: { 
                total_events: Number(events[0]?.total_events) || 0, 
                total_registrations: Number(events[0]?.total_registrations) || 0, 
                total_volunteers: Number(registrations[0]?.total_volunteers) || 0, 
                present_count: Number(present[0]?.present) || 0 
            }
        });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/organizer/events', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [events] = await db.query('SELECT * FROM events WHERE Organizer_ID = ? ORDER BY Event_Date DESC', [req.user.id]);
        res.json({ success: true, events });
    } catch (error) { res.status(500).json({ success: false }); }
});

// POST: Create New Event
app.post('/api/organizer/events', verifyToken, async (req, res) => {
    const organizerId = req.user.Organizer_ID || req.user.id; 
    const { Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots } = req.body;

    try {
        // 1. Per-organizer schedule overlap check
        const [existing] = await db.query(
            `SELECT Event_Name FROM events 
             WHERE Organizer_ID = ? AND DATE(Event_Date) = DATE(?) AND TIME(Event_Time) = TIME(?)`,
            [organizerId, Event_Date, Event_Time]
        );

        if (existing && existing.length > 0) {
            return res.status(400).json({
                success: false,
                isOverlap: true,
                message: `You already have another event ("${existing[0].Event_Name}") scheduled on ${Event_Date} at ${Event_Time}.`
            });
        }

        // 2. Fetch Organizer Name to satisfy NOT NULL database constraint
        const [orgRows] = await db.query('SELECT Organizer_Name FROM organizers WHERE Organizer_ID = ?', [organizerId]);
        const organizerName = orgRows.length > 0 ? orgRows[0].Organizer_Name : (req.user.name || 'Organizer');

        // 3. Insert new event record
        await db.query(
            `INSERT INTO events (Organizer_ID, Organizer_Name, Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots, Event_Registered) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [organizerId, organizerName, Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots || 50]
        );

        res.json({ success: true, message: 'Event created successfully!' });
    } catch (err) {
        console.error('CRITICAL ERROR in POST /api/organizer/events:', err);
        res.status(500).json({ success: false, message: 'Server error creating event: ' + err.message });
    }
});

// PUT: Update Existing Event
app.put('/api/organizer/events/:id', verifyToken, async (req, res) => {
    const organizerId = req.user.Organizer_ID || req.user.id;
    const eventId = req.params.id;
    const { Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots } = req.body;

    try {
        const [existing] = await db.query(
            `SELECT Event_Name FROM events 
             WHERE Organizer_ID = ? AND DATE(Event_Date) = DATE(?) AND TIME(Event_Time) = TIME(?) AND Event_ID != ?`,
            [organizerId, Event_Date, Event_Time, eventId]
        );

        if (existing && existing.length > 0) {
            return res.status(400).json({
                success: false,
                isOverlap: true,
                message: `Schedule Conflict: You already have another event ("${existing[0].Event_Name}") on ${Event_Date} at ${Event_Time}.`
            });
        }

        await db.query(
            `UPDATE events SET Event_Name=?, Event_Desc=?, Event_Date=?, Event_Time=?, Event_Location=?, Event_Slots=? 
             WHERE Event_ID=? AND Organizer_ID=?`,
            [Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots, eventId, organizerId]
        );

        res.json({ success: true, message: 'Event updated successfully!' });
    } catch (err) {
        console.error('CRITICAL ERROR in PUT /api/organizer/events/:id:', err);
        res.status(500).json({ success: false, message: 'Server error updating event: ' + err.message });
    }
});

app.delete('/api/organizer/events/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        await db.query('DELETE FROM events WHERE Event_ID=? AND Organizer_ID=?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Event deleted' });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/organizer/volunteers/:eventId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [volunteers] = await db.query('SELECT * FROM volunteer_registrations WHERE Event_ID=? AND Organizer_ID=?', [req.params.eventId, req.user.id]);
        res.json({ success: true, volunteers });
    } catch (error) { res.status(500).json({ success: false }); }
});

// Remove Volunteer (triggers FCFS Auto-Promotion)
app.delete('/api/organizer/volunteers/:volunteerId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [vol] = await db.query('SELECT Event_ID FROM volunteer_registrations WHERE Volunteer_ID = ?', [req.params.volunteerId]);
        if (vol.length > 0) {
            const eventId = vol[0].Event_ID;
            await db.query('DELETE FROM volunteer_registrations WHERE Volunteer_ID = ?', [req.params.volunteerId]);
            await db.query('UPDATE events SET Event_Registered = GREATEST(0, Event_Registered - 1) WHERE Event_ID = ?', [eventId]);
            
            // FCFS Auto-Promotion
            await promoteNextFromWaitlist(eventId);
        }
        res.json({ success: true, message: 'Volunteer removed successfully' });
    } catch (error) { res.status(500).json({ success: false, message: 'Failed to remove volunteer' }); }
});

// Get Event FCFS Waitlist Queue for Organizer
app.get('/api/organizer/waitlist/:eventId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [waitlist] = await db.query(
            `SELECT w.*, s.Student_Email, s.Student_ContactNumber 
             FROM event_waitlist w
             JOIN students s ON w.Student_ID = s.Student_ID
             WHERE w.Event_ID = ?
             ORDER BY w.Created_At ASC`,
            [req.params.eventId]
        );
        res.json({ success: true, waitlist });
    } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch waitlist' }); }
});

// Manual Promotion from Waitlist by Organizer
app.post('/api/organizer/promote-waitlist', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    const { eventId, waitlistId } = req.body;

    try {
        const [waitlistRows] = await db.query('SELECT * FROM event_waitlist WHERE Waitlist_ID = ?', [waitlistId]);
        if (waitlistRows.length === 0) return res.status(404).json({ success: false, message: 'Waitlist record not found' });

        const candidate = waitlistRows[0];
        const [eventRows] = await db.query('SELECT * FROM events WHERE Event_ID = ?', [eventId]);
        if (eventRows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });

        const event = eventRows[0];

        await db.query(
            `INSERT INTO volunteer_registrations 
            (Student_ID, Student_FullName, Event_ID, Event_Name, Organizer_ID, Event_Date, Attendance_Status) 
            VALUES (?, ?, ?, ?, ?, ?, 'absent')`,
            [candidate.Student_ID, candidate.Student_FullName, event.Event_ID, event.Event_Name, event.Organizer_ID, event.Event_Date]
        );

        await db.query('UPDATE events SET Event_Registered = Event_Registered + 1 WHERE Event_ID = ?', [eventId]);
        await db.query('DELETE FROM event_waitlist WHERE Waitlist_ID = ?', [waitlistId]);

        res.json({ success: true, message: `Successfully promoted ${candidate.Student_FullName} from waitlist to event roster!` });
    } catch (error) {
        console.error('Manual promotion error:', error);
        res.status(500).json({ success: false, message: 'Failed to promote student' });
    }
});

app.post('/api/organizer/update-attendance', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    const { volunteerId, status } = req.body;

    try {
        await db.query('UPDATE volunteer_registrations SET Attendance_Status = ? WHERE Volunteer_ID = ?', [status, volunteerId]);

        if (status === 'present') {
            const [existing] = await db.query('SELECT Gratuity_ID FROM gratuity WHERE Volunteer_ID = ?', [volunteerId]);
            if (existing.length === 0) {
                const [registration] = await db.query('SELECT Volunteer_ID, Event_ID, Student_ID FROM volunteer_registrations WHERE Volunteer_ID = ?', [volunteerId]);
                if (registration.length > 0) {
                    const volunteer = registration[0];
                    await db.query('INSERT INTO gratuity (Event_ID, Volunteer_ID, Student_ID, Gratuity_Amount, Gratuity_Status) VALUES (?, ?, ?, 0.00, "pending")',
                        [volunteer.Event_ID, volunteer.Volunteer_ID, volunteer.Student_ID]
                    );
                }
            }
        }
        res.json({ success: true, message: 'Attendance updated successfully.' });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/organizer/event-reports', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [reports] = await db.query(`
            SELECT e.*, 
                (SELECT COUNT(*) FROM volunteer_registrations v WHERE v.Event_ID = e.Event_ID AND v.Attendance_Status = 'present') as present_count,
                (SELECT COUNT(*) FROM volunteer_registrations v WHERE v.Event_ID = e.Event_ID AND v.Attendance_Status = 'absent') as absent_count
            FROM events e WHERE e.Organizer_ID = ?`, [req.user.id]
        );
        res.json({ success: true, reports });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/organizer/generate-certificates/:eventId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [eventDetails] = await db.query('SELECT * FROM events WHERE Event_ID = ?', [req.params.eventId]);
        if (eventDetails.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        
        const event = eventDetails[0];
        const [volunteers] = await db.query(`
            SELECT v.*, e.Event_Location FROM volunteer_registrations v 
            JOIN events e ON v.Event_ID = e.Event_ID 
            WHERE v.Event_ID=? AND v.Attendance_Status="present"`, [req.params.eventId]
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
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/organizer/certificates/:eventId', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [certificates] = await db.query('SELECT * FROM certificates WHERE Event_ID=?', [req.params.eventId]);
        res.json({ success: true, certificates });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/organizer/gratuity', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    try {
        const [gratuity] = await db.query(`
            SELECT g.*, v.Attendance_Status 
            FROM gratuity g JOIN volunteer_registrations v ON g.Volunteer_ID = v.Volunteer_ID 
            WHERE g.Gratuity_Status = 'pending'`
        );
        res.json({ success: true, gratuity });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/organizer/process-gratuity', verifyToken, async (req, res) => {
    if (req.user.role !== 'organizer') return res.status(403).json({ success: false });
    const { gratuityId, method } = req.body;
    try {
        await db.query('UPDATE gratuity SET Gratuity_Method=?, Gratuity_Status="completed" WHERE Gratuity_ID=?', [method, gratuityId]);
        res.json({ success: true, message: 'Gratuity paid' });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/issues', verifyToken, async (req, res) => {
    const { description } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (!description || !description.trim()) return res.status(400).json({ success: false, message: 'Description required' });

    try {
        const studentId = userRole === 'student' ? userId : null;
        const organizerId = userRole === 'organizer' ? userId : null;
        const reportDate = new Date().toISOString().split('T')[0];
        const reportTime = new Date().toTimeString().split(' ')[0];

        await db.query(
            `INSERT INTO issue_reports (Student_ID, Organizer_ID, Report_Details, Report_Date, Report_Time, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
            [studentId, organizerId, description, reportDate, reportTime]
        );
        res.json({ success: true, message: 'Report submitted successfully' });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/my-issues', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    try {
        let query = userRole === 'student' ? 'SELECT * FROM issue_reports WHERE Student_ID = ? ORDER BY IssueReport_ID DESC'
                  : 'SELECT * FROM issue_reports WHERE Organizer_ID = ? ORDER BY IssueReport_ID DESC';
        const [rows] = await db.query(query, [userId]);
        res.json({ success: true, reports: rows });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ==============================================================
//                         STUDENT ROUTES
// ==============================================================

app.get('/api/student/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students WHERE Student_ID = ?', [req.user.id]);
        res.json({ success: true, profile: rows[0] });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/student/my-certificates', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM certificates WHERE Student_ID = ?', [req.user.id]);
        res.json({ success: true, certificates: rows });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/student/events', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM events ORDER BY Event_Date ASC');
        res.json({ success: true, events: rows });
    } catch (error) { res.status(500).json({ success: false }); }
});

// Student Join Event (WITH FCFS WAITLIST FALLBACK)
app.post('/api/student/join-event', verifyToken, async (req, res) => {
    const studentId = req.user.Student_ID || req.user.id;
    const studentName = req.user.Student_FullName || req.user.name;
    const { eventId } = req.body;

    try {
        // 1. Fetch Target Event Details
        const [eventRows] = await db.query(`SELECT * FROM events WHERE Event_ID = ?`, [eventId]);
        if (!eventRows || eventRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        const targetEvent = eventRows[0];

        // 2. Duplicate Registration Check
        const [alreadyJoined] = await db.query(
            `SELECT * FROM volunteer_registrations WHERE Student_ID = ? AND Event_ID = ?`,
            [studentId, eventId]
        );
        if (alreadyJoined && alreadyJoined.length > 0) {
            return res.status(400).json({
                success: false,
                isAlreadyRegistered: true,
                message: 'You are already registered for this event.'
            });
        }

        // 3. Waitlist Duplicate Check
        const [alreadyWaitlisted] = await db.query(
            `SELECT * FROM event_waitlist WHERE Student_ID = ? AND Event_ID = ?`,
            [studentId, eventId]
        );
        if (alreadyWaitlisted && alreadyWaitlisted.length > 0) {
            return res.status(400).json({
                success: false,
                isWaitlisted: true,
                message: 'You are already on the waitlist for this event.'
            });
        }

        // 4. Pure SQL Per-Student Schedule Overlap Check (Bypasses JS Timezone/Formatting Issues)
        const [overlapCheck] = await db.query(
            `SELECT existing_e.Event_Name, 
                    DATE_FORMAT(existing_e.Event_Date, '%Y-%m-%d') as Event_Date, 
                    existing_e.Event_Time 
             FROM volunteer_registrations vr
             JOIN events existing_e ON vr.Event_ID = existing_e.Event_ID
             JOIN events target_e ON target_e.Event_ID = ?
             WHERE vr.Student_ID = ? 
               AND DATE(existing_e.Event_Date) = DATE(target_e.Event_Date) 
               AND TIME(existing_e.Event_Time) = TIME(target_e.Event_Time)`,
            [eventId, studentId]
        );

        if (overlapCheck && overlapCheck.length > 0) {
            const conflict = overlapCheck[0];
            return res.status(400).json({
                success: false,
                isOverlap: true,
                message: `Schedule Overlap: You are already registered for "${conflict.Event_Name}" at this exact date and time.`
            });
        }

        // 5. FCFS Slot Check & Waitlist Fallback
        if (targetEvent.Event_Registered >= targetEvent.Event_Slots) {
            await db.query(
                `INSERT INTO event_waitlist (Student_ID, Student_FullName, Event_ID) VALUES (?, ?, ?)`,
                [studentId, studentName, eventId]
            );

            return res.json({
                success: true,
                isWaitlisted: true,
                message: 'Event slots are full. You have been added to the waitlist queue!'
            });
        }

        // 6. Complete Registration
        await db.query(
            `INSERT INTO volunteer_registrations 
            (Student_ID, Student_FullName, Event_ID, Event_Name, Organizer_ID, Event_Date, Attendance_Status) 
            VALUES (?, ?, ?, ?, ?, targetEvent.Event_Date, 'pending')`, 
            [studentId, studentName, eventId, targetEvent.Event_Name, targetEvent.Organizer_ID]
        );

        await db.query(
            `UPDATE events SET Event_Registered = Event_Registered + 1 WHERE Event_ID = ?`, 
            [eventId]
        );

        res.json({ success: true, message: 'Successfully registered for the event!' });

    } catch (err) {
        console.error('CRITICAL ERROR in POST /api/student/join-event:', err);
        res.status(500).json({ success: false, message: 'Server error joining event: ' + err.message });
    }
});

// Student's Active Waitlisted Events
app.get('/api/student/my-waitlist', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const [rows] = await db.query(
            `SELECT w.*, e.Event_Name, e.Event_Date, e.Event_Time, e.Event_Location,
                    (SELECT COUNT(*) + 1 FROM event_waitlist w2 WHERE w2.Event_ID = w.Event_ID AND w2.Created_At < w.Created_At) AS queue_position
             FROM event_waitlist w
             JOIN events e ON w.Event_ID = e.Event_ID
             WHERE w.Student_ID = ?
             ORDER BY w.Created_At DESC`,
            [studentId]
        );
        res.json({ success: true, waitlist: rows });
    } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch waitlist' }); }
});

// Student Leave Waitlist
app.delete('/api/student/leave-waitlist/:eventId', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const eventId = req.params.eventId;
        await db.query('DELETE FROM event_waitlist WHERE Student_ID = ? AND Event_ID = ?', [studentId, eventId]);
        res.json({ success: true, message: 'Successfully removed from waitlist.' });
    } catch (error) { res.status(500).json({ success: false, message: 'Failed to leave waitlist.' }); }
});

app.get('/api/student/my-calendar-events', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT e.Event_Name as title, e.Event_Date as start, e.Event_Time, e.Event_Location as description
            FROM volunteer_registrations v JOIN events e ON v.Event_ID = e.Event_ID
            WHERE v.Student_ID = ?`, [req.user.id]
        );
        const formattedEvents = rows.map(event => ({
            title: event.title,
            start: `${event.start.toISOString().split('T')[0]}T${event.Event_Time || '00:00:00'}`,
            extendedProps: { location: event.description },
            backgroundColor: '#667eea', 
            borderColor: '#764ba2'
        }));
        res.json({ success: true, events: formattedEvents });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/student/activity-summary', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const [history] = await db.query(`
            SELECT v.*, c.certificate_code 
            FROM volunteer_registrations v LEFT JOIN certificates c ON v.Volunteer_ID = c.Volunteer_ID
            WHERE v.Student_ID = ? ORDER BY v.Event_Date DESC`, [studentId]
        );
        res.json({ 
            success: true, history, 
            stats: { totalJoined: history.length, totalPresent: history.filter(h => h.Attendance_Status === 'present').length } 
        });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ==============================================================
//                         ADMIN ROUTES
// ==============================================================
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Access denied: Admin credentials required' });
}

app.get('/api/admin/analytics', verifyToken, async (req, res) => {
    try {
        const [students] = await db.query('SELECT COUNT(*) AS totalStudents FROM students');
        const [events] = await db.query('SELECT COUNT(*) AS totalEvents FROM events');
        const [organizers] = await db.query('SELECT COUNT(*) AS totalOrganizers FROM organizers');
        const [issues] = await db.query('SELECT COUNT(*) AS totalIssues FROM issue_reports');

        res.json({
            success: true,
            analytics: {
                totalStudents: Number(students[0]?.totalStudents) || 0,
                totalEvents: Number(events[0]?.totalEvents) || 0,
                totalOrganizers: Number(organizers[0]?.totalOrganizers) || 0,
                totalIssues: Number(issues[0]?.totalIssues) || 0
            }
        });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/profile', verifyToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT Admin_ID, Admin_FullName, Admin_Email FROM admins WHERE Admin_ID = ?', [req.user.id]);
        res.json({ success: true, profile: rows[0] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/pending-users', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT Student_ID, Student_FullName, Student_Email, Student_ContactNumber, 'Student' AS User_Role FROM students WHERE is_approved = 0
            UNION ALL
            SELECT Organizer_ID, Organizer_Name, Organizer_Email, Organizer_ContactNumber, 'Organizer' AS User_Role FROM organizers WHERE is_approved = 0
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, pendingUsers: rows });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/approve-user', verifyToken, async (req, res) => {
    const { userId, userRole, studentId, organizerId, role: bodyRole } = req.body;
    const idToApprove = userId || studentId || organizerId;
    const role = (userRole || bodyRole || '').trim().toLowerCase();

    try {
        if (role === 'organizer' || organizerId) {
            await db.query('UPDATE organizers SET is_approved = 1 WHERE Organizer_ID = ?', [idToApprove]);
        } else {
            await db.query('UPDATE students SET is_approved = 1 WHERE Student_ID = ?', [idToApprove]);
        }
        res.json({ success: true, message: 'Registration approved successfully!' });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/reject-user', verifyToken, requireAdmin, async (req, res) => {
    const { userId, userRole, studentId, organizerId, role: bodyRole } = req.body;
    const idToReject = userId || studentId || organizerId;
    const role = (userRole || bodyRole || '').trim().toLowerCase();

    try {
        if (role === 'organizer' || organizerId) {
            await db.query('DELETE FROM organizers WHERE Organizer_ID = ? AND is_approved = 0', [idToReject]);
        } else {
            await db.query('DELETE FROM students WHERE Student_ID = ? AND is_approved = 0', [idToReject]);
        }
        res.json({ success: true, message: 'User registration rejected.' });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/issues', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ir.*, s.Student_FullName, o.Organizer_Name 
            FROM issue_reports ir
            LEFT JOIN students s ON ir.Student_ID = s.Student_ID
            LEFT JOIN organizers o ON ir.Organizer_ID = o.Organizer_ID
            ORDER BY ir.IssueReport_ID DESC`
        );
        res.json({ success: true, issues: rows });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.put('/api/admin/resolve-issue/:reportId', verifyToken, requireAdmin, async (req, res) => {
    try {
        await db.query('UPDATE issue_reports SET status = "resolved", Admin_ID = ?, response = "Resolved by Admin" WHERE IssueReport_ID = ?', [req.user.id, req.params.reportId]);
        res.json({ success: true, message: 'Issue resolved.' });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/change-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    let table = role === 'student' ? 'students' : role === 'organizer' ? 'organizers' : 'admins';
    let idCol = role === 'student' ? 'Student_ID' : role === 'organizer' ? 'Organizer_ID' : 'Admin_ID';
    let passCol = role === 'student' ? 'Student_Password' : role === 'organizer' ? 'Organizer_Password' : 'Admin_Password';

    try {
        const [rows] = await db.query(`SELECT ${passCol} FROM ${table} WHERE ${idCol} = ?`, [userId]);
        if (rows.length === 0 || rows[0][passCol] !== currentPassword) {
            return res.status(400).json({ success: false, message: 'Incorrect current password.' });
        }
        await db.query(`UPDATE ${table} SET ${passCol} = ? WHERE ${idCol} = ?`, [newPassword, userId]);
        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (error) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});