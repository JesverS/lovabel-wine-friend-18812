import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AuthConfirm from "./pages/AuthConfirm";
import UserProfile from "./pages/UserProfile";
import WineDetails from "./pages/WineDetails";
import Cellars from "./pages/Cellars";
import CellarDetails from "./pages/CellarDetails";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import DomainDetails from "./pages/DomainDetails";
import CompleteProfile from "./pages/CompleteProfile";
import Learning from "./pages/Learning";
import CourseDetails from "./pages/CourseDetails";
import CourseLocked from "./pages/CourseLocked";
import LessonDetails from "./pages/LessonDetails";
import GameMultiplayer from "./pages/GameMultiplayer";
import GamePlay from "./pages/GamePlay";
import CellarInvitation from "./pages/CellarInvitation";
import EventInvitation from "./pages/EventInvitation";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import Privacy from "./pages/Privacy";
import Notifications from "./pages/Notifications";
import Badges from "./pages/Badges";
import SharedPost from "./pages/SharedPost";
import PostDetails from "./pages/PostDetails";
import Feed from "./pages/Feed";
import Guides from "./pages/Guides";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
import PaymentGateway from "./pages/PaymentGateway";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<Search />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/user/:slug" element={<UserProfile />} />
              <Route path="/wine/:id" element={<WineDetails />} />
              <Route path="/cellars" element={<Cellars />} />
              <Route path="/cellar/:slug" element={<CellarDetails />} />
              <Route path="/events" element={<Events />} />
              <Route path="/event/:slug" element={<EventDetails />} />
              <Route path="/domain/:id" element={<DomainDetails />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/learning" element={<Learning />} />
              <Route path="/course/:id" element={<CourseDetails />} />
              <Route path="/course/locked/:id" element={<CourseLocked />} />
              <Route path="/course/:courseId/lesson/:lessonId" element={<LessonDetails />} />
              <Route path="/game" element={<GameMultiplayer />} />
              <Route path="/game/play" element={<GamePlay />} />
              <Route path="/cellar-invitation/:token" element={<CellarInvitation />} />
              <Route path="/event-invitation/:token" element={<EventInvitation />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/badges" element={<Badges />} />
              <Route path="/post/share/:token" element={<SharedPost />} />
              <Route path="/post/:id" element={<PostDetails />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/guides" element={<Guides />} />
              <Route path="/favorites" element={<Favorites />} />
              {/* Payment gateway routes */}
              <Route path="/pay/:slug" element={<PaymentGateway />} />
              <Route path="/pay/:slug/success" element={<PaymentSuccess />} />
              <Route path="/pay/:slug/cancelled" element={<PaymentCancelled />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
