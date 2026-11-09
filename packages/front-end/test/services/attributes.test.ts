import { FeatureInterface } from "back-end/src/validators/features";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { getAttributeReferences } from "@/services/attributes";

type Experiment = Pick<
  ExperimentInterfaceStringDates,
  "id" | "phases" | "hashAttribute" | "fallbackAttribute"
>;
type Feature = Pick<FeatureInterface, "id" | "environmentSettings">;

function experiment(
  id: string,
  hashAttribute: string,
  conditions: string[] = [],
  fallbackAttribute?: string
): Experiment {
  return {
    id,
    hashAttribute,
    fallbackAttribute,
    phases: conditions.map(
      (condition) =>
        ({ condition } as ExperimentInterfaceStringDates["phases"][number])
    ),
  };
}

function feature(id: string, rules: unknown[]): Feature {
  return {
    id,
    environmentSettings: {
      production: {
        enabled: true,
        rules: rules as FeatureInterface["environmentSettings"][string]["rules"],
      },
    },
  };
}

const attributeKeys = ["id", "deviceId", "country", "company"];

describe("getAttributeReferences", () => {
  it("counts an experiment that assigns variations by an attribute", () => {
    const { experimentIds } = getAttributeReferences({
      attributeKeys,
      features: [],
      experiments: [experiment("exp_1", "id", [""])],
      savedGroups: [],
    });
    expect([...(experimentIds.id ?? [])]).toEqual(["exp_1"]);
  });

  it("counts experiments with no phases by their hash attribute", () => {
    const { experimentIds } = getAttributeReferences({
      attributeKeys,
      features: [],
      experiments: [experiment("exp_1", "id")],
      savedGroups: [],
    });
    expect([...(experimentIds.id ?? [])]).toEqual(["exp_1"]);
  });

  it("counts experiment fallback attributes and latest-phase conditions", () => {
    const { experimentIds } = getAttributeReferences({
      attributeKeys,
      features: [],
      experiments: [
        experiment(
          "exp_1",
          "id",
          [
            JSON.stringify({ company: "acme" }),
            JSON.stringify({ country: "US" }),
          ],
          "deviceId"
        ),
      ],
      savedGroups: [],
    });
    expect([...(experimentIds.id ?? [])]).toEqual(["exp_1"]);
    expect([...(experimentIds.deviceId ?? [])]).toEqual(["exp_1"]);
    expect([...(experimentIds.country ?? [])]).toEqual(["exp_1"]);
    // Only the latest phase's condition is used
    expect(experimentIds.company).toBeUndefined();
  });

  it("ignores hash attributes that are not in the attribute schema", () => {
    const { experimentIds } = getAttributeReferences({
      attributeKeys,
      features: [],
      experiments: [experiment("exp_1", "anonymous_id")],
      savedGroups: [],
    });
    expect(Object.keys(experimentIds)).toEqual([]);
  });

  it("counts each experiment once per attribute", () => {
    const { experimentIds } = getAttributeReferences({
      attributeKeys,
      features: [],
      experiments: [
        experiment("exp_1", "id", [JSON.stringify({ id: "123" })], "id"),
        experiment("exp_2", "id"),
      ],
      savedGroups: [],
    });
    expect([...(experimentIds.id ?? [])]).toEqual(["exp_1", "exp_2"]);
  });

  it("counts feature rule conditions and hash/fallback attributes", () => {
    const { featureIds } = getAttributeReferences({
      attributeKeys,
      features: [
        feature("f_force", [
          {
            type: "force",
            id: "r1",
            condition: JSON.stringify({ $or: [{ country: "US" }] }),
          },
        ]),
        feature("f_rollout", [
          { type: "rollout", id: "r2", condition: "", hashAttribute: "id" },
        ]),
        feature("f_exp", [
          {
            type: "experiment",
            id: "r3",
            hashAttribute: "company",
            fallbackAttribute: "deviceId",
          },
        ]),
      ],
      experiments: [],
      savedGroups: [],
    });
    expect([...(featureIds.country ?? [])]).toEqual(["f_force"]);
    expect([...(featureIds.id ?? [])]).toEqual(["f_rollout"]);
    expect([...(featureIds.company ?? [])]).toEqual(["f_exp"]);
    expect([...(featureIds.deviceId ?? [])]).toEqual(["f_exp"]);
  });

  it("counts condition saved groups and skips list groups", () => {
    const { groupIds } = getAttributeReferences({
      attributeKeys,
      features: [],
      experiments: [],
      savedGroups: [
        {
          id: "grp_1",
          type: "condition",
          condition: JSON.stringify({ country: { $in: ["US", "CA"] } }),
        },
        { id: "grp_2", type: "list", condition: JSON.stringify({ id: "x" }) },
      ],
    });
    expect([...(groupIds.country ?? [])]).toEqual(["grp_1"]);
    expect(groupIds.id).toBeUndefined();
  });

  it("ignores invalid conditions", () => {
    const { experimentIds } = getAttributeReferences({
      attributeKeys,
      features: [],
      experiments: [experiment("exp_1", "", ["{not json"])],
      savedGroups: [],
    });
    expect(Object.keys(experimentIds)).toEqual([]);
  });
});
