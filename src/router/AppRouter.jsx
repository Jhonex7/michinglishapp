import { Navigate, Route, Routes } from 'react-router-dom';
import { QUIZ_TOPICS } from '../config/topics';
import HomePage from '../pages/HomePage';
import ActivityPage from '../pages/ActivityPage';
import VocabularyPuzzlePage from '../pages/VocabularyPuzzlePage';
import ContributorsPage from '../pages/ContributorsPage';
import ContributePage from '../pages/ContributePage';

// Paths are relative to the router basename (/michinglishapp).
export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    {QUIZ_TOPICS.map((topic) => (
      <Route key={topic.id} path={`/${topic.path}`} element={<ActivityPage topic={topic} />} />
    ))}
    <Route path="/vocabularypuzzel/:category" element={<VocabularyPuzzlePage />} />
    <Route path="/contributors" element={<ContributorsPage />} />
    <Route path="/contribute" element={<ContributePage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
