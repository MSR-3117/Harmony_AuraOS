// Firebase Client Configuration
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, serverTimestamp } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyForDevelopment",
    authDomain: "harmonyauraos.firebaseapp.com",
    databaseURL: "https://harmonyauraos-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "harmonyauraos",
    storageBucket: "harmonyauraos.appspot.com",
    messagingSenderId: "114388793311850757563",
    appId: "1:114388793311850757563:web:dummy"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, onValue, push, set, serverTimestamp };
