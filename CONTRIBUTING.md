# Contributing to MichinglishAPP 🐱

MichinglishAPP is built **by students, for students**. Every question you write
appears in the app with **your name, your student code and your favorite social
network**, so your classmates know who created it.

There are three ways to contribute. Your professor will tell you which ones
count for your grade.

| Level | What you do | Where |
|---|---|---|
| 1. Content | Write quiz questions or a vocabulary puzzle | `public/<topic>/<student-code>/info.json` |
| 2. Small code | Fix a bug, improve accessibility, add a test, add a social network | an issue labeled **good first issue** |
| 3. Feature | A new game mode, a new page, a new topic | open an issue first and wait for approval |

---

## 1. Setup

```bash
# 1. Fork https://github.com/fredyunivalle/michinglishapp and clone YOUR fork
git clone https://github.com/<your-user>/michinglishapp.git
cd michinglishapp
npm install

# 2. Create your branch from the group branch (see README for the group flow)
git checkout -b feature/<student-code>/<topic>

# 3. Run the app
npm run dev        # http://localhost:5173/michinglishapp/
```

## 2. Content contributions (questions & puzzles)

### Fastest way

```bash
npm run contribute -- --topic secondconditional --code 2212345-3743
# or, for a vocabulary puzzle:
npm run contribute -- --vocabulary animals --code 2212345-3743
```

This creates your folder with a starter `info.json`. Then edit the file.

You never edit `index.json`: the app builds that list from the folders that
exist. Two classmates adding to the same topic never conflict, because each
one only adds their own folder.

You can also open the **Contribute** page of the app: it builds your `user`
block, shows a preview of how you will appear, and checks your file with the
same rules as the pipeline.

**Games** (`--topic`): `sentencebuilder` (Sentence Builder), `errorhunter`
(Error Hunter).

**Quiz topics** (`--topic`): `data` (Check your knowledge), `verbs`,
`adjectives`, `adverbs`, `linkwords`, `modalspossibility`, `modalsdeduction`,
`zeroconditional`, `firstconditional`, `secondconditional`, `thirdconditional`,
`mixedconditional`.

### Quiz `info.json`

Full example: [`public/secondconditional/1802038-5555/info.json`](public/secondconditional/1802038-5555/info.json)

```json
{
  "user": {
    "username": "Ana Gómez",
    "profileImage": "https://github.com/ana-gomez.png",
    "socialNetwork": "instagram",
    "socialLink": "@ana_gomez"
  },
  "topics": [
    {
      "topic": "second conditional",
      "questions": [
        {
          "question": "If I _____ a million dollars, I would travel around the world.",
          "options": ["have", "had", "will have", "would have"],
          "answer": "had"
        }
      ]
    }
  ]
}
```

### Sentence Builder `info.json`

The player sees your sentence with the words shuffled and taps them in order.
Full example: [`public/sentencebuilder/1802038-5555/info.json`](public/sentencebuilder/1802038-5555/info.json)

```json
{
  "user": { "username": "Ana Gómez", "profileImage": "https://…", "socialNetwork": "instagram", "socialLink": "@ana_gomez" },
  "sentences": [
    { "sentence": "If it rains, we will stay at home.", "hint": "First conditional" },
    { "sentence": "I have never been to London." }
  ]
}
```

- 4 to 15 words, starting with a capital letter and ending with `.` `?` or `!`
- `hint` is optional (tense, topic…)
- Avoid sentences with more than one correct order ("Yesterday I went…" /
  "I went … yesterday"): only your exact order is accepted.

### Error Hunter `info.json`

The player sees a sentence with **one** mistake and taps it. Then the app shows
the corrected sentence and your explanation.
Full example: [`public/errorhunter/1802038-5555/info.json`](public/errorhunter/1802038-5555/info.json)

```json
{
  "user": { "username": "Ana Gómez", "profileImage": "https://…", "socialNetwork": "tiktok", "socialLink": "@ana_gomez" },
  "errors": [
    {
      "sentence": "She don't like coffee in the morning.",
      "wrong": "don't",
      "correct": "doesn't",
      "explanation": "With he, she and it we use doesn't in the present simple."
    }
  ]
}
```

- `wrong` must appear **exactly once** in the sentence, as whole word(s). It
  can be two words: `"wrong": "more taller"`.
- `correct` replaces `wrong`; `explanation` is one short sentence.
- 3 to 25 words, starting with a capital letter and ending with `.` `?` or `!`

### Vocabulary puzzle `info.json`

```json
{
  "user": { "username": "Ana Gómez", "profileImage": "https://…", "socialNetwork": "tiktok", "socialLink": "@ana_gomez" },
  "words": [
    { "id": 1, "en": "cat",  "es": "gato" },
    { "id": 2, "en": "dog",  "es": "perro" },
    { "id": 3, "en": "bird", "es": "pájaro" },
    { "id": 4, "en": "fish", "es": "pez" }
  ]
}
```

### Rules (checked automatically)

