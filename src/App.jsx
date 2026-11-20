import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import AppNavbar from './components/Navbar/AppNavbar';
import Sidebar from './components/Sidebar/Sidebar';
import { AppRouter } from './router/AppRouter';
import { loadVocabulary } from './store/vocabulary';

function App() {
  const dispatch = useDispatch();
  const [showSidebar, setShowSidebar] = useState(false);

  // Vocabulary categories feed the sidebar, so load them once at startup.
  // Quiz topics load on demand when a page needs them.
  useEffect(() => {
    dispatch(loadVocabulary());
  }, [dispatch]);

  const toggleSidebar = () => setShowSidebar((open) => !open);

  return (
    <>
      <AppNavbar onToggleSidebar={toggleSidebar} />
      <Sidebar show={showSidebar} onClose={toggleSidebar} />
      <main>
        <AppRouter />
      </main>
      <footer className="text-center text-muted small py-4">
        Made with 🧡 by students of Universidad del Valle ·{' '}
        <a href="https://github.com/fredyunivalle/michinglishapp" target="_blank" rel="noopener noreferrer">
          Contribute on GitHub
        </a>
      </footer>
    </>
  );
}

export default App;
