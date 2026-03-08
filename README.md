# Guidance Management System

A comprehensive web-based solution for schools to manage guidance counseling services, appointments, and resources.

## Features

- **User Authentication**: Secure login and registration system with role-based access control (Student, Counselor, Admin)
- **Appointment Management**: Schedule, track, and manage counseling appointments
- **Resource Repository**: Upload and access counseling resources and materials
- **User Profiles**: Manage personal information and settings
- **Administrative Tools**: User management, system monitoring, and reporting

## User Roles

### Student
- Schedule appointments with counselors
- View and manage their own appointments
- Access counseling resources
- Update personal profile information

### Counselor
- Manage student appointments (confirm, cancel, reschedule)
- Upload and manage counseling resources
- View appointment history and student information
- Generate reports on counseling activities

### Admin
- Manage all users (add, edit, delete, change roles)
- Oversee all appointments and resources
- System configuration and settings
- Access usage statistics and reports

## Technical Details

### Frontend
- HTML5, CSS3, and vanilla JavaScript
- Responsive design for desktop and mobile devices
- Modern UI with intuitive navigation

### Backend
- Firebase Authentication for user management
- Firebase Firestore for database
- Firebase Storage for file uploads
- Firebase Hosting for deployment

## Setup Instructions

1. **Prerequisites**
   - A Firebase account (free tier is sufficient to start)
   - A modern web browser

2. **Firebase Setup**
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Enable Storage

3. **Configuration**
   - Update the Firebase configuration in `js/config.js` with your project details:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

4. **Deployment**
   - Deploy to Firebase Hosting or any static web hosting
   - For local development, use any local server solution like Live Server in VS Code

## First-Time Setup

1. **Admin Account**
   - Register a new user
   - Access the Firebase console
   - Go to Firestore Database
   - Find the user document in the 'users' collection
   - Manually update the 'role' field to 'admin'

2. **System Configuration**
   - Log in as admin
   - Add counselors to the system
   - Configure any system settings

## Security Notes

- Role-based permissions prevent unauthorized access
- Critical operations require re-authentication
- Appointments and resources are securely managed with proper validation

## Privacy Considerations

- Student information is protected and only accessible to authorized users
- Appointment details are confidential between students and counselors
- Implement data retention policies according to educational regulations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Modern UI inspired by best practices in educational software
- Icons from Font Awesome
- Avatar services from UI Avatars 