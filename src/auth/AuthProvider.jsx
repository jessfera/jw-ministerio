import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // IMPORTANT: this must stay true while we are fetching users/{uid}
  // so the UI doesn't briefly show "Usuário sem perfil".
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // Start a new loading cycle for BOTH auth change + profile fetch
      setLoading(true);

      setUser(u);
      setProfile(null);

      if (!u) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } catch (err) {
        // If Firestore fails (offline/permission), keep profile as null
        // but stop loading so the UI can show an error if you want.
        console.error("Erro ao carregar perfil users/{uid}:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, profile, loading, logout: () => signOut(auth) }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
