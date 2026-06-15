import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import { loadSavedTheme, loadSavedDarkMode, loadSavedDensity } from './services/themeService';

// Apply saved preferences synchronously before first paint
loadSavedTheme();
loadSavedDarkMode();
loadSavedDensity();

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
