import React, { useState } from "react";
import Login from "./pages/Login";
import GroupReport from "./pages/GroupReport";
import AdminDashboard from "./pages/AdminDashboard";
import GroupMembers from "./pages/GroupMembers";
import AdminMembers from "./pages/AdminMembers";
import { useAuth } from "./auth/AuthProvider";

export default function App() {
  const { user, profile, loading } = useAuth();
  const [groupPage, setGroupPage] = useState("report"); // report | members
  const [adminPage, setAdminPage] = useState("dashboard"); // dashboard | members

  if (loading) return <div className="container">Carregando...</div>;
  if (!user) return <Login />;

  if (!profile) {
    return (
      <div className="container">
        <h2>Usuário sem perfil</h2>
        <p className="muted">
          O administrador precisa criar seu documento em <code>users/{`{uid}`}</code>.
        </p>
      </div>
    );
  }

  if (profile.papel === "admin") {
    if (adminPage === "members") {
      return <AdminMembers onBack={() => setAdminPage("dashboard")} />;
    }
    return <AdminDashboard onGoMembers={() => setAdminPage("members")} />;
  }

  if (groupPage === "members") {
    return <GroupMembers onGoReport={() => setGroupPage("report")} />;
  }

  return <GroupReport onGoMembers={() => setGroupPage("members")} />;
}
