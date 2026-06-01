import { RouterProvider } from 'react-router';
import { router } from './routes.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}
