
declare const firebase: any;

const firebaseConfig = {
  apiKey: "AIzaSyBAXuGI8jMYMwldtZtvU5clGi-uCTGX2L8",
  authDomain: "kade-6f3dc.firebaseapp.com",
  projectId: "kade-6f3dc",
  storageBucket: "kade-6f3dc.firebasestorage.app",
  messagingSenderId: "972788062869",
  appId: "1:972788062869:web:4e0ae704b559d650d2999c",
  measurementId: "G-8PTX3P4ZT9"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
// Get a reference to the database service
export const db = firebase.database();
export const auth = firebase.auth();
// FIX: Export the firebase storage service.
export const storage = firebase.storage();

// Assign the global firebase object to a module-scoped constant to allow it to be exported.
const firebaseInstance = firebase;
export { firebaseInstance as firebase };