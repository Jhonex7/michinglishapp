import { getTopicById } from '../config/topics.js';

export const EMPTY_PROFILE = {
  kind: 'quiz',
  topic: 'verbs',
  username: '',
  studentCode: '',
  profileImage: '',
  socialNetwork: 'instagram',
  socialLink: '',
};

export const buildUserBlock = (profile) => ({
  username: profile.username.trim(),
  profileImage: profile.profileImage.trim(),
  socialNetwork: profile.socialNetwork,
  socialLink: profile.socialLink.trim() ? `@${profile.socialLink.trim().replace(/^@+/, '')}` : '',
});

/** Starter info.json for the chosen kind of contribution. */
export const buildInfoTemplate = (profile) => {
  const user = buildUserBlock(profile);
  if (profile.kind === 'vocabulary') {
    return {
      user,
      words: [
        { id: 1, en: 'english word 1', es: 'palabra 1' },
        { id: 2, en: 'english word 2', es: 'palabra 2' },
        { id: 3, en: 'english word 3', es: 'palabra 3' },
        { id: 4, en: 'english word 4', es: 'palabra 4' },
      ],
    };
  }
  const topic = getTopicById(profile.topic);
  return {
    user,
    topics: [
      {
        topic: topic ? topic.title.toLowerCase() : profile.topic,
        questions: [
          {
            question: 'Write your question here. Use _____ for the blank.',
            options: ['option A', 'option B', 'option C', 'option D'],
            answer: 'option A',
          },
        ],
      },
    ],
  };
};

/** Where the student must save the file inside the repo. */
export const buildFilePath = (profile) => {
  const code = profile.studentCode.trim() || '<your-student-code>';
  if (profile.kind === 'vocabulary') return `public/vocabulary/${profile.topic}/${code}/info.json`;
  const folder = getTopicById(profile.topic)?.folder || profile.topic;
  return `public/${folder}/${code}/info.json`;
};
