-- Reset tables
DROP TABLE IF EXISTS issue_reports;
DROP TABLE IF EXISTS gratuity;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS event_reports;
DROP TABLE IF EXISTS volunteer_registrations;
DROP TABLE IF EXISTS events_;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS organizers;
DROP TABLE IF EXISTS admins;

-- Recreate tables
CREATE TABLE students (
    Student_ID VARCHAR(20) PRIMARY KEY,
    Student_FullName VARCHAR(100) NOT NULL,
    Student_DOB DATE NOT NULL,
    Student_ContactNumber VARCHAR(15) NOT NULL,
    Student_Email VARCHAR(100) UNIQUE NOT NULL,
    Student_Password VARCHAR(255) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizers (
    Organizer_ID INT PRIMARY KEY AUTO_INCREMENT,
    Organizer_Name VARCHAR(100) NOT NULL,
    Organizer_DOE DATE NOT NULL,
    Organizer_City VARCHAR(100) NOT NULL,
    Organizer_ContactNumber VARCHAR(15) NOT NULL,
    Organizer_Email VARCHAR(100) UNIQUE NOT NULL,
    Organizer_Password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
    Admin_ID INT PRIMARY KEY AUTO_INCREMENT,
    Admin_FullName VARCHAR(100) NOT NULL,
    Admin_DOB DATE NOT NULL,
    Admin_ContactNumber VARCHAR(15) NOT NULL,
    Admin_Email VARCHAR(100) UNIQUE NOT NULL,
    Admin_Password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events_ (
    Event_ID INT PRIMARY KEY AUTO_INCREMENT,
    Organizer_ID INT NOT NULL,
    Organizer_Name VARCHAR(100) NOT NULL,
    Event_Name VARCHAR(200) NOT NULL,
    Event_Desc TEXT,
    Event_Date DATE NOT NULL,
    Event_Time TIME NOT NULL,
    Event_Location VARCHAR(200) NOT NULL,
    Event_Slots INT DEFAULT 50,
    Event_Registered INT DEFAULT 0,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Organizer_ID) REFERENCES organizers(Organizer_ID)
);

CREATE TABLE volunteer_registrations (
    Volunteer_ID INT PRIMARY KEY AUTO_INCREMENT,
    Student_ID VARCHAR(20) NOT NULL,
    Student_FullName VARCHAR(100) NOT NULL,
    Event_ID INT NOT NULL,
    Event_Name VARCHAR(200) NOT NULL,
    Organizer_ID INT NOT NULL,
    Event_Date DATE NOT NULL,
    Attendance_Status ENUM('pending', 'present', 'absent') DEFAULT 'pending',
    Gratuity_Status ENUM('pending', 'paid', 'not_eligible') DEFAULT 'pending',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Student_ID) REFERENCES students(Student_ID),
    FOREIGN KEY (Event_ID) REFERENCES events(Event_ID),
    FOREIGN KEY (Organizer_ID) REFERENCES organizers(Organizer_ID)
);

CREATE TABLE certificates (
    Certificate_ID INT PRIMARY KEY AUTO_INCREMENT,
    Volunteer_ID INT NOT NULL,
    Event_ID INT NOT NULL,
    Student_FullName VARCHAR(100) NOT NULL,
    Student_ID VARCHAR(20) NOT NULL,
    Event_Name VARCHAR(200) NOT NULL,
    Event_Date DATE NOT NULL,
    Event_Location VARCHAR(200) NOT NULL,
    Organizer_Name VARCHAR(100) NOT NULL,
    certificate_code VARCHAR(100) UNIQUE NOT NULL,
    issue_date DATE DEFAULT CURDATE(),
    FOREIGN KEY (Volunteer_ID) REFERENCES volunteer_registrations(Volunteer_ID),
    FOREIGN KEY (Event_ID) REFERENCES events(Event_ID)
);

CREATE TABLE gratuity (
    Gratuity_ID INT PRIMARY KEY AUTO_INCREMENT,
    Event_ID INT NOT NULL,
    Volunteer_ID INT NOT NULL,
    Student_ID VARCHAR(20) NOT NULL,
    Gratuity_Date DATE DEFAULT CURDATE(),
    Gratuity_Method ENUM('bank_transfer', 'e_wallet', 'cash') DEFAULT 'bank_transfer',
    Gratuity_Amount DECIMAL(10,2) NOT NULL,
    Gratuity_Status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    FOREIGN KEY (Event_ID) REFERENCES events(Event_ID),
    FOREIGN KEY (Volunteer_ID) REFERENCES volunteer_registrations(Volunteer_ID),
    FOREIGN KEY (Student_ID) REFERENCES students(Student_ID)
);

CREATE TABLE issue_reports (
    IssueReport_ID INT PRIMARY KEY AUTO_INCREMENT,
    Organizer_ID INT NOT NULL,
    Report_Details TEXT NOT NULL,
    Report_Date DATE NOT NULL,
    Report_Time TIME NOT NULL,
    Admin_ID INT,
    status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
    response TEXT,
    FOREIGN KEY (Organizer_ID) REFERENCES organizers(Organizer_ID),
    FOREIGN KEY (Admin_ID) REFERENCES admins(Admin_ID)
);

-- Insert sample data with PLAIN TEXT passwords
INSERT INTO admins (Admin_FullName, Admin_DOB, Admin_ContactNumber, Admin_Email, Admin_Password) 
VALUES ('System Administrator', '1990-01-01', '0123456789', 'admin@userve.com', 'Admin@123');

INSERT INTO organizers (Organizer_Name, Organizer_DOE, Organizer_City, Organizer_ContactNumber, Organizer_Email, Organizer_Password) 
VALUES ('Community Service Club', '2015-06-15', 'Shah Alam', '0198765432', 'organizer@userve.com', 'Org@2024');

INSERT INTO students (Student_ID, Student_FullName, Student_DOB, Student_ContactNumber, Student_Email, Student_Password, is_approved) 
VALUES ('2023123456', 'Ahmad Faiz Bin Abdullah', '2000-05-15', '01123456789', 'student@userve.com', 'Student@123', TRUE);

-- Sample Events
INSERT INTO events (Organizer_ID, Organizer_Name, Event_Name, Event_Desc, Event_Date, Event_Time, Event_Location, Event_Slots) 
VALUES 
(1, 'Community Service Club', 'Beach Cleanup Campaign', 'Help clean Pantai Morib beach', '2026-05-20', '08:00:00', 'Pantai Morib', 30),
(1, 'Community Service Club', 'Food Bank Distribution', 'Pack and distribute food', '2026-05-25', '09:00:00', 'Food Bank Malaysia', 25);

-- Sample Volunteer Registration
INSERT INTO volunteer_registrations (Student_ID, Student_FullName, Event_ID, Event_Name, Organizer_ID, Event_Date, Attendance_Status) 
VALUES ('2023123456', 'Ahmad Faiz Bin Abdullah', 1, 'Beach Cleanup Campaign', 1, '2026-05-20', 'present');