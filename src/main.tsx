import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MaxUI } from '@maxhub/max-ui';
import '@maxhub/max-ui/dist/styles.css';
import { App } from './App';
import './styles.css';
import { Theme, THEME_KEY } from './types';

function Root() {
  const [theme, setTheme] = useState<Theme>('light');

  function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme(theme);
    }
  }, []);

  return (
    <React.StrictMode>
      <MaxUI colorScheme={theme}>
        <App theme={theme} setTheme={setTheme} toggleTheme={toggleTheme} applyTheme={applyTheme}/>
      </MaxUI>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
