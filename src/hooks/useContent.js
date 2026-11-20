import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadTopic, selectTopicState } from '../store/quizzes/quizzesSlice';
import { loadVocabulary } from '../store/vocabulary';
import { QUIZ_TOPICS } from '../config/topics';

/** Loads one quiz topic on demand and returns { entries, status, error }. */
export const useTopic = (topicId) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (topicId) dispatch(loadTopic(topicId));
  }, [dispatch, topicId]);
  return useSelector((state) => selectTopicState(state, topicId));
};

/** Loads every quiz topic and the vocabulary puzzles (home & contributors). */
export const useAllContent = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    QUIZ_TOPICS.forEach((topic) => dispatch(loadTopic(topic.id)));
    dispatch(loadVocabulary());
  }, [dispatch]);

  const byTopic = useSelector((state) => state.quizzes.byTopic);
  const vocabulary = useSelector((state) => state.vocabularypuzzle);

  return useMemo(() => {
    const quizData = Object.fromEntries(
      QUIZ_TOPICS.map((topic) => [topic.id, byTopic[topic.id]?.entries || []]),
    );
    const loading =
      vocabulary.status !== 'succeeded' ||
      QUIZ_TOPICS.some((topic) => ['idle', 'loading', undefined].includes(byTopic[topic.id]?.status));
    return { quizData, vocabularyData: vocabulary.categories, loading };
  }, [byTopic, vocabulary]);
};
