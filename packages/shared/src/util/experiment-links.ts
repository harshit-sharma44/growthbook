import {
  MAX_EXPERIMENT_LINKS,
  MAX_EXPERIMENT_LINK_LABEL_LENGTH,
  MAX_EXPERIMENT_LINK_URL_LENGTH,
} from "shared/constants";
import type { ExperimentLink } from "shared/validators";

export const EXPERIMENT_LINK_ERRORS = {
  labelRequired: "Label is required.",
  labelTooLong: `Label must be ${MAX_EXPERIMENT_LINK_LABEL_LENGTH} characters or fewer.`,
  urlRequired: "URL is required.",
  urlInvalid: "Enter a valid URL that starts with http:// or https://.",
  urlTooLong: `URL must be ${MAX_EXPERIMENT_LINK_URL_LENGTH} characters or fewer.`,
  duplicateUrl: "This link has already been added to this experiment.",
  tooMany: `An experiment can have at most ${MAX_EXPERIMENT_LINKS} links.`,
} as const;

export function isValidExperimentLinkUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function normalizeExperimentLinkUrl(url: string): string {
  return url.trim().toLowerCase();
}

export function getExperimentLinkHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Validates one link being added (`editingId` null) or edited against the
 * experiment's other links. Returns the first error message, or null.
 */
export function validateExperimentLink(
  link: { label: string; url: string },
  existingLinks: Pick<ExperimentLink, "id" | "url">[],
  editingId: string | null,
): string | null {
  const label = link.label.trim();
  const url = link.url.trim();

  if (!label) return EXPERIMENT_LINK_ERRORS.labelRequired;
  if (label.length > MAX_EXPERIMENT_LINK_LABEL_LENGTH) {
    return EXPERIMENT_LINK_ERRORS.labelTooLong;
  }
  if (!url) return EXPERIMENT_LINK_ERRORS.urlRequired;
  if (url.length > MAX_EXPERIMENT_LINK_URL_LENGTH) {
    return EXPERIMENT_LINK_ERRORS.urlTooLong;
  }
  if (!isValidExperimentLinkUrl(url)) return EXPERIMENT_LINK_ERRORS.urlInvalid;

  const others = existingLinks.filter((l) => l.id !== editingId);
  const normalized = normalizeExperimentLinkUrl(url);
  if (others.some((l) => normalizeExperimentLinkUrl(l.url) === normalized)) {
    return EXPERIMENT_LINK_ERRORS.duplicateUrl;
  }
  if (editingId === null && others.length >= MAX_EXPERIMENT_LINKS) {
    return EXPERIMENT_LINK_ERRORS.tooMany;
  }
  return null;
}

/**
 * Validates and trims a full list of links, as sent on every add, edit or
 * delete. Returns the trimmed list, or the first error message.
 */
export function validateExperimentLinks(
  links: ExperimentLink[],
): { links: ExperimentLink[]; error: null } | { links: null; error: string } {
  if (links.length > MAX_EXPERIMENT_LINKS) {
    return { links: null, error: EXPERIMENT_LINK_ERRORS.tooMany };
  }
  const trimmed: ExperimentLink[] = [];
  for (const link of links) {
    const error = validateExperimentLink(link, trimmed, null);
    if (error) return { links: null, error };
    trimmed.push({
      id: link.id,
      label: link.label.trim(),
      url: link.url.trim(),
    });
  }
  return { links: trimmed, error: null };
}
