import { getFirestore, collection, getDocs, setDoc, doc, DocumentData, Timestamp } from "firebase/firestore/lite";
import {
  ref,
  getStorage,
  uploadBytes,
  uploadString,
  uploadBytesResumable,
  StringFormat,
  getDownloadURL,
} from "firebase/storage";
import app from "../firebase/firebase";
import { base64Decode } from "@firebase/util";

const monthlyPremiumInUSD = 5;

export const getPremiumRequests = async () => {
  try {
    const db = getFirestore(app);
    const orders = await getDocs(collection(db, "premiumOrders")).then((data) => data.docs.map((doc) => doc.data()));
    return { code: 200, message: "ok", data: orders };
  } catch (error) {
    return { code: 500, message: error.message };
  }
};

export const modifyPremiumRequest = async (userId: string, status: string) => {
  try {
    const db = getFirestore(app);
    const orderDocs = await getDocs(collection(db, "premiumOrders")).then((data) => data.docs);
    const orderDoc = orderDocs.find((order) => order.data().userId === userId);
    await setDoc(
      orderDoc.ref,
      {
        status: status,
        userId: orderDoc.data().userId,
        refferedBy: orderDoc.data()?.refferedBy ?? "",
        date: Timestamp.now(),
      },
      { merge: true }
    );
    const userDocs = await getDocs(collection(db, "users")).then((data) => data.docs);
    const userDoc = userDocs.find((user) => user.data().id === userId);
    await setDoc(userDoc.ref, { isPRO: status }, { merge: true });
    return { code: 200, message: "ok", data: { status: status } };
  } catch (error) {
    return { code: 500, message: error.message };
  }
};

export const getBuyAndSell = async () => {
  try {
    const db = getFirestore(app);
    const buyAndSell = await getDocs(collection(db, "orders")).then((data) => data.docs);
    const data = await Promise.all(
      buyAndSell.map(async (doc) => {
        const commission = doc.data().usd_amount - doc.data().usdt_amount;
        const userDocs = await getDocs(collection(db, "users")).then((data) => data.docs.map((doc) => doc));
        const userData = userDocs.find((user) => user.data().id === doc.data().userId).data();

        return await new Promise((resolve) =>
          resolve(
            Object({
              ...doc.data(),
              // isProcessed: false,
              id: doc.id,
              commission: commission.toFixed(2),
              commission_percentage: ((commission / doc.data().usd_amount) * 100).toFixed(2),
              phone_no: userData.phone_no,
              first_name: userData.first_name,
              last_name: userData.last_name,
            })
          )
        );
      })
    );
    return { code: 200, message: "ok", data: data };
  } catch (error) {
    return { code: 500, message: error.message };
  }
};

export const updateBuyAndSell = async (slug: string, data: Object) => {
  try {
    const db = getFirestore(app);
    const docs = await getDocs(collection(db, "orders")).then((data) => data.docs);
    const doc = docs.find((doc) => doc.id === slug);
    console.log(doc.id);
    await setDoc(doc.ref, { ...doc.data(), ...data });
    return { code: 200, message: "ok", data: { status: "ok" } };
  } catch (error) {
    return { code: 500, message: error.message };
  }
};

export const uploadDocument = async (base64: string) => {
  const storage = getStorage(app);
  const docRef = ref(storage, "documents/" + Date.now().toString() + ".png");
  const uploadTask = uploadBytesResumable(docRef, Buffer.from(base64.split(";base64,")[1], "base64"), {
    contentType: "image/png",
  });
  return await new Promise((resolve) => {
    uploadTask.catch((error) => {
      resolve({ code: 500, message: error.message });
    });
    uploadTask.on("state_changed", async (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      if (progress === 100) {
        resolve({ code: 200, message: "ok", data: { url: await getDownloadURL(docRef) } });
      }
    });
  });
};

type FileData = {
  name: string;
  type: string;
  file: Uint8Array;
};

