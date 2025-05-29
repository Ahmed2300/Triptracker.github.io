// Mobile compatibility utilities for Android WebView support

/**
 * Detects if the application is running inside a WebView
 * @returns boolean indicating if app is in WebView
 */
export const isRunningInWebView = (): boolean => {
  // Check for Android WebView
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('wv') || // Android WebView specific
         (userAgent.includes('android') && userAgent.includes('version/')) ||
         window.navigator.userAgent.includes('WebView');
};

/**
 * Adjusts viewport settings for mobile devices
 */
export const setupMobileViewport = (): void => {
  // Find existing viewport meta tag or create a new one
  let viewportMeta = document.querySelector('meta[name="viewport"]');
  
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.setAttribute('name', 'viewport');
    document.head.appendChild(viewportMeta);
  }
  
  // Set appropriate viewport settings for mobile devices
  viewportMeta.setAttribute(
    'content', 
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  );
};

/**
 * Sets up communication channel with native Android app if needed
 */
export const setupAndroidBridge = (): void => {
  // Create a global window property that Android's JavascriptInterface can access
  (window as any).AndroidBridge = {
    // Example function that can be called from JavaScript
    sendMessageToAndroid: (message: string): void => {
      // This will be accessible from Android via WebView's JavascriptInterface
      console.log(`Message ready for Android: ${message}`);
      
      // In a real implementation, the Android WebView would define a JavascriptInterface
      // that has a method to receive this message
    },
    
    // Function to notify Android when the app is fully loaded
    notifyAppReady: (): void => {
      console.log('Web app is fully loaded and ready');
    }
  };
};

/**
 * Applies styles optimized for mobile WebView
 */
export const applyMobileWebViewStyles = (): void => {
  const style = document.createElement('style');
  style.textContent = `
    /* Prevent overscroll/bounce effect on iOS */
    html, body {
      position: fixed;
      overflow: hidden;
      width: 100%;
      height: 100%;
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
    }
    
    /* Make content scrollable */
    #root {
      overflow-y: auto;
      height: 100%;
      width: 100%;
      position: absolute;
      -webkit-overflow-scrolling: touch;
    }
    
    /* Increase touch target sizes for better mobile usability */
    button, 
    .btn, 
    a, 
    input[type="button"], 
    input[type="submit"] {
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Improve input fields on mobile */
    input, select, textarea {
      font-size: 16px !important; /* Prevents iOS zoom on focus */
    }
  `;
  document.head.appendChild(style);
};

/**
 * Initialize all mobile compatibility features
 */
export const initMobileCompatibility = (): void => {
  setupMobileViewport();
  applyMobileWebViewStyles();
  setupAndroidBridge();
  
  // Log device information for debugging
  console.log('User Agent:', navigator.userAgent);
  console.log('Running in WebView:', isRunningInWebView());
  
  // Send ready signal when everything is loaded
  window.addEventListener('load', () => {
    if (isRunningInWebView() && (window as any).AndroidBridge) {
      (window as any).AndroidBridge.notifyAppReady();
    }
  });
};
