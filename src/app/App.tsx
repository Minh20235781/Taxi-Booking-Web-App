import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { LanguageProvider } from './contexts/LanguageContext';

// Main App component - Entry point of the application
export default function App() {
  return (
    <LanguageProvider>
      <RouterProvider router={router} />
      <Toaster />
    </LanguageProvider>
  );
}