import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Reimbursements from "./pages/Reimbursements";
import Recipes from "./pages/Recipes";
import Analytics from "./pages/Analytics";
import Activity from "./pages/Activity";
import Inventory from "./pages/Inventory";
import Users from "./pages/admin/Users";

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Layout><Expenses /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reimbursements"
        element={
          <ProtectedRoute>
            <Layout><Reimbursements /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <ProtectedRoute>
            <Layout><Recipes /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Layout><Analytics /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Layout><Activity /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Layout><Inventory /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Layout><Users /></Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={user?.role === "admin" ? "/dashboard" : user ? "/expenses" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
