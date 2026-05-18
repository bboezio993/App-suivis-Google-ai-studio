import { writeBatch, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { NormalizedMetric, GarminActivity, GarminImportLog, UserProfile } from '../types';

export const syncMetricsToFirestore = async (metrics: NormalizedMetric[]) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  
  // Chunk into arrays of 500 for Firestore batches
  const chunkSize = 500;
  for (let i = 0; i < metrics.length; i += chunkSize) {
    const chunk = metrics.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    
    chunk.forEach(metric => {
      const cleanMetric = Object.fromEntries(Object.entries(metric).filter(([_, v]) => v !== undefined));
      const metricWithUid = { ...cleanMetric, uid };
      const ref = doc(db, 'metrics', metric.id);
      batch.set(ref, metricWithUid, { merge: true });
    });
    
    try {
      await batch.commit();
    } catch (e) {
       handleFirestoreError(e, OperationType.WRITE, 'metrics');
    }
  }
};

export const syncActivitiesToFirestore = async (activities: GarminActivity[]) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  
  const chunkSize = 500;
  for (let i = 0; i < activities.length; i += chunkSize) {
    const chunk = activities.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    
    chunk.forEach(activity => {
      const cleanActivity = Object.fromEntries(Object.entries(activity).filter(([_, v]) => v !== undefined));
      const activityWithUid = { ...cleanActivity, uid };
      const ref = doc(db, 'activities', activity.id);
      batch.set(ref, activityWithUid, { merge: true });
    });
    
    try {
      await batch.commit();
    } catch (e) {
       handleFirestoreError(e, OperationType.WRITE, 'activities');
    }
  }
};

export const syncLogToFirestore = async (log: GarminImportLog) => {
  if (!auth.currentUser) return;
  try {
    const cleanLog = Object.fromEntries(Object.entries(log).filter(([_, v]) => v !== undefined));
    const ref = doc(db, 'importLogs', log.id);
    await setDoc(ref, { ...cleanLog, uid: auth.currentUser.uid }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `importLogs/${log.id}`);
  }
};

import { setDoc } from 'firebase/firestore';
export const syncProfileToFirestore = async (profile: UserProfile) => {
  if (!auth.currentUser) return;
  try {
    const cleanProfile = Object.fromEntries(Object.entries(profile).filter(([_, v]) => v !== undefined));
    const ref = doc(db, 'profiles', auth.currentUser.uid);
    await setDoc(ref, { ...cleanProfile, uid: auth.currentUser.uid }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `profiles/${auth.currentUser.uid}`);
  }
};
