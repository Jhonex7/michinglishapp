import { getTopicById } from '../config/topics.js';
import { CONTENT_TYPES, getContentType } from '../config/contentTypes.js';

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
  if (profile.kind === 'vocabulary') return { user, ...CONTENT_TYPES.vocabulary.template() };
  const topic = getTopicById(profile.topic);
  return { user, ...getContentType(topic?.type).template(topic ? topic.title : profile.topic) };
};

/** Where the student must save the file inside the repo. */
export const buildFilePath = (profile) => {
  const code = profile.studentCode.trim() || '<your-student-code>';
  if (profile.kind === 'vocabulary') return `public/vocabulary/${profile.topic}/${code}/info.json`;
  const folder = getTopicById(profile.topic)?.folder || profile.topic;
  return `public/${folder}/${code}/info.json`;
};
