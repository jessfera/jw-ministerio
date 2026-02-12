import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const { loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch {
      setErr("Falha no login. Verifique e-mail e senha.");
    }
  }

  return (
    <div className="container">
      <h1>Controle de Horas</h1>
      <div className="card">
        <h3>Entrar</h3>
        <form onSubmit={onSubmit} className="form">
          <label>
            E-mail
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          {err && <div className="error">{err}</div>}
          <button disabled={loading} type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
