import express from "express";
import {
  createSavedViewBodyValidator,
  getSavedViewsQueryValidator,
  updateSavedViewBodyValidator,
} from "shared/validators";
import { wrapController } from "back-end/src/routers/wrapController";
import { validateRequestMiddleware } from "back-end/src/routers/utils/validateRequestMiddleware";
import * as rawController from "./saved-views.controller";

const router = express.Router();
const ctrl = wrapController(rawController);

router.get(
  "/",
  validateRequestMiddleware({ query: getSavedViewsQueryValidator }),
  ctrl.getSavedViews,
);
router.post(
  "/",
  validateRequestMiddleware({ body: createSavedViewBodyValidator }),
  ctrl.postSavedView,
);
router.put(
  "/:id",
  validateRequestMiddleware({ body: updateSavedViewBodyValidator }),
  ctrl.putSavedView,
);
router.delete("/:id", ctrl.deleteSavedView);

export { router as savedViewsRouter };
