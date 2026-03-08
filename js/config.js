// Firebase configuration


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Timestamp
const timestamp = firebase.firestore.FieldValue.serverTimestamp; 
