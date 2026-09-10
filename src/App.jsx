import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import ImportData from './pages/ImportData';
import ItemPublic from './pages/ItemPublic';
import MyProfile from './pages/MyProfile';
import Maintenance from './pages/Maintenance';
import Operations from './pages/Operations';
import SupplierDetail from './pages/SupplierDetail';
import RequirePermission from '@/components/RequirePermission';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <RequirePermission module={mainPageKey}>
            <MainPage />
          </RequirePermission>
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <RequirePermission module={path}>
                <Page />
              </RequirePermission>
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/ImportData" element={
        <LayoutWrapper currentPageName="ImportData">
          <ImportData />
        </LayoutWrapper>
      } />
      <Route path="/MyProfile" element={
        <LayoutWrapper currentPageName="MyProfile">
          <RequirePermission module="MyProfile">
            <MyProfile />
          </RequirePermission>
        </LayoutWrapper>
      } />
      <Route path="/Maintenance" element={
        <LayoutWrapper currentPageName="Maintenance">
          <RequirePermission module="Maintenance">
            <Maintenance />
          </RequirePermission>
        </LayoutWrapper>
      } />
      <Route path="/Operations" element={
        <LayoutWrapper currentPageName="Operations">
          <RequirePermission module="Operations">
            <Operations />
          </RequirePermission>
        </LayoutWrapper>
      } />
      <Route path="/SupplierDetail" element={
        <LayoutWrapper currentPageName="SupplierDetail">
          <RequirePermission module="SupplierDetail">
            <SupplierDetail />
          </RequirePermission>
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          {window.location.pathname.startsWith('/ItemPublic') ? (
            <Routes>
              <Route path="/ItemPublic/:id" element={<ItemPublic />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          ) : (
            <AuthenticatedApp />
          )}
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App