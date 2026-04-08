import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ROUTES = {
  '1': '/',
  '2': '/about',
  '3': '/projects',
  '4': '/contact',
  '5': '/news',
  '6': '/lab',
};

const isInputFocused = () => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
};

export function useKeyboardNav({ toggleTheme, toggleReadingMode } = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      if (ROUTES[key]) {
        navigate(ROUTES[key]);
      } else if (key === 'd' && toggleTheme) {
        toggleTheme();
      } else if (key === 'v' && toggleReadingMode) {
        toggleReadingMode();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, toggleTheme, toggleReadingMode]);
}
