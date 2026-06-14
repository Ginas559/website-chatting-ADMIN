import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AdminManagementPage from './pages/AdminManagementPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProfilePage from './pages/AdminProfilePage';
import ManagerProfilePage from './pages/ManagerProfilePage';
import ShipperProfilePage from './pages/ShipperProfilePage';

const DeliveryVerificationPage = lazy(() => import('./pages/DeliveryVerificationPage'));

const STAFF_HOME_BY_ROLE = {
  R1: '/admin/orders',
  R3: '/manager/users',
  R4: '/shipper/delivery',
};

const getRoleIdFromToken = () => {
  const token = localStorage.getItem('accessToken');

  if (!token) return '';

  try {
    const payload = token.split('.')[1];
    if (!payload) return '';

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)).roleId || '';
  } catch {
    return '';
  }
};

const getStaffHomePath = (roleId) => STAFF_HOME_BY_ROLE[roleId] || '/login';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const roleId = user?.roleId || getRoleIdFromToken();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(roleId)) {
    return <Navigate to={getStaffHomePath(roleId)} replace />;
  }

  return children;
};

const StaffHomeRedirect = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const roleId = user?.roleId || getRoleIdFromToken();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getStaffHomePath(roleId)} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StaffHomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={['R1']}>
              <AdminProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['R1']}>
              <AdminManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/management/users"
          element={<Navigate to="/admin/users" replace />}
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute allowedRoles={['R1']}>
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manager/profile"
          element={
            <ProtectedRoute allowedRoles={['R3']}>
              <ManagerProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/users"
          element={
            <ProtectedRoute allowedRoles={['R3']}>
              <AdminManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipper/profile"
          element={
            <ProtectedRoute allowedRoles={['R4']}>
              <ShipperProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipper/delivery"
          element={
            <ProtectedRoute allowedRoles={['R4']}>
              <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-50 font-semibold text-slate-600">Dang tai trinh quet QR...</div>}>
                <DeliveryVerificationPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/verify"
          element={<Navigate to="/shipper/delivery" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
