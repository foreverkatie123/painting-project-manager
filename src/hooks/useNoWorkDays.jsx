// src/hooks/useNoWorkDays.js
import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useNoWorkDays = () => {
  const [noWorkDays, setNoWorkDays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'no_work_days'), orderBy('date'));
    const unsub = onSnapshot(q, (snap) => {
      setNoWorkDays(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { noWorkDays, loading };
};

export const addNoWorkDay = async (date, reason = 'No Work') => {
  await addDoc(collection(db, 'no_work_days'), {
    date,
    reason,
    createdAt: serverTimestamp(),
  });
};

export const deleteNoWorkDay = async (id) => {
  await deleteDoc(doc(db, 'no_work_days', id));
};

export const isNoWorkDay = (dateStr, noWorkDays) => {
  return noWorkDays.some(nwd => nwd.date === dateStr);
};

export const getNoWorkDayReason = (dateStr, noWorkDays) => {
  const noWorkDay = noWorkDays.find(nwd => nwd.date === dateStr);
  return noWorkDay ? noWorkDay.reason : null;
};