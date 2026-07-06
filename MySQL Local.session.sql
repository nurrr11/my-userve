SELECT * FROM deepseek_db.users;

INSERT INTO users (name, email, password, role, is_approved) VALUES
('Admin User', 'adminmaya@gmail.com', 'adminMaya', 'admin', TRUE);
INSERT INTO gratuity (
    Gratuity_ID,
    Event_ID,
    Volunteer_ID,
    Student_ID,
    Gratuity_Date,
    Gratuity_Method,
    Gratuity_Amount,
    Gratuity_Status
  )
VALUES (
    Gratuity_ID:int,
    Event_ID:int,
    Volunteer_ID:int,
    'Student_ID:varchar',
    'Gratuity_Date:date',
    'Gratuity_Method:enum',
    'Gratuity_Amount:decimal',
    'Gratuity_Status:enum'
  );