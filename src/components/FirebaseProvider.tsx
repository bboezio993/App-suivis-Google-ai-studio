import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDocFromServer, onSnapshot, collection, query, limit, setDoc, getDocs, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, signInWithGoogle, logout } from '../firebase';
import { useStore } from '../store/useStore';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineError, setOfflineError] = useState(false);
  const { 
    addMetrics, 
    addGarminActivities, 
    updateUserProfile,
    addGarminImportLog
  } = useStore();

  useEffect(() => {
    // Connection test as required
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          setOfflineError(true);
        }
      }
    }
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      if (firebaseUser) {
        // Sync user profile
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        const unsubProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            updateUserProfile(snap.data() as any);
          } else {
            // Check if we have local, if not ignore. Write is handled explicitly.
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, `profiles/${firebaseUser.uid}`));

        // Sync Metrics (LIMIT 5000 for safety, though index is better)
        const metricsRef = collection(db, 'metrics');
        const unsubMetrics = onSnapshot(query(metricsRef, where('uid', '==', firebaseUser.uid), limit(5000)), (snap) => {
          const loadedMetrics = snap.docs.map(d => d.data() as any);
          if (loadedMetrics.length > 0) {
            addMetrics(loadedMetrics);
          }
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'metrics'));

        // Sync Activities
        const activitiesRef = collection(db, 'activities');
        const unsubActivities = onSnapshot(query(activitiesRef, where('uid', '==', firebaseUser.uid), limit(1000)), (snap) => {
          const loadedActs = snap.docs.map(d => d.data() as any);
          if (loadedActs.length > 0) {
            addGarminActivities(loadedActs);
          }
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'activities'));

        // Sync Import Logs
        const logsRef = collection(db, 'importLogs');
        const unsubLogs = onSnapshot(query(logsRef, where('uid', '==', firebaseUser.uid), limit(100)), (snap) => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added' || change.type === 'modified') {
               try {
                 // addGarminImportLog might need an atomic structure, we'll let zustand handle merging
                 // We will skip real-time full sync of logs to avoid complex merging right now, 
                 // or we can sync it inside a refactored useStore function.
               } catch (e) {}
            }
          });
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'importLogs'));

        return () => {
          unsubProfile();
          unsubMetrics();
          unsubActivities();
          unsubLogs();
        };
      }
    });

    return () => unsubscribeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="h-screen w-screen flex flex-col items-center justify-center p-4">
      <Loader2 className="animate-spin mb-4" />
      <p>Chargement de l'espace membre...</p>
    </div>;
  }

  if (offlineError) {
    return <div className="h-screen w-screen flex flex-col items-center justify-center p-4">
       <h1 className="text-xl font-bold text-red-500 mb-2">Erreur de Connexion</h1>
       <p className="text-muted-foreground">La configuration Firebase est hors ligne ou incorrecte.</p>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut: logout }}>
      {user ? children : (
        <div className="h-screen w-screen flex flex-col items-center justify-center p-4 space-y-4">
          <div className="text-center max-w-sm">
            <h1 className="text-2xl font-bold mb-2">AURA ELITE</h1>
            <p className="text-muted-foreground mb-8">Connectez-vous pour sécuriser et sauvegarder l'historique complet de votre santé sur le Cloud.</p>
            <Button onClick={signIn} size="lg" className="w-full flex items-center justify-center gap-2">
              <LogIn size={20} />
              Continuer avec Google
            </Button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
