// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBiIUWIus8ao45edrWZEt8MEghyVdGMu5g",
    authDomain: "guidance-4387c.firebaseapp.com",
    projectId: "guidance-4387c",
    storageBucket: "guidance-4387c.appspot.com",
    messagingSenderId: "491147874431",
    appId: "1:491147874431:web:8a4bf876d7e919ce8b2f4a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Timestamp
const timestamp = firebase.firestore.FieldValue.serverTimestamp; 