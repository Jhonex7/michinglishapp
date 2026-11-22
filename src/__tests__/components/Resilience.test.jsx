// The app must keep working when a student's file is broken, missing or
// unusual: one bad contribution never takes a whole topic down.
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { createAppStore } from '../../store/store';
import { fetchStudentEntries } from '../../helpers/fetchDataHelper';

const user = {
  username: 'Ana Gómez',
  profileImage: 'https://github.com/ana.png',
  socialNetwork: 'instagram',
  socialLink: '@ana_g',
};
const good = {
  user,
  topics: [{ topic: 'adjectives', questions: [{ question: 'The _____ cat.', options: ['big', 'bigly', 'bigs', 'bigger than'], answer: 'big' }] }],
};

// "broken" answers with invalid JSON, "missing" is not on the server.
const files = {
  'adjectives/index.json': { folders: ['1111111-1111', '2222222-2222', '3333333-3333'] },
  'adjectives/1111111-1111/info.json': good,
  'adjectives/2222222-2222/info.json': 'broken',
  'verbs/index.json': { folders: ['4444444-4444'] },
  'verbs/4444444-4444/info.json': { user: { username: 'No profile' }, topics: [] },
};

const fakeFetch = vi.fn(async (url) => {
  const key = String(url).replace(/^.*?michinglishapp\//, '').replace(/^\//, '');
  const body = files[key] ?? (key.endsWith('index.json') ? { folders: [] } : undefined);
  if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
  if (body === 'broken') return { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token'); } };
  return { ok: true, status: 200, json: async () => body };
});

const renderAt = (path) =>
  render(
    <Provider store={createAppStore()}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>
    </Provider>,
  );

beforeEach(() => {
  vi.stubGlobal('fetch', fakeFetch);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => vi.unstubAllGlobals());

describe('fetchStudentEntries', () => {
  test('skips broken and missing student files and keeps the rest', async () => {
    const entries = await fetchStudentEntries('/michinglishapp/adjectives');
    expect(entries.map((e) => e.studentCode)).toEqual(['1111111-1111']);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  test('a missing index.json is an error (the topic cannot load)', async () => {
    fakeFetch.mockImplementationOnce(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    await expect(fetchStudentEntries('/michinglishapp/nothing')).rejects.toThrow('HTTP 404');
  });
});

describe('pages with unusual content', () => {
  test('a topic with one broken and one missing file still plays the good one', async () => {
    renderAt('/adjectives');
    // Only the good student's question is counted: 1, not 3.
    expect(await screen.findByText(/1 question\b/)).toBeInTheDocument();
  });

  test('a topic with no students invites to contribute', async () => {
    renderAt('/adverbs');
    expect(await screen.findByText(/Nothing here yet for Adverbs/)).toBeInTheDocument();
  });

  test('a file without questions or profile does not crash the topic', async () => {
    renderAt('/verbs');
    expect(await screen.findByText(/Nothing here yet for Verbs/)).toBeInTheDocument();
  });

  test('the contributors page survives incomplete profiles', async () => {
    renderAt('/contributors');
    expect(await screen.findByText('Ana Gómez')).toBeInTheDocument();
  });
});

describe('contribute page checker', () => {
  const paste = (value) => {
    renderAt('/contribute');
    fireEvent.change(screen.getByLabelText(/paste your info.json/i), { target: { value } });
  };

  test('explains a trailing comma', () => {
    paste('{"user": {"username": "Ana",},}');
    expect(screen.getByText(/remove the comma before/)).toBeInTheDocument();
  });

  test('a JSON list is not an info.json', () => {
    paste('[1, 2]');
    expect(screen.getByText(/must contain a JSON object/)).toBeInTheDocument();
  });

  test('reports repeated keys', () => {
    paste('{"user": {"username": "Ana", "username": "Ana G"}, "topics": []}');
    expect(screen.getByText(/repeated keys in the same object: "username"/)).toBeInTheDocument();
  });

  test('lists every missing profile field', () => {
    paste(JSON.stringify({ user: { username: 'Ana' }, words: [] }));
    expect(screen.getByText(/user.socialNetwork is required/)).toBeInTheDocument();
    expect(screen.getByText(/user.socialLink must be a non-empty string/)).toBeInTheDocument();
    expect(screen.getByText(/user.profileImage must be a string/)).toBeInTheDocument();
  });

  test('a misspelled key gets a suggestion', () => {
    paste(JSON.stringify({ user: { ...user, socialnetwork: 'x' }, words: [] }));
    expect(screen.getByText(/did you mean "socialNetwork"/)).toBeInTheDocument();
  });

  test('accepts a Windows BOM', () => {
    const words = ['cat', 'dog', 'bird', 'fish'].map((en, i) => ({ id: i + 1, en, es: `es${i}` }));
    paste(`\uFEFF${JSON.stringify({ user, words })}`);
    expect(screen.getByText(/Looks great!/)).toBeInTheDocument();
  });
});
