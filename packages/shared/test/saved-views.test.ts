import {
  SAVED_VIEW_ERRORS,
  findDuplicateSavedView,
  findSavedViewForQuery,
  normalizeSavedViewName,
  sortSavedViews,
  validateNewSavedView,
  validateSavedViewName,
  validateSavedViewQuery,
} from "../src/util/saved-views";

const view = (id: string, name: string, query = "checkout") => ({
  id,
  name,
  query,
});

describe("normalizeSavedViewName / findDuplicateSavedView", () => {
  it("trims and lowercases", () => {
    expect(normalizeSavedViewName("  Checkout FLAGS ")).toBe("checkout flags");
  });

  it("finds another view with the same name", () => {
    const views = [view("1", "Checkout flags"), view("2", "Search")];
    expect(findDuplicateSavedView("checkout FLAGS", views, null)?.id).toBe("1");
    expect(findDuplicateSavedView(" Checkout flags ", views, null)?.id).toBe(
      "1",
    );
    expect(findDuplicateSavedView("Checkout", views, null)).toBeNull();
  });

  it("ignores the view being renamed", () => {
    const views = [view("1", "Checkout flags")];
    expect(findDuplicateSavedView("CHECKOUT FLAGS", views, "1")).toBeNull();
  });
});

describe("validateSavedViewName", () => {
  it("requires a name after trimming", () => {
    expect(validateSavedViewName("", [], null)).toBe("Name is required.");
    expect(validateSavedViewName("   ", [], null)).toBe(
      SAVED_VIEW_ERRORS.nameRequired,
    );
  });

  it("limits the name to 50 characters", () => {
    expect(validateSavedViewName("a".repeat(50), [], null)).toBeNull();
    expect(validateSavedViewName("a".repeat(51), [], null)).toBe(
      "Name must be 50 characters or fewer.",
    );
  });

  it("reports a duplicate with the existing view's name", () => {
    const views = [view("1", "Checkout flags")];
    expect(validateSavedViewName("checkout FLAGS", views, null)).toBe(
      'You already have a saved view named "Checkout flags".',
    );
    expect(validateSavedViewName(" Checkout flags ", views, null)).toBe(
      'You already have a saved view named "Checkout flags".',
    );
  });

  it("allows renaming a view to a different case of its own name", () => {
    const views = [view("1", "Checkout flags"), view("2", "Search")];
    expect(validateSavedViewName("CHECKOUT flags", views, "1")).toBeNull();
    expect(validateSavedViewName("search", views, "1")).toBe(
      'You already have a saved view named "Search".',
    );
  });
});

describe("validateSavedViewQuery", () => {
  it("requires a search", () => {
    expect(validateSavedViewQuery("")).toBe("There is no search to save.");
    expect(validateSavedViewQuery("  ")).toBe(SAVED_VIEW_ERRORS.queryRequired);
  });

  it("limits the search to 500 characters", () => {
    expect(validateSavedViewQuery("a".repeat(500))).toBeNull();
    expect(validateSavedViewQuery("a".repeat(501))).toBe(
      "The search is too long to save (500 characters max).",
    );
  });
});

describe("validateNewSavedView", () => {
  it("accepts a valid view", () => {
    expect(
      validateNewSavedView(
        { name: "Checkout flags", query: "tag:checkout" },
        [],
      ),
    ).toBeNull();
  });

  it("allows the 20th view but not a 21st", () => {
    const nineteen = Array.from({ length: 19 }, (_, i) =>
      view(String(i), `View ${i}`),
    );
    expect(
      validateNewSavedView({ name: "New", query: "checkout" }, nineteen),
    ).toBeNull();
    const twenty = [...nineteen, view("19", "View 19")];
    expect(
      validateNewSavedView({ name: "New", query: "checkout" }, twenty),
    ).toBe("You can save up to 20 views. Delete one to save another.");
  });

  it("checks the name before the search", () => {
    expect(validateNewSavedView({ name: "", query: "" }, [])).toBe(
      SAVED_VIEW_ERRORS.nameRequired,
    );
    expect(validateNewSavedView({ name: "A", query: "" }, [])).toBe(
      SAVED_VIEW_ERRORS.queryRequired,
    );
  });
});

describe("sortSavedViews", () => {
  it("sorts A-Z ignoring case, without mutating the input", () => {
    const views = [
      view("1", "zebra"),
      view("2", "Apple"),
      view("3", "banana"),
      view("4", "Cherry"),
    ];
    expect(sortSavedViews(views).map((v) => v.name)).toEqual([
      "Apple",
      "banana",
      "Cherry",
      "zebra",
    ]);
    expect(views[0].name).toBe("zebra");
  });
});

describe("findSavedViewForQuery", () => {
  const views = [
    view("1", "Checkout", "tag:checkout"),
    view("2", "S", "search"),
  ];

  it("matches the exact search text", () => {
    expect(findSavedViewForQuery(views, "tag:checkout")?.id).toBe("1");
    expect(findSavedViewForQuery(views, " tag:checkout ")?.id).toBe("1");
  });

  it("does not match a partial or empty search", () => {
    expect(findSavedViewForQuery(views, "tag:check")).toBeNull();
    expect(findSavedViewForQuery(views, "")).toBeNull();
  });
});
