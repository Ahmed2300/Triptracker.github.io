import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { ConnectivityProvider } from "./contexts/ConnectivityContext";
import WebViewHandler from "./components/WebViewHandler";
import { useEffect } from "react";
import { isRunningInWebView } from "./utils/mobileCompatibility";

const queryClient = new QueryClient();

const App = () => {
  // Log Android WebView detection on startup
  useEffect(() => {
    const inWebView = isRunningInWebView();
    console.log('App running in Android WebView:', inWebView);
    
    // Apply additional body class for WebView-specific styling
    if (inWebView) {
      document.body.classList.add('android-webview');
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectivityProvider>
        <AuthProvider>
          <TooltipProvider>
            <WebViewHandler>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </WebViewHandler>
          </TooltipProvider>
        </AuthProvider>
      </ConnectivityProvider>
    </QueryClientProvider>
  );
};

export default App;
