import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
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
import Learning from "./pages/Learning";
import CourseDetails from "./pages/CourseDetails";
import CourseLocked from "./pages/CourseLocked";
import LessonDetails from "./pages/LessonDetails";
import GameMultiplayer from "./pages/GameMultiplayer";
import GamePlay from "./pages/GamePlay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<Search />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/wine/:id" element={<WineDetails />} />
            <Route path="/cellars" element={<Cellars />} />
            <Route path="/cellar/:id" element={<CellarDetails />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/domain/:id" element={<DomainDetails />} />
            <Route path="/super-admin" element={<SuperAdminPanel />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/learning" element={<Learning />} />
            <Route path="/course/:id" element={<CourseDetails />} />
            <Route path="/course/locked/:id" element={<CourseLocked />} />
            <Route path="/course/:courseId/lesson/:lessonId" element={<LessonDetails />} />
            <Route path="/game" element={<GameMultiplayer />} />
            <Route path="/game/play" element={<GamePlay />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
