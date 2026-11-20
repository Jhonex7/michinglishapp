// Integration test: renders the whole app with a fake /public folder.
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { createAppStore } from '../../store/store';

const student = {
  user: {
    username: 'Ana Gómez',
    profileImage: 'https://github.com/ana.png',
    socialNetwork: 'instagram',
    socialLink: '@ana_g',
  },
  topics: [
    {
      topic: 'verbs',
      questions: [{ question: 'She _____ fast.', options: ['run', 'runs', 'ran', 'running'], answer: 'runs' }],
    },
  ],
};

const fakeFiles = {
  'vocabulary/index.json': { folders: ['animals'] },
  'vocabulary/animals/index.json': { folders: ['2212345-3743'] },
  'vocabulary/animals/2212345-3743/info.json': {
    user: student.user,
    words: [
      { id: 1, en: 'cat', es: 'gato' },
      { id: 2, en: 'dog', es: 'perro' },
      { id: 3, en: 'bird', es: 'pájaro' },
      { id: 4, en: 'fish', es: 'pez' },
    ],
  },
  'verbs/index.json': { folders: ['2212345-3743'] },
  'verbs/2212345-3743/info.json': student,
};

const renderAt = (path) =>
  render(
    <Provider store={createAppStore()}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>
    </Provider>,
  );

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const key = String(url).replace(/^.*?michinglishapp\//, '').replace(/^\//, '');
      const body = fakeFiles[key] ?? (key.endsWith('index.json') ? { folders: [] } : undefined);
      return body === undefined
        ? { ok: false, status: 404, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => body };
    }));
  });
  // Keep the fake fetch for the whole file: some requests may still be in
  // flight when a test ends, and they must not hit the real network.
  afterAll(() => vi.unstubAllGlobals());

  test('home page shows the hero and the student contributors', async () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: /learn english with michi/i })).toBeInTheDocument();
    expect(await screen.findByText('A2 · 1 contributor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /second conditional/i })).toBeInTheDocument();
  });

  test('a quiz page loads its questions from public/<topic>', async () => {
    renderAt('/verbs');
    expect(await screen.findByText(/1 questions/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /verbs/i })).toBeInTheDocument();
  });

  test('contributors page lists each student with code and social network', async () => {
    renderAt('/contributors');
    expect(await screen.findByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText('2212345-3743')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /instagram: @ana_g/i })).toBeInTheDocument();
  });

  test('vocabulary puzzle credits the student who made it', async () => {
    renderAt('/vocabularypuzzel/animals');
    expect(await screen.findByText('Puzzle by')).toBeInTheDocument();
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
  });

  test('contribute page validates pasted JSON with the pipeline rules', async () => {
    renderAt('/contribute');
    const textarea = screen.getByLabelText(/paste your info.json/i);
    fireEvent.change(textarea, { target: { value: '{"user":{}}' } });
    expect(screen.getByText(/fix these/i)).toBeInTheDocument();
  });
});