| Field | Rule |
|---|---|
| folder name | your student code: `1234567-1234` |
| `user.username` | your name, as you want it shown |
| `user.profileImage` | an `https://` image URL. Tip: `https://github.com/<your-user>.png` |
| `user.socialNetwork` | one of `instagram`, `tiktok`, `x`, `facebook`, `linkedin`, `github`, `youtube`, `threads`, `twitch`, `discord`, `other` |
| `user.socialLink` | your handle on that network, e.g. `@ana_gomez` |
| questions / sentences | at least **3** per file. Quiz questions need exactly **4 different** options |
| `answer` | must be **exactly** one of the options (same spelling and capitals) |
| originality | no question repeated in your file or copied from a classmate |
| vocabulary | exactly **4** pairs, unique `id`s, `en` and `es` not empty |
| templates | replace every placeholder ("Your Name", "option A", …) |
| location | exactly `public/<topic>/<student-code>/info.json` (lowercase `info.json`, nothing else in the folder) |
| keys | only the keys shown in the examples; a typo like `socialnetwork` is reported with a suggestion |
| image | a direct image link, not a profile page (`https://github.com/ana.png`, not `https://github.com/ana`) |
| `topic` | in quizzes, the name of the folder: `"second conditional"` inside `public/secondconditional` |
| same name | your `username` must be the same in every file you contribute |
| others' work | a PR must not delete or move a classmate's folder |

Before opening your PR:

```bash
npm test                       # all content + app tests
npm run check:contribution     # strict rules for the files YOU changed
```

`check:contribution` also shows **grammar hints** (⚠️ warnings, made offline
with [Harper](https://writewithharper.com)) for the sentences you added: the
question with the blank filled with the answer, your sentences, corrections
and explanations. They never block your PR, and sometimes they are wrong:
read each one and fix it only if it is a real mistake. The professor can see
hints for all the content with `npm run check:grammar`.

## 3. Code contributions

1. Pick an issue labeled **good first issue** (or propose one) and comment
   that you are taking it.
2. Keep the PR small: one problem per PR.
3. Add or update tests in `src/__tests__/`:
   - `unit/` for pure functions (helpers, rules)
   - `components/` for React components (Testing Library)
4. Run everything the pipeline runs:

```bash
npm run ci     # lint + tests + build
```

### Project map

| Path | What lives there |
|---|---|
| `src/config/topics.js` | **the list of topics** (quizzes and games): add one entry here to create a new topic |
| `src/config/contentTypes.js` | each kind of activity (quiz, sentence-builder, error-hunter, vocabulary): its rules, counting and template |
| `src/games/sentenceTools.js` | word helpers shared by the games and the validation |
| `src/components/Games/` | `RoundGame` (shared round/score frame), `SentenceBuilderItem`, `ErrorHunterItem` |
| `src/config/socialNetworks.js` | allowed social networks and how profile links are built |
| `src/validation/contentRules.js` | the rules for `info.json` (used by tests, the pipeline and the Contribute page) |
| `src/components/Quiz/QuizCard.jsx` | the quiz game |
| `src/components/Contributor/ContributorCard.jsx` | how a student is credited (name, code, social) |
| `src/components/modules/VocabularyMemoryModule.jsx` | the memory puzzle game |
| `src/pages/` | Home, Activity (plays any topic), Contributors, Contribute, Vocabulary puzzle |
| `src/store/` | Redux: quiz topics load on demand, vocabulary at startup |
| `src/validation/contributionCheck.js` | the logic of the PR check (file locations, deletions, copies, report) |
| `scripts/` | `check-contribution.mjs` (PR check) and `new-contribution.mjs` (scaffolder) |

### Ideas for good first issues

- Add a new social network (icon + URL) in `socialNetworks.js` and `ContributorCard.jsx`, with tests.
- Show the correct answer streak (🔥 3 in a row!) in `QuizCard`.
- Add a "difficulty" filter on the home page using the `level` field.
- Keyboard shortcuts (1–4) to answer quiz questions.
- Dark mode toggle.
- Save the best score per topic in `localStorage`.
- Make the memory game show which pairs were wrong at the end.
- Add a new topic (e.g. *Passive Voice*, *Reported Speech*) with 5 sample questions.
- Add a new game type: an entry in `contentTypes.js`, an item component for
  `RoundGame` and a topic in `topics.js` (see Sentence Builder as a model).

## 4. Pull request flow

See the [README](README.md) for the fork + group branch flow. In short:

```
your branch  ──PR──▶  feature/GroupN (your fork)  ──PR──▶  develop (professor)  ──▶  main (deploy)
```

Only **develop** accepts pull requests from your branches or forks. Pull
requests to **main** are only accepted from `develop` (the *Branch policy /
PR source* check fails otherwise).

Every PR runs the **CI** pipeline:

| Check | What it verifies |
|---|---|
| Contribution check | strict rules on the `info.json` files you changed + summary table (who, code, network, # questions) |
| Lint | ESLint |
| Tests | content of the whole repo, helpers, components (with coverage) |
| Build | the app compiles |

A red check means the PR cannot be merged. Open the failed job: the message
says which file and which rule to fix.
