import { useState } from "react";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { date, datetime } from "shared/dates";
import { phaseSummary } from "@/services/utils";
import { useAuth } from "@/services/auth";
import Modal from "@/components/Modal";
import DeleteButton from "@/components/DeleteButton/DeleteButton";
import { GBAddCircle } from "@/components/Icons";
import EditPhaseModal from "./EditPhaseModal";
import NewPhaseForm from "./NewPhaseForm";

export interface Props {
  close: () => void;
  experiment: ExperimentInterfaceStringDates;
  mutateExperiment: () => void;
  editTargeting: (() => void) | null;
  source?: string;
}

export default function EditPhasesModal({
  close,
  experiment,
  mutateExperiment,
  editTargeting,
  source,
}: Props) {
  const isDraft = experiment.status === "draft";
  const numPhases = experiment.phases.length;
  // A draft with exactly one phase skips the list and edits that phase directly.
  // A draft with no phases (e.g. its only phase was deleted) must show the list,
  // since there is no phase 0 to edit.
  const editSinglePhase = isDraft && numPhases === 1;
  const hasStoppedPhases = experiment.phases.some((p) => p.dateEnded);
  const hasLinkedChanges =
    !!experiment.linkedFeatures?.length || !!experiment.hasVisualChangesets;

  const [editPhase, setEditPhase] = useState<number | null>(
    editSinglePhase ? 0 : null
  );

  const { apiCall } = useAuth();

  if (editPhase === -1) {
    return (
      <NewPhaseForm
        close={() => {
          if (editSinglePhase) {
            close();
          } else {
            setEditPhase(null);
          }
        }}
        experiment={experiment}
        mutate={mutateExperiment}
      />
    );
  }

  if (editPhase !== null && experiment.phases[editPhase]) {
    return (
      <EditPhaseModal
        source="edit-phases-modal"
        close={() => {
          if (editSinglePhase) {
            close();
          } else {
            setEditPhase(null);
          }
        }}
        experiment={experiment}
        i={editPhase}
        mutate={mutateExperiment}
        editTargeting={() => {
          editTargeting?.();
          close();
        }}
      />
    );
  }

  return (
    <Modal
      trackingEventModalType="edit-phases-modal"
      trackingEventModalSource={source}
      open={true}
      header="Edit Phases"
      close={close}
      size="lg"
      closeCta="Close"
    >
      <table className="table gbtable mb-2">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Dates</th>
            <th>Traffic</th>
            {hasStoppedPhases ? <th>Reason for Stopping</th> : null}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {experiment.phases.map((phase, i) => (
            <tr className="border p-2 m-2" key={i}>
              <td>{i + 1}</td>
              <td>{phase.name}</td>
              <td>
                <strong title={datetime(phase.dateStarted ?? "")}>
                  {date(phase.dateStarted ?? "")}
                </strong>{" "}
                to{" "}
                <strong title={datetime(phase.dateEnded ?? "")}>
                  {phase.dateEnded ? date(phase.dateEnded) : "now"}
                </strong>
              </td>
              <td>
                {phaseSummary(phase, experiment.type === "multi-armed-bandit")}
              </td>
              {hasStoppedPhases ? (
                <td>
                  {phase.dateEnded ? (
                    phase.reason
                  ) : (
                    <em className="text-muted">not applicable</em>
                  )}
                </td>
              ) : null}
              <td className="text-right" style={{ width: 125 }}>
                <button
                  className="btn btn-outline-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditPhase(i);
                  }}
                >
                  Edit
                </button>
                {(experiment.status !== "running" || !hasLinkedChanges) &&
                  numPhases > 1 && (
                    <DeleteButton
                      className="ml-2"
                      displayName="phase"
                      onClick={async () => {
                        await apiCall(
                          `/experiment/${experiment.id}/phase/${i}`,
                          {
                            method: "DELETE",
                          }
                        );
                        mutateExperiment();
                      }}
                    />
                  )}
              </td>
            </tr>
          ))}
          {numPhases === 0 && (
            <tr>
              <td colSpan={hasStoppedPhases ? 6 : 5}>
                <em className="text-muted">This experiment has no phases.</em>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {(experiment.status !== "running" || !hasLinkedChanges) && (
        <button
          className="btn btn-primary"
          onClick={(e) => {
            e.preventDefault();
            setEditPhase(-1);
          }}
        >
          <GBAddCircle /> New Phase
        </button>
      )}
    </Modal>
  );
}
