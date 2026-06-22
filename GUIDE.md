📖 Attendance Tracker User Guide

Version: 1.1.0

---

Introduction

Attendance Tracker is a secure and lightweight attendance management system designed for:

- Class Representatives (CRs)
- Teachers
- Educational Institutions

The system allows users to manage students, record attendance, generate reports, and maintain backups efficiently.

---

Getting Started

Accessing the System

Open the application in your browser.

You will be presented with the Login Screen.

Enter the Access Code provided by the administrator.

After successful authentication, the Dashboard will be displayed.

---

Dashboard

The Dashboard provides a quick overview of the attendance system.

Available Information

- Total Students
- Average Attendance Percentage
- Excellent Students Count
- Warning Students Count

Quick Navigation

The Dashboard provides shortcuts to:

- Students
- Attendance
- Reports
- Settings

---

Student Management

Navigate to:

Students

Add Student

Click:

Add Student

Enter:

- Student Name
- PIN Number

Click:

Save

Rules

- Student names cannot be empty.
- PIN numbers must be unique.
- Duplicate PINs are not allowed.

---

Edit Student

Select a student.

Click:

Edit

Update the information.

Click:

Save Changes

---

Delete Student

Select a student.

Click:

Delete

Confirm the action.

Warning:

Deleting a student removes all associated attendance records.

---

Attendance Management

Navigate to:

Attendance

---

Select Student

Choose the student from the dropdown list.

---

Select Month

Choose the desired month.

Example:

- January
- February
- March

etc.

---

Enter Attendance

Attendance is divided into two phases.

Phase 1

Days 1–15

Enter:

- Working Days
- Attended Days

---

Phase 2

Days 16–31

Enter:

- Working Days
- Attended Days

---

Save Attendance

Click:

Save Attendance

The system will automatically:

- Validate input
- Calculate percentages
- Store attendance records

---

Attendance Calculation

Phase Percentage

Formula:

Attended Days ÷ Working Days × 100

---

Monthly Percentage

Formula:

Total Attended Days ÷ Total Working Days × 100

---

Overall Percentage

Formula:

Total Attended Days Across All Months ÷ Total Working Days Across All Months × 100

---

Attendance Status

The system automatically classifies attendance.

Percentage| Status
90% and Above| Excellent
75% – 89.99%| Safe
Below 75%| Warning

---

Reports

Navigate to:

Reports

---

Available Features

Search

Search students by:

- Name
- PIN Number

---

Filter

Available filters:

- All
- Excellent
- Safe
- Warning
- No Data

---

Sort

Sort by:

- Name
- PIN
- Attendance Percentage

Ascending and descending sorting are supported.

---

Student Profile

Navigate to:

Reports → Select Student

The profile page displays:

- Student Name
- PIN Number
- Overall Attendance Percentage
- Monthly Attendance History
- Attendance Status

---

Backup & Restore

Navigate to:

Settings

---

Export Data

Click:

Export Data

The system creates a backup file containing:

- Students
- Attendance Records
- Statistics
- Settings

Store this file in a safe location.

---

Import Data

Click:

Import Data

Select a previously exported backup file.

Confirm the import operation.

The system will restore all saved data.

---

Security

Navigate to:

Settings → Security

---

Change Password

Enter:

- Current Password
- New Password

Click:

Update Password

---

Session Information

View:

- Current Login Session
- Session Status

---

Sign Out

Click:

Sign Out

The current session will be terminated and the Login Screen will be displayed.

---

Data Storage

Attendance Tracker stores all information locally using browser LocalStorage.

Benefits:

- Fast Performance
- Offline Usage
- No External Server Required

Important:

If browser data is cleared, attendance records may be lost.

Always create backups regularly.

---

Progressive Web App (PWA)

Attendance Tracker supports installation as a Progressive Web App.

Benefits:

- Home Screen Shortcut
- Full Screen Experience
- Faster Launch
- App-Like Usage

---

Troubleshooting

Login Not Working

- Verify the correct Access Code.
- Clear browser cache if required.

---

Data Missing

- Check if browser storage has been cleared.
- Restore using a backup file.

---

Backup Not Importing

- Verify the selected file is a valid Attendance Tracker backup.
- Ensure the file is not corrupted.

---

Best Practices

To ensure data safety:

- Export backups regularly.
- Keep backup files in multiple locations.
- Use strong passwords.
- Sign out when using shared devices.

---

About

Attendance Tracker

Version 1.1.0

Developed by Shyam

Designed for efficient attendance management in educational environments.
