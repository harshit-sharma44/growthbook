import {
  SavedViewInterface,
  SavedViewPage,
  savedViewValidator,
} from "shared/validators";
import { validateNewSavedView, validateSavedViewName } from "shared/util";
import { BadRequestError } from "back-end/src/util/errors";
import { MakeModelClass } from "./BaseModel";

const BaseClass = MakeModelClass({
  schema: savedViewValidator,
  collectionName: "savedviews",
  idPrefix: "sv_",
  globallyUniquePrimaryKeys: true,
  readonlyFields: ["userId", "page"],
  additionalIndexes: [{ fields: { organization: 1, userId: 1, page: 1 } }],
});

// Saved views are personal: only the user who saved one can see or change it.
export class SavedViewModel extends BaseClass {
  private ownedByCurrentUser(doc: SavedViewInterface): boolean {
    return !!this.context.userId && doc.userId === this.context.userId;
  }
  protected canCreate(doc: SavedViewInterface): boolean {
    return this.ownedByCurrentUser(doc);
  }
  protected canRead(doc: SavedViewInterface): boolean {
    return this.ownedByCurrentUser(doc);
  }
  protected canUpdate(existing: SavedViewInterface): boolean {
    return this.ownedByCurrentUser(existing);
  }
  protected canDelete(existing: SavedViewInterface): boolean {
    return this.ownedByCurrentUser(existing);
  }

  public getAllForCurrentUser(page: SavedViewPage) {
    return this._find({ userId: this.context.userId, page });
  }

  // Checked here rather than in a hook: the schema's own length limits would
  // otherwise reject first, without the exact messages.
  public async createForCurrentUser({
    page,
    name,
    query,
  }: {
    page: SavedViewPage;
    name: string;
    query: string;
  }) {
    const existing = await this.getAllForCurrentUser(page);
    const error = validateNewSavedView({ name, query }, existing);
    if (error) throw new BadRequestError(error);
    return this.create({
      userId: this.context.userId,
      page,
      name: name.trim(),
      query: query.trim(),
    });
  }

  public async rename(view: SavedViewInterface, name: string) {
    const existing = await this.getAllForCurrentUser(view.page);
    const error = validateSavedViewName(name, existing, view.id);
    if (error) throw new BadRequestError(error);
    return this.update(view, { name: name.trim() });
  }
}
