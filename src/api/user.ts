import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import app from "../firebase/firebase";

export const getUsers = async () => {
  const db = getFirestore(app);
  const users = await getDocs(collection(db, "users"));
  return users;
};

export const getCkrdUsers = async () => {
  const db = getFirestore(app);
  const users = await getDocs(collection(db, "users")).then((data) => data.docs.map((doc) => doc.data()));
  return { code: 200, message: "ok", data: users };
};
