import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import app from "../firebase/firebase";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getUsers } from "./user";

export const getUser = async (req) => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  const { authorization } = req.headers;
  console.log(authorization);
  if (!authorization) {
    return {
      code: 66666,
      message: "No authorization header found",
      data: null,
    };
  }
  const db = getFirestore(app);
  const userData = await getDocs(collection(db, "users"))
    .then((data) => data.docs.map((doc) => doc.data()))
    .then((data) => data.find((usr) => usr.uuid === user.uid));
  return {
    code: 200,
    message: "ok",
    data: { userId: user.email, userName: user.email, userRole: userData.role },
  };
};

export const createAccount = async (email: string, password: string) => {
  const auth = getAuth();
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in
      const user = userCredential.user;
      // ...
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      // ..
    });
};

export const login = async (email: string, password: string) => {
  const auth = getAuth();
  console.log(email);
  return await signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      return {
        code: 200,
        message: "ok",
        data: { token: await userCredential.user.getIdToken(), refreshToken: userCredential.user.refreshToken },
      };
    })
    .catch((error) => {
      return { errCode: error.code };
    });
};

export const logout = async () => {
  const auth = getAuth();
  auth.signOut();
};

export const updateToken = async (updateToken: string) => {
  const users = await getUsers();
  const findItem = users.docs.map((doc) => doc.data()).find((usr) => usr.refreshToken === updateToken);

  if (findItem) {
    return {
      code: 200,
      message: "ok",
      data: {
        token: findItem.token,
        refreshToken: findItem.refreshToken,
      },
    };
  }
  return {
    code: 3000,
    message: "Failed to update token",
    data: null,
  };
};
