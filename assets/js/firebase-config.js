// Firebase configuration
// TODO: Replace with your own Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyBiIUWIus8ao45edrWZEt8MEghyVdGMu5g",
    authDomain: "guidance-4387c.firebaseapp.com",
    projectId: "guidance-4387c",
    storageBucket: "guidance-4387c.firebasestorage.app",
    messagingSenderId: "491147874431",
    appId: "1:491147874431:web:8a4bf876d7e919ce8b2f4a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence for Firestore
db.enablePersistence()
    .catch(err => {
        if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time
            console.log('Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            // The current browser does not support all of the features required for persistence
            console.log('Persistence is not available in this browser');
        }
    });

// Set Auth persistence to LOCAL to maintain login state between page reloads
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(error => {
        console.error('Error setting auth persistence:', error);
    }); 