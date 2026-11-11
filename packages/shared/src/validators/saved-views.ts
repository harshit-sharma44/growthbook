import { z } from "zod";
import {
  MAX_SAVED_VIEW_NAME_LENGTH,
  MAX_SAVED_VIEW_QUERY_LENGTH,
} from "shared/constants";
import { baseSchema } from "./base-model";

// An enum so saved views can be added to other list pages later.
export const savedViewPages = ["features"] as const;
export const savedViewPageValidator = z.enum(savedViewPages);
export type SavedViewPage = z.infer<typeof savedViewPageValidator>;

export const savedViewValidator = baseSchema
  .safeExtend({
    userId: z.string(),
    page: savedViewPageValidator,
    name: z.string().max(MAX_SAVED_VIEW_NAME_LENGTH),
    query: z.string().max(MAX_SAVED_VIEW_QUERY_LENGTH),
  })
  .strict();
export type SavedViewInterface = z.infer<typeof savedViewValidator>;

// Lengths are checked by the shared helpers so callers get the exact messages.
export const getSavedViewsQueryValidator = z.object({
  page: savedViewPageValidator,
});

export const createSavedViewBodyValidator = z
  .object({
    page: savedViewPageValidator,
    name: z.string(),
    query: z.string(),
  })
  .strict();
export type CreateSavedViewBody = z.infer<typeof createSavedViewBodyValidator>;

export const updateSavedViewBodyValidator = z
  .object({ name: z.string() })
  .strict();
export type UpdateSavedViewBody = z.infer<typeof updateSavedViewBodyValidator>;
