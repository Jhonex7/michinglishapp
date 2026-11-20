import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchStudentEntries } from '../../helpers/fetchDataHelper';
import { getTopicById } from '../../config/topics';

// State shape: { byTopic: { [topicId]: { entries: [], status, error } } }
// status: 'idle' | 'loading' | 'succeeded' | 'failed'

export const loadTopic = createAsyncThunk(
  'quizzes/loadTopic',
  async (topicId) => {
    const topic = getTopicById(topicId);
    if (!topic) throw new Error(`Unknown topic "${topicId}"`);
    return fetchStudentEntries(`${import.meta.env.BASE_URL}${topic.folder}`);
  },
  {
    // Skip the request when the topic is already loaded or loading.
    condition: (topicId, { getState }) => {
      const status = getState().quizzes.byTopic[topicId]?.status;
      return status !== 'loading' && status !== 'succeeded';
    },
  },
);

const initialState = { byTopic: {} };

export const quizzesSlice = createSlice({
  name: 'quizzes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTopic.pending, (state, { meta }) => {
        state.byTopic[meta.arg] = { entries: [], status: 'loading', error: null };
      })
      .addCase(loadTopic.fulfilled, (state, { meta, payload }) => {
        state.byTopic[meta.arg] = { entries: payload, status: 'succeeded', error: null };
      })
      .addCase(loadTopic.rejected, (state, { meta, error }) => {
        state.byTopic[meta.arg] = { entries: [], status: 'failed', error: error.message };
      });
  },
});

const IDLE_TOPIC = Object.freeze({ entries: [], status: 'idle', error: null });

export const selectTopicState = (state, topicId) => state.quizzes.byTopic[topicId] || IDLE_TOPIC;

export default quizzesSlice.reducer;
