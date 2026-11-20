import { configureStore } from '@reduxjs/toolkit';
import { quizzesSlice } from './quizzes/quizzesSlice';
import { vocabularySlice } from './vocabulary';

export const createAppStore = (preloadedState) =>
  configureStore({
    reducer: {
      quizzes: quizzesSlice.reducer,
      vocabularypuzzle: vocabularySlice.reducer,
    },
    preloadedState,
  });

export const store = createAppStore();
