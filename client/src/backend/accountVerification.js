import { db } from "./config/firebase";
import { getDoc, doc, updateDoc, increment, TimeStamp, collection } from 'firebase/firestore';

async function validateToken(email, token) {
  const docRef = doc(db, "validation", email);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const attempts = docSnap.data().attempts;
    const realToken = docSnap.data().token;
    const expireTime = docSnap.data().expire;
    const currentTime = TimeStamp.now();

    if ((currentTime.toDate() > expireTime.toDate()) || (attempts > 3)) {
      try {
        await deleteDoc(docRef);
        // TODO add page redirect
      } catch (e) {
        console.error(e);
      } 
    }

    if (token != realToken) {
      try {
        await updateDoc(docRef, {
          attempts: increment(1)
        });
      } catch (e) {
        console.error("Error updating document: " , e);
      }
      // TODO add page redirect
      return false;
    } else {
      try {
        // Make a new entry to the user collection delete the validation doc
        const userDB = collection(db, "users");
        await setDoc(doc(userDB, email), {
          email: email,
          fname: John,
          lname: Doe,
          role: User
        });

        await deleteDoc(docRef);
      } catch (e) {
        console.error("Error: " , e);
      }
      // TODO add page redirect
      return true;
    }
  } else {
    return false;
  }
}

validateToken(email, token);