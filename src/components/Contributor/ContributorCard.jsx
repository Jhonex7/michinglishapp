import { useState } from 'react';
import {
  FaInstagram, FaTiktok, FaXTwitter, FaFacebook, FaLinkedin, FaGithub,
  FaYoutube, FaThreads, FaTwitch, FaDiscord, FaUser,
} from 'react-icons/fa6';

const NETWORK_ICONS = {
  instagram: FaInstagram,
  tiktok: FaTiktok,
  x: FaXTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  github: FaGithub,
  youtube: FaYoutube,
  threads: FaThreads,
  twitch: FaTwitch,
  discord: FaDiscord,
  other: FaUser,
};

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const Avatar = ({ contributor, size = 56 }) => {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: size / 2.6 };

  if (!contributor.profileImage || failed) {
    return (
      <span className="avatar-fallback" style={style} aria-hidden="true">
        {initials(contributor.name) || '🐱'}
      </span>
    );
  }
  return (
    <img
      className="avatar"
      style={style}
      src={contributor.profileImage}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};

export const SocialHandle = ({ social }) => {
  const Icon = NETWORK_ICONS[social.network] || FaUser;
  if (!social.handle) return null;
  const content = (
    <>
      <Icon aria-hidden="true" className="me-1" />
      <span className="visually-hidden">{social.label}: </span>@{social.handle}
    </>
  );
  return social.url ? (
    <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
      {content}
    </a>
  ) : (
    <span>{content}</span>
  );
};

/**
 * Credits the student who wrote a question / puzzle.
 * variant="inline": compact row (inside a quiz). variant="stacked": centered.
 */
const ContributorCard = ({ contributor, label, variant = 'inline' }) => {
  if (!contributor) return null;
  const stacked = variant === 'stacked';

  return (
    <div
      className={stacked ? 'text-center' : 'd-flex align-items-center gap-3 text-start'}
      data-testid="contributor-card"
    >
      <Avatar contributor={contributor} size={stacked ? 80 : 48} />
      <div className={stacked ? 'mt-2' : ''}>
        {label && <div className="text-muted small text-uppercase fw-semibold">{label}</div>}
        <div className="fw-bold">{contributor.name}</div>
        <div className="small d-flex flex-wrap gap-2 align-items-center justify-content-center justify-content-md-start">
          {contributor.code && (
            <span className="contributor-code badge text-bg-light border" title="Student code">
              {contributor.code}
            </span>
          )}
          <SocialHandle social={contributor.social} />
        </div>
      </div>
    </div>
  );
};

export default ContributorCard;
