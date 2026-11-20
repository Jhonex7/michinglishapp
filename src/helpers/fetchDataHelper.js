const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
  return response.json();
};

/**
 * Loads every student folder listed in `<baseUrl>/index.json`.
 * Each entry gets `studentCode` (the folder name) so the UI can credit it.
 * A broken student file is skipped (and logged) instead of breaking the topic.
 */
export const fetchStudentEntries = async (baseUrl) => {
  const { folders = [] } = await fetchJson(`${baseUrl}/index.json`);
  const results = await Promise.allSettled(
    folders.map(async (studentCode) => ({
      ...(await fetchJson(`${baseUrl}/${studentCode}/info.json`)),
      studentCode,
    })),
  );
  return results.flatMap((result, i) => {
    if (result.status === 'fulfilled') return [result.value];
    console.warn(`Skipping ${baseUrl}/${folders[i]}:`, result.reason);
    return [];
  });
};

/** Loads all vocabulary puzzle categories: { [category]: entries[] } */
export const fetchVocabularyCategories = async (baseUrl) => {
  const { folders: categories = [] } = await fetchJson(`${baseUrl}/index.json`);
  const entries = await Promise.all(
    categories.map(async (category) => [category, await fetchStudentEntries(`${baseUrl}/${category}`)]),
  );
  return Object.fromEntries(entries);
};
