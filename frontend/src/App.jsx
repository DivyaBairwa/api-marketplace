import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import ApiKey from "./pages/ApiKey";
import Logs from "./pages/Logs";
import AdminDashboard from "./pages/AdminDashboard";
import AdminApis from "./pages/AdminApis";
import AdminUsers from "./pages/AdminUsers";
import AdminLogs from "./pages/AdminLogs";

export default function App() {
  const { token, user } = useAuth();
  const homePath = user?.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to={homePath} replace /> : <Login />} />
      <Route path="/signup" element={token ? <Navigate to={homePath} replace /> : <Signup />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalog"
        element={
          <ProtectedRoute>
            <Layout>
              <Catalog />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-key"
        element={
          <ProtectedRoute>
            <Layout>
              <ApiKey />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/logs"
        element={
          <ProtectedRoute>
            <Layout>
              <Logs />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/apis"
        element={
          <AdminRoute>
            <Layout>
              <AdminApis />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <Layout>
              <AdminUsers />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <AdminRoute>
            <Layout>
              <AdminLogs />
            </Layout>
          </AdminRoute>
        }
      />

      <Route path="/" element={<Navigate to={token ? homePath : "/login"} replace />} />
      <Route path="*" element={<Navigate to={token ? homePath : "/login"} replace />} />
    </Routes>
  );
}
