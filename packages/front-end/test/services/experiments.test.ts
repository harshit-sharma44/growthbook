import { describe, expect, it } from "vitest";
import type { ExperimentInterfaceStringDates } from "shared/types/experiment";
import {
  convertExperimentToTemplate,
  experimentDateOrNull,
} from "@/services/experiments";

describe("convertExperimentToTemplate", () => {
  it("stores a legacy experiment's resolved identifier type", () => {
    const experiment = {
      name: "Checkout",
      datasource: "ds_1",
      exposureQueryId: "eq_1",
      phases: [{ coverage: 1, condition: "" }],
    } as unknown as ExperimentInterfaceStringDates;

    const template = convertExperimentToTemplate(experiment, {
      userIdType: "anonymous_id",
      userIdTypes: ["user_id", "anonymous_id"],
    });
    expect(template.exposureQueryIdentifierType).toBe("anonymous_id");
  });
});

describe("experimentDateOrNull", () => {
  const stopped = (dateEnded: string | undefined) =>
    ({
      archived: false,
      status: "stopped",
      dateCreated: "2026-08-01T00:00:00Z",
      dateUpdated: "2026-09-15T00:00:00Z",
      phases: [{ dateStarted: "2026-09-01T00:00:00Z", dateEnded }],
    }) as unknown as ExperimentInterfaceStringDates;

  it("returns the last phase end date for a stopped experiment", () => {
    expect(experimentDateOrNull(stopped("2026-09-10T00:00:00Z"))).toBe(
      "2026-09-10T00:00:00Z",
    );
  });

  it("returns null for a stopped experiment with no end date", () => {
    expect(experimentDateOrNull(stopped(undefined))).toBeNull();
    expect(experimentDateOrNull(stopped(""))).toBeNull();
  });

  it("uses dateUpdated for archived experiments", () => {
    const exp = { ...stopped(undefined), archived: true };
    expect(experimentDateOrNull(exp)).toBe("2026-09-15T00:00:00Z");
  });
});
