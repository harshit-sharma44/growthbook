import {
  MAX_SAVED_VIEWS_PER_USER,
  MAX_SAVED_VIEW_NAME_LENGTH,
  MAX_SAVED_VIEW_QUERY_LENGTH,
} from "shared/constants";

type NamedView = { id: string; name: string };

export const SAVED_VIEW_ERRORS = {
  nameRequired: "Name is required.",
  nameTooLong: `Name must be ${MAX_SAVED_VIEW_NAME_LENGTH} characters or fewer.`,
  duplicateName: (existingName: string) =>
    `You already have a saved view named "${existingName}".`,
  queryRequired: "There is no search to save.",
  queryTooLong: `The search is too long to save (${MAX_SAVED_VIEW_QUERY_LENGTH} characters max).`,
  tooMany: `You can save up to ${MAX_SAVED_VIEWS_PER_USER} views. Delete one to save another.`,
} as const;

export function normalizeSavedViewName(name: string): string {
  return name.trim().toLowerCase();
}

/** Another of the user's views with the same name, ignoring the one being renamed. */
export function findDuplicateSavedView<T extends NamedView>(
  name: string,
  views: T[],
  excludeId: string | null,
): T | null {
  const normalized = normalizeSavedViewName(name);
  return (
    views.find(
      (v) =>
        v.id !== excludeId && normalizeSavedViewName(v.name) === normalized,
    ) ?? null
  );
}

export function validateSavedViewName(
  name: string,
  views: NamedView[],
  excludeId: string | null,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return SAVED_VIEW_ERRORS.nameRequired;
  if (trimmed.length > MAX_SAVED_VIEW_NAME_LENGTH) {
    return SAVED_VIEW_ERRORS.nameTooLong;
  }
  const duplicate = findDuplicateSavedView(trimmed, views, excludeId);
  if (duplicate) return SAVED_VIEW_ERRORS.duplicateName(duplicate.name.trim());
  return null;
}

export function validateSavedViewQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return SAVED_VIEW_ERRORS.queryRequired;
  if (trimmed.length > MAX_SAVED_VIEW_QUERY_LENGTH) {
    return SAVED_VIEW_ERRORS.queryTooLong;
  }
  return null;
}

/** Checks a new view against the user's existing views. Returns the first error, or null. */
export function validateNewSavedView(
  view: { name: string; query: string },
  existingViews: NamedView[],
): string | null {
  if (existingViews.length >= MAX_SAVED_VIEWS_PER_USER) {
    return SAVED_VIEW_ERRORS.tooMany;
  }
  return (
    validateSavedViewName(view.name, existingViews, null) ??
    validateSavedViewQuery(view.query)
  );
}

export function sortSavedViews<T extends { name: string }>(views: T[]): T[] {
  return [...views].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** The saved view whose search is exactly the current search box text. */
export function findSavedViewForQuery<T extends { query: string }>(
  views: T[],
  query: string,
): T | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return views.find((v) => v.query === trimmed) ?? null;
}
