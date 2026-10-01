import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { authReady, db } from "./firebase";

const foldersRef = collection(db, "folders");
const cardsRef = collection(db, "flashcards");

const toDate = (value) => (value?.toDate ? value.toDate() : value);

const mapDoc = (snapshot) => {
  const data = snapshot.data();
  return {
    _id: snapshot.id,
    ...data,
    createdAt: toDate(data.createdAt)?.toISOString?.() ?? data.createdAt,
    nextReview: toDate(data.nextReview)?.toISOString?.() ?? data.nextReview,
  };
};

export async function listFolders() {
  await authReady;
  const snapshot = await getDocs(foldersRef);
  return snapshot.docs
    .map(mapDoc)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function createFolder(name) {
  await authReady;
  const createdAt = new Date();
  const ref = await addDoc(foldersRef, { name: name.trim(), createdAt });
  return { _id: ref.id, name: name.trim(), createdAt: createdAt.toISOString() };
}

export async function removeFolder(folderId) {
  await authReady;
  const cards = await getDocs(query(cardsRef, where("folderId", "==", folderId)));
  await Promise.all(cards.docs.map((card) => deleteDoc(card.ref)));
  await deleteDoc(doc(db, "folders", folderId));
}

export async function listCards(folderId) {
  await authReady;
  const snapshot = await getDocs(query(cardsRef, where("folderId", "==", folderId)));
  return snapshot.docs
    .map(mapDoc)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createCard(card) {
  await authReady;
  const createdAt = new Date();
  const data = {
    word: card.word,
    pronunciation: card.pronunciation,
    meaning: card.meaning,
    synonyms: card.synonyms,
    examples: card.examples || [],
    folderId: card.folderId,
    ease: 2.5,
    interval: 1,
    repetitions: 0,
    createdAt,
    nextReview: createdAt,
  };
  const ref = await addDoc(cardsRef, data);
  return { _id: ref.id, ...data, createdAt: createdAt.toISOString(), nextReview: createdAt.toISOString() };
}

export async function updateCard(cardId, values) {
  await authReady;
  await updateDoc(doc(db, "flashcards", cardId), {
    word: values.word,
    pronunciation: values.pronunciation,
    meaning: values.meaning,
    synonyms: values.synonyms,
    examples: values.examples || [],
  });
}

export async function removeCard(cardId) {
  await authReady;
  await deleteDoc(doc(db, "flashcards", cardId));
}

export async function reviewCard(cardId, rating, card) {
  await authReady;
  let ease = card.ease ?? 2.5;
  let interval = card.interval ?? 1;
  let repetitions = card.repetitions ?? 0;

  if (rating === "again") {
    repetitions = 0;
    interval = 1;
  } else if (rating === "hard") {
    interval = Math.max(1, Math.round(interval * 1.2));
  } else if (rating === "good") {
    repetitions += 1;
    interval = Math.round(interval * ease);
  } else if (rating === "easy") {
    repetitions += 1;
    ease = Math.min(ease + 0.15, 3.5);
    interval = Math.round(interval * ease * 1.3);
  }

  const nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
  await updateDoc(doc(db, "flashcards", cardId), {
    ease,
    interval,
    repetitions,
    nextReview,
  });
}
