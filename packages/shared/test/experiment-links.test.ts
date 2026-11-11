import {
  EXPERIMENT_LINK_ERRORS,
  getExperimentLinkHost,
  isValidExperimentLinkUrl,
  normalizeExperimentLinkUrl,
  validateExperimentLink,
  validateExperimentLinks,
} from "../src/util/experiment-links";

const httpsUrlOfLength = (length: number) =>
  "https://example.com/" + "a".repeat(length - "https://example.com/".length);

const link = (id: string, url: string, label = "Spec") => ({ id, label, url });

describe("isValidExperimentLinkUrl", () => {
  it("accepts absolute http and https URLs", () => {
    expect(isValidExperimentLinkUrl("http://example.com")).toBe(true);
    expect(isValidExperimentLinkUrl("https://example.com/path?x=1")).toBe(true);
    expect(isValidExperimentLinkUrl("HTTPS://Example.com")).toBe(true);
  });

  it("rejects URLs without an http(s) scheme or host", () => {
    expect(isValidExperimentLinkUrl("docs.google.com/abc")).toBe(false);
    expect(isValidExperimentLinkUrl("ftp://example.com")).toBe(false);
    expect(isValidExperimentLinkUrl("not a url")).toBe(false);
    expect(isValidExperimentLinkUrl("https://")).toBe(false);
    expect(isValidExperimentLinkUrl("javascript:alert(1)")).toBe(false);
    expect(isValidExperimentLinkUrl("mailto:a@example.com")).toBe(false);
  });
});

describe("normalizeExperimentLinkUrl / getExperimentLinkHost", () => {
  it("trims and lowercases", () => {
    expect(normalizeExperimentLinkUrl("  HTTPS://Example.com/A  ")).toBe(
      "https://example.com/a",
    );
  });

  it("returns the host name", () => {
    expect(
      getExperimentLinkHost("https://docs.google.com/document/d/abc"),
    ).toBe("docs.google.com");
    expect(getExperimentLinkHost("not a url")).toBe("");
  });
});

describe("validateExperimentLink", () => {
  it("accepts a valid link", () => {
    expect(
      validateExperimentLink(
        {
          label: "Product spec",
          url: "https://docs.google.com/document/d/abc",
        },
        [],
        null,
      ),
    ).toBeNull();
  });

  it("requires a label after trimming", () => {
    expect(
      validateExperimentLink({ label: "", url: "https://a.com" }, [], null),
    ).toBe(EXPERIMENT_LINK_ERRORS.labelRequired);
    expect(
      validateExperimentLink({ label: "   ", url: "https://a.com" }, [], null),
    ).toBe("Label is required.");
  });

  it("limits the label to 60 characters", () => {
    expect(
      validateExperimentLink(
        { label: "a".repeat(60), url: "https://a.com" },
        [],
        null,
      ),
    ).toBeNull();
    expect(
      validateExperimentLink(
        { label: "a".repeat(61), url: "https://a.com" },
        [],
        null,
      ),
    ).toBe("Label must be 60 characters or fewer.");
    // Surrounding spaces are trimmed before the length check.
    expect(
      validateExperimentLink(
        { label: ` ${"a".repeat(60)} `, url: "https://a.com" },
        [],
        null,
      ),
    ).toBeNull();
  });

  it("requires a URL", () => {
    expect(validateExperimentLink({ label: "A", url: "  " }, [], null)).toBe(
      "URL is required.",
    );
  });

  it("rejects invalid URLs", () => {
    for (const url of [
      "docs.google.com/abc",
      "ftp://example.com",
      "not a url",
    ]) {
      expect(validateExperimentLink({ label: "A", url }, [], null)).toBe(
        "Enter a valid URL that starts with http:// or https://.",
      );
    }
  });

  it("limits the URL to 500 characters", () => {
    expect(httpsUrlOfLength(500)).toHaveLength(500);
    expect(
      validateExperimentLink(
        { label: "A", url: httpsUrlOfLength(500) },
        [],
        null,
      ),
    ).toBeNull();
    expect(
      validateExperimentLink(
        { label: "A", url: httpsUrlOfLength(501) },
        [],
        null,
      ),
    ).toBe("URL must be 500 characters or fewer.");
  });

  it("rejects a duplicate URL ignoring case and spaces", () => {
    const existing = [link("1", "https://example.com/Spec")];
    expect(
      validateExperimentLink(
        { label: "B", url: "  HTTPS://EXAMPLE.COM/spec " },
        existing,
        null,
      ),
    ).toBe("This link has already been added to this experiment.");
  });

  it("does not count the edited link as its own duplicate", () => {
    const existing = [
      link("1", "https://example.com/a"),
      link("2", "https://example.com/b"),
    ];
    expect(
      validateExperimentLink(
        { label: "Final spec", url: "https://example.com/a" },
        existing,
        "1",
      ),
    ).toBeNull();
    expect(
      validateExperimentLink(
        { label: "Final spec", url: "https://example.com/b" },
        existing,
        "1",
      ),
    ).toBe(EXPERIMENT_LINK_ERRORS.duplicateUrl);
  });

  it("allows a 10th link but not an 11th", () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      link(String(i), `https://example.com/${i}`),
    );
    expect(
      validateExperimentLink(
        { label: "A", url: "https://example.com/new" },
        nine,
        null,
      ),
    ).toBeNull();
    const ten = [...nine, link("9", "https://example.com/9")];
    expect(
      validateExperimentLink(
        { label: "A", url: "https://example.com/new" },
        ten,
        null,
      ),
    ).toBe("An experiment can have at most 10 links.");
    // Editing one of the ten is still allowed.
    expect(
      validateExperimentLink(
        { label: "Renamed", url: "https://example.com/0" },
        ten,
        "0",
      ),
    ).toBeNull();
  });
});

describe("validateExperimentLinks", () => {
  it("trims every link and keeps the order", () => {
    expect(
      validateExperimentLinks([
        link("1", " https://example.com/a ", " A "),
        link("2", "https://example.com/b", "B"),
      ]),
    ).toEqual({
      error: null,
      links: [
        link("1", "https://example.com/a", "A"),
        link("2", "https://example.com/b", "B"),
      ],
    });
  });

  it("returns the first error", () => {
    expect(
      validateExperimentLinks([
        link("1", "https://example.com/a"),
        link("2", "https://EXAMPLE.com/a"),
      ]),
    ).toEqual({ links: null, error: EXPERIMENT_LINK_ERRORS.duplicateUrl });
    expect(validateExperimentLinks([link("1", "ftp://x.com")])).toEqual({
      links: null,
      error: EXPERIMENT_LINK_ERRORS.urlInvalid,
    });
  });

  it("rejects more than 10 links", () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      link(String(i), `https://example.com/${i}`),
    );
    expect(validateExperimentLinks(eleven)).toEqual({
      links: null,
      error: EXPERIMENT_LINK_ERRORS.tooMany,
    });
    expect(validateExperimentLinks(eleven.slice(0, 10)).error).toBeNull();
  });

  it("accepts an empty list", () => {
    expect(validateExperimentLinks([])).toEqual({ links: [], error: null });
  });
});
