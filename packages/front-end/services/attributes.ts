import { recursiveWalk } from "shared/util";
import { FeatureInterface } from "back-end/src/validators/features";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { SavedGroupInterface } from "shared/src/types";

export type AttributeReferenceIds = Record<string, Set<string>>;

export interface AttributeReferences {
  featureIds: AttributeReferenceIds;
  experimentIds: AttributeReferenceIds;
  groupIds: AttributeReferenceIds;
}

function addReference(
  refs: AttributeReferenceIds,
  attributeKeys: Set<string>,
  attribute: string | undefined | null,
  id: string
) {
  if (!attribute || !attributeKeys.has(attribute)) return;
  if (!refs[attribute]) refs[attribute] = new Set<string>();
  refs[attribute].add(id);
}

function addConditionReferences(
  refs: AttributeReferenceIds,
  attributeKeys: Set<string>,
  condition: string | undefined | null,
  id: string
) {
  try {
    const parsedCondition = JSON.parse(condition || "{}");
    recursiveWalk(parsedCondition, (node) => {
      addReference(refs, attributeKeys, node[0], id);
    });
  } catch (e) {
    // ignore invalid conditions
  }
}

// Finds which features, experiments, and condition saved groups reference
// each attribute, either in a targeting condition or as the attribute used
// to assign variations (hashAttribute / fallbackAttribute).
export function getAttributeReferences({
  attributeKeys,
  features,
  experiments,
  savedGroups,
}: {
  attributeKeys: string[];
  features: Pick<FeatureInterface, "id" | "environmentSettings">[];
  experiments: Pick<
    ExperimentInterfaceStringDates,
    "id" | "phases" | "hashAttribute" | "fallbackAttribute"
  >[];
  savedGroups: Pick<SavedGroupInterface, "id" | "type" | "condition">[];
}): AttributeReferences {
  const keys = new Set(attributeKeys);
  const featureIds: AttributeReferenceIds = {};
  const experimentIds: AttributeReferenceIds = {};
  const groupIds: AttributeReferenceIds = {};

  for (const feature of features) {
    for (const envid in feature.environmentSettings) {
      const env = feature.environmentSettings?.[envid];
      env?.rules?.forEach((rule) => {
        if (!rule) return;
        addConditionReferences(featureIds, keys, rule.condition, feature.id);
        if ("hashAttribute" in rule) {
          addReference(featureIds, keys, rule.hashAttribute, feature.id);
        }
        if ("fallbackAttribute" in rule) {
          addReference(featureIds, keys, rule.fallbackAttribute, feature.id);
        }
      });
    }
  }

  for (const experiment of experiments) {
    const phase = experiment.phases?.[experiment.phases.length - 1];
    addConditionReferences(
      experimentIds,
      keys,
      phase?.condition,
      experiment.id
    );
    addReference(experimentIds, keys, experiment.hashAttribute, experiment.id);
    addReference(
      experimentIds,
      keys,
      experiment.fallbackAttribute,
      experiment.id
    );
  }

  for (const group of savedGroups) {
    if (group.type !== "condition") continue;
    addConditionReferences(groupIds, keys, group.condition, group.id);
  }

  return { featureIds, experimentIds, groupIds };
}
