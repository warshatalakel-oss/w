import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCB52G4sn5iPFEhY2nd2h83VslGYgmqzkc",
  authDomain: "kadm-a5489.firebaseapp.com",
  projectId: "kadm-a5489",
  storageBucket: "kadm-a5489.firebasestorage.app",
  messagingSenderId: "403912053525",
  appId: "1:403912053525:web:e87f4bf1f4c3fe22d04f1c",
  measurementId: "G-VW4MST0FTE"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
// Get a reference to the database service
export const db = firebase.database();
export const auth = firebase.auth();
export const storage = firebase.storage();

// Assign the global firebase object to a module-scoped constant to allow it to be exported.
const firebaseInstance = firebase;
export { firebaseInstance as firebase };