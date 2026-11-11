import { useState } from "react";
import { Box, Flex, IconButton } from "@radix-ui/themes";
import { PiPencilSimple, PiPlus, PiTrash } from "react-icons/pi";
import { v4 as uuidv4 } from "uuid";
import { ExperimentInterfaceStringDates } from "shared/types/experiment";
import { ExperimentLink } from "shared/validators";
import { MAX_EXPERIMENT_LINKS } from "shared/constants";
import { getExperimentLinkHost, validateExperimentLink } from "shared/util";
import { useAuth } from "@/services/auth";
import Button from "@/ui/Button";
import ConfirmDialog from "@/ui/ConfirmDialog";
import Heading from "@/ui/Heading";
import Link from "@/ui/Link";
import ModalStandard from "@/ui/Modal/Patterns/ModalStandard";
import Text from "@/ui/Text";
import TextField from "@/ui/TextField";
import Tooltip from "@/ui/Tooltip";
import { LABEL_WIDTH } from "./SetupFieldRow";

export interface Props {
  experiment: ExperimentInterfaceStringDates;
  canEdit: boolean;
  mutate: () => void;
}

type ModalState = { mode: "add" } | { mode: "edit"; link: ExperimentLink };

export default function ExperimentLinks({
  experiment,
  canEdit,
  mutate,
}: Props) {
  const { apiCall } = useAuth();
  const links = experiment.links ?? [];
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleting, setDeleting] = useState<ExperimentLink | null>(null);

  const saveLinks = async (newLinks: ExperimentLink[]) => {
    await apiCall(`/experiment/${experiment.id}`, {
      method: "POST",
      body: JSON.stringify({ links: newLinks }),
    });
    mutate();
  };

  const atLimit = links.length >= MAX_EXPERIMENT_LINKS;

  return (
    <Flex align="start" gap="4" py="2" wrap="wrap" id="experiment-links">
      <Box flexShrink="0" width={LABEL_WIDTH} pt="1">
        <Heading as="h3" size="sm" color="text-high" mb="0">
          Links
        </Heading>
      </Box>
      <Box flexGrow="1" flexBasis="0" style={{ minWidth: "min(100%, 260px)" }}>
        {links.length === 0 ? (
          <Box pt="1" mb={canEdit ? "2" : "0"}>
            <Text color="text-mid">
              No links yet. Add links to specs, designs, tickets, or dashboards.
            </Text>
          </Box>
        ) : (
          <Flex direction="column" gap="1" mb={canEdit ? "2" : "0"} asChild>
            <ul
              aria-label="Experiment links"
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {links.map((link) => (
                <li key={link.id}>
                  <Flex align="center" gap="2" minHeight="28px">
                    <Box minWidth="0" style={{ overflowWrap: "anywhere" }}>
                      <Link href={link.url} external>
                        {link.label}
                      </Link>{" "}
                      <Text size="sm" color="text-low">
                        {getExperimentLinkHost(link.url)}
                      </Text>
                    </Box>
                    {canEdit ? (
                      <Flex gap="2" align="center" flexShrink="0" ml="1">
                        <IconButton
                          type="button"
                          size="1"
                          variant="ghost"
                          color="violet"
                          radius="full"
                          aria-label="Edit link"
                          title="Edit link"
                          onClick={() => setModal({ mode: "edit", link })}
                        >
                          <PiPencilSimple size={14} />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="1"
                          variant="ghost"
                          color="red"
                          radius="full"
                          aria-label="Delete link"
                          title="Delete link"
                          onClick={() => setDeleting(link)}
                        >
                          <PiTrash size={14} />
                        </IconButton>
                      </Flex>
                    ) : null}
                  </Flex>
                </li>
              ))}
            </ul>
          </Flex>
        )}
        {canEdit ? (
          <Tooltip
            content={`You can add up to ${MAX_EXPERIMENT_LINKS} links.`}
            enabled={atLimit}
          >
            {/* A disabled button gets no pointer events, so the wrapper opens the tip. */}
            <span
              style={{ display: "inline-block" }}
              tabIndex={atLimit ? 0 : undefined}
            >
              <Button
                variant="soft"
                size="sm"
                icon={<PiPlus />}
                disabled={atLimit}
                style={atLimit ? { pointerEvents: "none" } : undefined}
                onClick={() => setModal({ mode: "add" })}
              >
                Add link
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </Box>

      {modal ? (
        <ExperimentLinkModal
          initial={modal.mode === "edit" ? modal.link : null}
          close={() => setModal(null)}
          onSave={async ({ label, url }) => {
            const error = validateExperimentLink(
              { label, url },
              links,
              modal.mode === "edit" ? modal.link.id : null,
            );
            if (error) throw new Error(error);
            const link = {
              id: modal.mode === "edit" ? modal.link.id : uuidv4(),
              label: label.trim(),
              url: url.trim(),
            };
            await saveLinks(
              modal.mode === "edit"
                ? links.map((l) => (l.id === link.id ? link : l))
                : [...links, link],
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete link"
          content={`Are you sure you want to delete the link "${deleting.label}"?`}
          yesText="Delete"
          noText="Cancel"
          color="red"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await saveLinks(links.filter((l) => l.id !== deleting.id));
            setDeleting(null);
          }}
        />
      ) : null}
    </Flex>
  );
}

function ExperimentLinkModal({
  initial,
  close,
  onSave,
}: {
  initial: ExperimentLink | null;
  close: () => void;
  onSave: (values: { label: string; url: string }) => Promise<void>;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");

  return (
    <ModalStandard
      open={true}
      header={initial ? "Edit link" : "Add link"}
      trackingEventModalType=""
      cta="Save"
      closeCta="Cancel"
      close={close}
      submit={() => onSave({ label, url })}
    >
      <Flex direction="column" gap="4">
        <TextField
          label="Label"
          markRequired
          placeholder="e.g. Product spec"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <TextField
          label="URL"
          markRequired
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Flex>
    </ModalStandard>
  );
}
