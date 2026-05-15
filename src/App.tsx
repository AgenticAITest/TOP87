import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Landing      from './pages/Landing';
import About        from './pages/About';
import ChaptersPage from './pages/ChaptersPage';
import CharterDetail from './pages/CharterDetail';
import Directory    from './pages/Directory';
import Gallery      from './pages/Gallery';
import YearbookPage from './pages/YearbookPage';
import SubmitMedia  from './pages/SubmitMedia';
import MyProfile    from './pages/MyProfile';
import MemberProfile from './pages/MemberProfile';
import Register     from './pages/Register';
import Pending      from './pages/Pending';
import AuthCallback from './pages/AuthCallback';
import NotFound     from './pages/NotFound';

import Dashboard    from './pages/admin/Dashboard';
import AdminMembers from './pages/admin/AdminMembers';
import AdminMedia   from './pages/admin/AdminMedia';
import AdminCMS     from './pages/admin/AdminCMS';
import SiteAdmin    from './pages/admin/SiteAdmin';
import ContentAdmin from './pages/admin/ContentAdmin';
import AllMembers   from './pages/admin/AllMembers';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* OAuth callback — no layout */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Public + member routes */}
        <Route element={<MainLayout />}>
          <Route path="/"            element={<Landing />} />
          <Route path="/about"       element={<About />} />
          <Route path="/charters"    element={<ChaptersPage />} />
          <Route path="/charters/:slug" element={<CharterDetail />} />
          <Route path="/yearbook"         element={<Navigate to="/yearbook/2026" replace />} />
          <Route path="/yearbook/:year"   element={<YearbookPage />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/pending"     element={<Pending />} />

          {/* Approved-member-only routes */}
          <Route path="/directory"   element={<ProtectedRoute requireApproved><Directory /></ProtectedRoute>} />
          <Route path="/gallery"     element={<ProtectedRoute requireApproved><Gallery /></ProtectedRoute>} />
          <Route path="/submit"      element={<ProtectedRoute requireApproved><SubmitMedia /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
          <Route path="/members/:id" element={<ProtectedRoute requireApproved><MemberProfile /></ProtectedRoute>} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index             element={<Dashboard />} />
          <Route path="members"    element={<AdminMembers />} />
          <Route path="media"      element={<AdminMedia />} />
          <Route path="cms"        element={<AdminCMS />} />
          <Route path="site"        element={<SiteAdmin />} />
          <Route path="content"     element={<ContentAdmin />} />
          <Route path="all-members" element={<AllMembers />} />
          <Route path="*"          element={<Navigate to="/admin" replace />} />
        </Route>

        <Route path="*" element={<MainLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