export const uploadPremContent = async (file: FileData) => {
  const storage = getStorage(app);
  const docRef = ref(storage, "premium/" + file.name);
  const uploadTask = uploadBytesResumable(
    docRef,
    new Blob([new Uint8Array(file.file, file.file.length)], { type: file.type }),
    {
      contentType: file.type,
    }
  );
  return await new Promise((resolve) => {
    uploadTask.catch((error) => {
      resolve({ code: 500, message: error.message });
    });
    uploadTask.on("state_changed", async (snapshot) => {
      console.log(snapshot);
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log(progress);
      if (progress === 100) {
        resolve({ code: 200, message: "ok", data: { url: await getDownloadURL(docRef), type: file.type } });
      }
    });
  });
};

export const getReports = async (startDate: string, endDate: string) => {
  const startTimeStamp = new Date(parseInt(startDate)).getTime() / 1000;
  const endTimeStamp = new Date(parseInt(endDate)).getTime() / 1000;
  try {
    const db = getFirestore(app);
    const buyAndSell = await getDocs(collection(db, "orders")).then((data) =>
      data.docs.filter(
        (doc) =>
          doc.data()?.isProcessed &&
          doc.data().date.seconds >= startTimeStamp &&
          doc.data().date.seconds <= endTimeStamp
      )
    );
    const buyAmount = buyAndSell
      .filter((doc) => doc.data().type.toLowerCase() === "buy")
      .reduce((acc, doc) => acc + parseFloat(doc.data().usd_amount), 0);
    const sellAmount = buyAndSell
      .filter((doc) => doc.data().type.toLowerCase() === "sell")
      .reduce((acc, doc) => acc + parseFloat(doc.data().usd_amount), 0);
    const commission = buyAndSell.reduce((acc, doc) => acc + doc.data().usd_amount - doc.data().usdt_amount, 0);
    const premiumSubScription = await getDocs(collection(db, "premiumOrders")).then((data) =>
      data.docs.filter(
        (doc) =>
          doc.data().date.seconds >= startTimeStamp && doc.data().date.seconds <= endTimeStamp && doc.data().status
      )
    );
    const totalRevenue =
      commission +
      premiumSubScription
        .map((doc) => doc.data())
        .reduce(
          (acc, doc) =>
            acc + ((Timestamp.now().seconds - (doc.date.seconds as number)) / 2629746) * monthlyPremiumInUSD,
          0
        );
    return {
      code: 200,
      message: "ok",
      data: {
        buyAmount: buyAmount,
        sellAmount: sellAmount,
        commission: commission,
        premium_subscription: premiumSubScription.length,
        total_revenue: totalRevenue,
      },
    };
  } catch (error) {
    return { code: 500, message: error.message };
  }
};

export const getStatistics = async () => {
  try {
    const db = getFirestore(app);
    const users = await getDocs(collection(db, "users")).then((data) => data.docs);
    const totalPremiumUsers = users.filter((doc) => doc.data().isPRO);
    const totalNeverPremiumUsers = users.filter((doc) => !doc.data().expiryDate);
    const totalFormerPremiumUsers = users.filter((doc) => doc.data()?.expiryDate?.seconds <= Timestamp.now().seconds);

    return {
      code: 200,
      message: "ok",
      data: {
        total_users: users.length,
        total_users_timestamps: users.map((doc) => doc.data().createdAt.seconds),
        total_premium_users: totalPremiumUsers.length,
        total_premium_users_timestamps: totalPremiumUsers.map((doc) => doc.data().proStartedAt.seconds),
        total_never_premium_users: totalNeverPremiumUsers.length,
        total_never_premium_users_timestamps: totalNeverPremiumUsers.map((doc) => doc.data().createdAt.seconds),
        total_former_premium_users: totalFormerPremiumUsers.length,
        total_former_premium_users_timestamps: totalFormerPremiumUsers.map((doc) => doc.data().createdAt.seconds),
      },
    };
  } catch (error) {
    return { code: 500, message: error.message };
  }
};
