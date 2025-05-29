import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBsB1j1Cc829uJwq9R8qpZ5kMNS3C2qp3w",
  authDomain: "wechat-9694d.firebaseapp.com",
  databaseURL: "https://wechat-9694d-default-rtdb.firebaseio.com",
  projectId: "wechat-9694d",
  storageBucket: "wechat-9694d.appspot.com",
  messagingSenderId: "679037804410",
  appId: "1:679037804410:web:776f0cab1de4b5e8cec0c3",
  measurementId: "G-Z9LDZNHG9C"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
