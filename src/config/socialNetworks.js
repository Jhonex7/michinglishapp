// Social networks a student can choose as "favorite" in their info.json
// (`user.socialNetwork`). Keep this file free of React imports: it is also
// used by the Node validation script that runs in the PR pipeline.

export const SOCIAL_NETWORKS = {
  instagram: { label: 'Instagram', url: (h) => `https://www.instagram.com/${h}` },
  tiktok: { label: 'TikTok', url: (h) => `https://www.tiktok.com/@${h}` },
  x: { label: 'X (Twitter)', url: (h) => `https://x.com/${h}` },
  facebook: { label: 'Facebook', url: (h) => `https://www.facebook.com/${h}` },
  linkedin: { label: 'LinkedIn', url: (h) => `https://www.linkedin.com/in/${h}` },
  github: { label: 'GitHub', url: (h) => `https://github.com/${h}` },
  youtube: { label: 'YouTube', url: (h) => `https://www.youtube.com/@${h}` },
  threads: { label: 'Threads', url: (h) => `https://www.threads.net/@${h}` },
  twitch: { label: 'Twitch', url: (h) => `https://www.twitch.tv/${h}` },
  discord: { label: 'Discord', url: null },
  other: { label: 'Other', url: null },
};

export const SOCIAL_NETWORK_IDS = Object.keys(SOCIAL_NETWORKS);

const HANDLE_PATTERN = /^[\p{L}\p{N}._-]{1,40}$/u;

const DOMAIN_TO_NETWORK = [
  ['instagram.com', 'instagram'],
  ['tiktok.com', 'tiktok'],
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['facebook.com', 'facebook'],
  ['linkedin.com', 'linkedin'],
  ['github.com', 'github'],
  ['youtube.com', 'youtube'],
  ['threads.net', 'threads'],
  ['twitch.tv', 'twitch'],
];

const detectNetworkFromText = (text) => {
  const lower = text.toLowerCase();
  const match = DOMAIN_TO_NETWORK.find(([domain]) =>
    new RegExp(`(^|[/.@])${domain.replace('.', '\\.')}(/|$)`).test(lower),
  );
  return match ? match[1] : null;
};

/**
 * Accepts the many shapes students have used for `socialLink`
 * ("@handle", "handle", "@github.com/handle", "https://github.com/handle")
 * and returns a clean handle without "@" or URL parts.
 */
export const normalizeHandle = (socialLink) => {
  if (typeof socialLink !== 'string') return '';
  let value = socialLink.trim();
  if (detectNetworkFromText(value) || /^https?:\/\//i.test(value)) {
    value = value.replace(/^@/, '').replace(/^https?:\/\//i, '').replace(/[?#].*$/, '');
    const parts = value.split('/').filter(Boolean);
    value = parts.length > 1 ? parts[parts.length - 1] : '';
  }
  return value.replace(/^@+/, '');
};

export const isValidHandle = (handle) => HANDLE_PATTERN.test(handle);

/**
 * Builds the public social profile for a student.
 * Returns { network, label, handle, url }. `url` is null when we cannot build
 * a safe link (unknown network or a handle with unexpected characters).
 */
export const resolveSocialProfile = (socialNetwork, socialLink) => {
  const declared = typeof socialNetwork === 'string' ? socialNetwork.trim().toLowerCase() : '';
  const inferred = typeof socialLink === 'string' ? detectNetworkFromText(socialLink) : null;
  const network = SOCIAL_NETWORKS[declared] ? declared : inferred || 'other';
  const handle = normalizeHandle(socialLink);
  const { label, url } = SOCIAL_NETWORKS[network];
  const safeUrl = url && isValidHandle(handle) ? url(encodeURIComponent(handle)) : null;
  return { network, label, handle, url: safeUrl };
};
