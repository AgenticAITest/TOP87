import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

import PublicLanding    from './pages/PublicLanding';
import Landing          from './pages/Landing';
import About            from './pages/About';
import AnggranPage      from './pages/AnggranPage';
import FAQPage          from './pages/FAQPage';
import PengumumanPage   from './pages/PengumumanPage';
import ChaptersPage     from './pages/ChaptersPage';
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

import Dashboard      from './pages/admin/Dashboard';
import AdminMembers   from './pages/admin/AdminMembers';
import AdminMedia     from './pages/admin/AdminMedia';
import AdminCMS       from './pages/admin/AdminCMS';
import SiteAdmin      from './pages/admin/SiteAdmin';
import ContentAdmin   from './pages/admin/ContentAdmin';
import SiteCMSAdmin   from './pages/admin/SiteCMSAdmin';
import AllMembers     from './pages/admin/AllMembers';
import AdminRoles     from './pages/admin/AdminRoles';
import AdminRoster    from './pages/admin/AdminRoster';
import AdminPayments         from './pages/admin/AdminPayments';
import AdminMerchandise      from './pages/admin/AdminMerchandise';
import AdminOrders           from './pages/admin/AdminOrders';
import AdminFinancialReport  from './pages/admin/AdminFinancialReport';
import AdminBankRekon        from './pages/admin/AdminBankRekon';
import AdminCharters         from './pages/admin/AdminCharters';
import AdminKeringanan       from './pages/admin/AdminKeringanan';
import AdminExpenses         from './pages/admin/AdminExpenses';
import PaymentsPage     from './pages/PaymentsPage';
import MerchandisePage  from './pages/MerchandisePage';
import MyOrdersPage     from './pages/MyOrdersPage';
import Memoriam        from './pages/Memoriam';

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen parchment-bg flex items-center justify-center">
        <p className="text-gray-400 text-xs uppercase tracking-widest animate-pulse">Memuat…</p>
      </div>
    );
  }
  if (user) return <Navigate to="/home" replace />;
  return <PublicLanding />;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        {/* OAuth callback — no layout */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Public teaser landing — no sidebar */}
        <Route path="/" element={<RootRoute />} />

        {/* Public + member routes */}
        <Route element={<MainLayout />}>
          <Route path="/home"        element={<ProtectedRoute><Landing /></ProtectedRoute>} />
          <Route path="/about"       element={<About />} />
          <Route path="/charters"    element={<ChaptersPage />} />
          <Route path="/charters/:slug" element={<CharterDetail />} />
          <Route path="/yearbook"         element={<Navigate to="/yearbook/2026" replace />} />
          <Route path="/yearbook/:year"   element={<YearbookPage />} />
          <Route path="/anggaran"    element={<AnggranPage />} />
          <Route path="/faq"         element={<FAQPage />} />
          <Route path="/pengumuman"  element={<PengumumanPage />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/pending"     element={<Pending />} />
          <Route path="/mengenang"   element={<ProtectedRoute><Memoriam /></ProtectedRoute>} />

          {/* Approved-member-only routes */}
          <Route path="/directory"   element={<ProtectedRoute requireApproved><Directory /></ProtectedRoute>} />
          <Route path="/gallery"     element={<ProtectedRoute requireApproved><Gallery /></ProtectedRoute>} />
          <Route path="/submit"      element={<ProtectedRoute requireApproved><SubmitMedia /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
          <Route path="/members/:id" element={<ProtectedRoute requireApproved><MemberProfile /></ProtectedRoute>} />
          <Route path="/payments"     element={<ProtectedRoute requireApproved><PaymentsPage /></ProtectedRoute>} />
          <Route path="/merchandise" element={<ProtectedRoute requireApproved><MerchandisePage /></ProtectedRoute>} />
          <Route path="/orders"      element={<ProtectedRoute requireApproved><MyOrdersPage /></ProtectedRoute>} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index             element={<Dashboard />} />
          <Route path="members"    element={<AdminMembers />} />
          <Route path="media"      element={<AdminMedia />} />
          <Route path="cms"        element={<AdminCMS />} />
          <Route path="site"        element={<SiteAdmin />} />
          <Route path="content"     element={<ContentAdmin />} />
          <Route path="site-cms"    element={<SiteCMSAdmin />} />
          <Route path="all-members" element={<AllMembers />} />
          <Route path="roles"            element={<AdminRoles />} />
          <Route path="roster"           element={<AdminRoster />} />
          <Route path="payments"        element={<AdminPayments />} />
          <Route path="merchandise"     element={<AdminMerchandise />} />
          <Route path="orders"          element={<AdminOrders />} />
          <Route path="financial"       element={<AdminFinancialReport />} />
          <Route path="bank-rekon"      element={<AdminBankRekon />} />
          <Route path="charters"        element={<AdminCharters />} />
          <Route path="keringanan"      element={<AdminKeringanan />} />
          <Route path="expenses"        element={<AdminExpenses />} />
          <Route path="*"           element={<Navigate to="/admin" replace />} />
        </Route>

        <Route path="*" element={<MainLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}
