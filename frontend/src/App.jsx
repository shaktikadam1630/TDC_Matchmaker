import { Link, Route, Routes } from 'react-router-dom';
import { ErrorBoundary, ProtectedRoute } from './components/common.jsx';
import Layout from './pages/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CustomerPage from './pages/CustomerPage.jsx';

const NotFound = () => (
  <div className="center-pad">
    <h1>Page not found</h1>
    <p><Link to="/">Back to dashboard</Link></p>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="customers/:id" element={<CustomerPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
