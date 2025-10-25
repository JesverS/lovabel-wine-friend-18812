import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import UserProfile from "./pages/UserProfile";
import WineDetails from "./pages/WineDetails";
import Cellars from "./pages/Cellars";
import CellarDetails from "./pages/CellarDetails";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import DomainDetails from "./pages/DomainDetails";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import CompleteProfile from "./pages/CompleteProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profileComplete } = useAuth();

  if (loading || profileComplete === null) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileComplete === false) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, profileComplete } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route 
        path="/complete-profile" 
        element={
          user && profileComplete === false ? <CompleteProfile /> : <Navigate to="/" replace />
        } 
      />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/user/:id" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/wine/:id" element={<ProtectedRoute><WineDetails /></ProtectedRoute>} />
      <Route path="/cellars" element={<ProtectedRoute><Cellars /></ProtectedRoute>} />
      <Route path="/cellar/:id" element={<ProtectedRoute><CellarDetails /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/event/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
      <Route path="/domain/:id" element={<ProtectedRoute><DomainDetails /></ProtectedRoute>} />
      <Route path="/super-admin" element={<ProtectedRoute><SuperAdminPanel /></ProtectedRoute>} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
