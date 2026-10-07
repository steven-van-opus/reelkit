/**
 * Refero Styles is one product (styles.refero.design). The live ranking URL
 * is /resources/refero-styles-resource. A second catalog row for the same
 * site — historically /resources/refero-styles — is a clone and must not
 * be ingested again.
 *
 * The main Refero screen library (refero.design, id `refero`) is a
 * different product and is never treated as a Styles listing.
 */

export const REFERO_STYLES_CANONICAL_ID = 'refero-styles-resource';
export const REFERO_GALLERY_ID = 'refero';

const STYLES_HOSTS = new Set(['styles.refero.design']);

function hostFromValue(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  try {
    const host = (raw.includes('://') ? new URL(raw).hostname : raw.split('/')[0])
      .replace(/^www\./i, '')
      .toLowerCase();
    return host;
  } catch {
    return '';
  }
}

export function referoStylesHosts(listing = {}) {
  return [
    listing.url,
    listing.website,
    listing.displayDomain,
    listing.domain,
  ].map(hostFromValue).filter(Boolean);
}

export function isReferoStylesWebsite(listing = {}) {
  const hosts = referoStylesHosts(listing);
  if (hosts.some((host) => STYLES_HOSTS.has(host))) return true;
  const title = String(listing.title || '').trim().toLowerCase();
  return title === 'refero styles';
}

/** True for any extra Refero Styles row. The canonical id and the gallery stay. */
export function isReferoStylesClone(listing) {
  if (!listing || !listing.id) return false;
  if (listing.id === REFERO_STYLES_CANONICAL_ID) return false;
  if (listing.id === REFERO_GALLERY_ID) return false;
  return isReferoStylesWebsite(listing);
}
