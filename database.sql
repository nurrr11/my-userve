-- Recreate tables
-- semua dah, ada di sql file 8

-- any new student you register through the form won't be able to log in until you manually go into your MySQL database and run:
UPDATE students SET is_approved = TRUE WHERE Student_ID = 'YOUR_TEST_ID';

-- Sample Volunteer Registration
INSERT INTO volunteer_registrations (Student_ID, Student_FullName, Event_ID, Event_Name, Organizer_ID, Event_Date, Attendance_Status) 
VALUES ('2023123456', 'Ahmad Faiz Bin Abdullah', 1, 'Beach Cleanup Campaign', 1, '2026-05-20', 'present');