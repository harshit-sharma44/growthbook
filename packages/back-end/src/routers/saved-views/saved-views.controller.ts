import { Response } from "express";
import {
  CreateSavedViewBody,
  SavedViewInterface,
  SavedViewPage,
  UpdateSavedViewBody,
} from "shared/validators";
import { AuthRequest } from "back-end/src/types/AuthRequest";
import { getContextFromReq } from "back-end/src/services/organizations";

type SavedViewResponse =
  | { status: 200; savedView: SavedViewInterface }
  | { status: 404; message: string };

const NOT_FOUND = { status: 404, message: "Saved view not found" } as const;

// GET /saved-views?page=features
export const getSavedViews = async (
  req: AuthRequest<null, Record<string, never>, { page: SavedViewPage }>,
  res: Response<{ status: 200; savedViews: SavedViewInterface[] }>,
) => {
  const context = getContextFromReq(req);
  const savedViews = await context.models.savedViews.getAllForCurrentUser(
    req.query.page,
  );
  res.status(200).json({ status: 200, savedViews });
};

// POST /saved-views
export const postSavedView = async (
  req: AuthRequest<CreateSavedViewBody>,
  res: Response<SavedViewResponse>,
) => {
  const context = getContextFromReq(req);
  const savedView = await context.models.savedViews.createForCurrentUser(
    req.body,
  );
  res.status(200).json({ status: 200, savedView });
};

// PUT /saved-views/:id
export const putSavedView = async (
  req: AuthRequest<UpdateSavedViewBody, { id: string }>,
  res: Response<SavedViewResponse>,
) => {
  const context = getContextFromReq(req);
  const existing = await context.models.savedViews.getById(req.params.id);
  if (!existing) return res.status(404).json(NOT_FOUND);
  const savedView = await context.models.savedViews.rename(
    existing,
    req.body.name,
  );
  res.status(200).json({ status: 200, savedView });
};

// DELETE /saved-views/:id
export const deleteSavedView = async (
  req: AuthRequest<null, { id: string }>,
  res: Response<{ status: 200 } | { status: 404; message: string }>,
) => {
  const context = getContextFromReq(req);
  const existing = await context.models.savedViews.getById(req.params.id);
  if (!existing) return res.status(404).json(NOT_FOUND);
  await context.models.savedViews.delete(existing);
  res.status(200).json({ status: 200 });
};
