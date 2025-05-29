import { useEffect, ReactNode } from 'react';
import { isRunningInWebView } from '@/utils/mobileCompatibility';

interface WebViewHandlerProps {
  children: ReactNode;
}

/**
 * Component that handles special WebView behavior and optimization
 * This component will detect if we're running in WebView and make necessary adjustments
 */
const WebViewHandler = ({ children }: WebViewHandlerProps) => {
  useEffect(() => {
    // Handle Android back button in WebView
    const handleBackButton = () => {
      if (isRunningInWebView()) {
        // Try to notify Android app about back navigation
        if ((window as any).AndroidBridge?.onBackPressed) {
          (window as any).AndroidBridge.onBackPressed();
        }
      }
    };

    // Handle keyboard visibility adjustments on Android
    const handleKeyboard = () => {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      
      // When input is focused
      const handleFocus = () => {
        if (isRunningInWebView() && viewportMeta) {
          // Adjust viewport to avoid resize issues when keyboard appears
          viewportMeta.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, height=device-height'
          );
        }
      };
      
      // When input loses focus
      const handleBlur = () => {
        if (isRunningInWebView() && viewportMeta) {
          // Reset viewport
          viewportMeta.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
          );
        }
      };
      
      // Add event listeners to all input elements
      const inputElements = document.querySelectorAll('input, textarea');
      inputElements.forEach(element => {
        element.addEventListener('focus', handleFocus);
        element.addEventListener('blur', handleBlur);
      });
      
      // Cleanup function
      return () => {
        inputElements.forEach(element => {
          element.removeEventListener('focus', handleFocus);
          element.removeEventListener('blur', handleBlur);
        });
      };
    };

    // Set up listeners
    window.addEventListener('popstate', handleBackButton);
    const keyboardCleanup = handleKeyboard();
    
    // Set an initial flag to let the Android app know we've loaded
    if (isRunningInWebView() && (window as any).AndroidBridge?.notifyAppReady) {
      setTimeout(() => {
        (window as any).AndroidBridge.notifyAppReady();
      }, 500);
    }
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('popstate', handleBackButton);
      if (keyboardCleanup) keyboardCleanup();
    };
  }, []);
  
  // Apply special class if running in WebView
  return (
    <div className={`app-container ${isRunningInWebView() ? 'in-webview' : ''}`}>
      {children}
    </div>
  );
};

export default WebViewHandler;
