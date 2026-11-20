import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchVocabularyCategories } from '../../helpers/fetchDataHelper';

// State shape: { categories: { [category]: entries[] }, status, error }

export const loadVocabulary = createAsyncThunk(
  'vocabulary/load',
  () => fetchVocabularyCategories(`${import.meta.env.BASE_URL}vocabulary`),
  {
    condition: (_, { getState }) => {
      const { status } = getState().vocabularypuzzle;
      return status !== 'loading' && status !== 'succeeded';
    },
  },
);

const initialState = {
  categories: {},
  status: 'idle',
  error: null,
};

export const vocabularySlice = createSlice({
  name: 'vocabulary',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadVocabulary.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadVocabulary.fulfilled, (state, { payload }) => {
        state.categories = payload;
        state.status = 'succeeded';
      })
      .addCase(loadVocabulary.rejected, (state, { error }) => {
        state.status = 'failed';
        state.error = error.message;
      });
  },
});

export default vocabularySlice.reducer;
