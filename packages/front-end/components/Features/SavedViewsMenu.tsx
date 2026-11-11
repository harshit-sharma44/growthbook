import { useState } from "react";
import { Box, Flex } from "@radix-ui/themes";
import { PiCheck } from "react-icons/pi";
import { SavedViewInterface, SavedViewPage } from "shared/validators";
import { MAX_SAVED_VIEWS_PER_USER } from "shared/constants";
import {
  SAVED_VIEW_ERRORS,
  findSavedViewForQuery,
  sortSavedViews,
  validateNewSavedView,
  validateSavedViewName,
} from "shared/util";
import useApi from "@/hooks/useApi";
import { FilterHeading } from "@/components/Search/SearchFilters";
import { useAuth } from "@/services/auth";
import Button from "@/ui/Button";
import ConfirmDialog from "@/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/ui/DropdownMenu";
import ModalStandard from "@/ui/Modal/Patterns/ModalStandard";
import Table, {
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRow,
} from "@/ui/Table";
import Text from "@/ui/Text";
import TextField from "@/ui/TextField";

const PAGE: SavedViewPage = "features";

export default function SavedViewsMenu({
  searchValue,
  setSearchValue,
}: {
  searchValue: string;
  setSearchValue: (value: string) => void;
}) {
  const { data, mutate } = useApi<{ savedViews: SavedViewInterface[] }>(
    `/saved-views?page=${PAGE}`,
  );
  const views = sortSavedViews(data?.savedViews ?? []);
  const activeView = findSavedViewForQuery(views, searchValue);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState(false);

  const atLimit = views.length >= MAX_SAVED_VIEWS_PER_USER;
  const saveHint = atLimit
    ? SAVED_VIEW_ERRORS.tooMany
    : !searchValue.trim()
      ? "Type a search or pick a filter first."
      : null;

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        menuPlacement="end"
        menuWidth={320}
        variant="soft"
        trigger={FilterHeading({ heading: "Saved views", open })}
      >
        {views.length === 0 ? (
          <Box px="3" py="2">
            <Text color="text-low">No saved views yet</Text>
          </Box>
        ) : (
          views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => setSearchValue(view.query)}
            >
              <Flex align="center" gap="2">
                <Box width="16px" flexShrink="0">
                  {activeView?.id === view.id ? (
                    <PiCheck aria-label="Current view" />
                  ) : null}
                </Box>
                {/* The menu grows to fit its widest item, so cap the name here. */}
                <Box maxWidth="250px">
                  <Text as="div" truncate title={view.name}>
                    {view.name}
                  </Text>
                </Box>
              </Flex>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={saveHint !== null}
          onClick={() => setSaving(true)}
        >
          <Flex direction="column">
            <span>Save current view…</span>
            {saveHint ? (
              <Text size="sm" color="text-low">
                {saveHint}
              </Text>
            ) : null}
          </Flex>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setManaging(true)}>
          Manage saved views
        </DropdownMenuItem>
      </DropdownMenu>

      {saving ? (
        <SaveViewModal
          query={searchValue.trim()}
          views={views}
          close={() => setSaving(false)}
          onSaved={() => mutate()}
        />
      ) : null}
      {managing ? (
        <ManageSavedViewsModal
          views={views}
          close={() => setManaging(false)}
          mutate={() => mutate()}
        />
      ) : null}
    </>
  );
}

function SaveViewModal({
  query,
  views,
  close,
  onSaved,
}: {
  query: string;
  views: SavedViewInterface[];
  close: () => void;
  onSaved: () => Promise<unknown> | void;
}) {
  const { apiCall } = useAuth();
  const [name, setName] = useState("");

  return (
    <ModalStandard
      open={true}
      header="Save view"
      trackingEventModalType=""
      cta="Save"
      closeCta="Cancel"
      close={close}
      submit={async () => {
        const error = validateNewSavedView({ name, query }, views);
        if (error) throw new Error(error);
        await apiCall("/saved-views", {
          method: "POST",
          body: JSON.stringify({ page: PAGE, name: name.trim(), query }),
        });
        await onSaved();
      }}
    >
      <Flex direction="column" gap="4">
        <TextField
          label="Name"
          markRequired
          placeholder="e.g. My checkout flags"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Box>
          <Text as="div" weight="semibold">
            Search
          </Text>
          <Text as="div" mono overflowWrap="anywhere">
            {query}
          </Text>
        </Box>
      </Flex>
    </ModalStandard>
  );
}

function ManageSavedViewsModal({
  views,
  close,
  mutate,
}: {
  views: SavedViewInterface[];
  close: () => void;
  mutate: () => Promise<unknown> | void;
}) {
  const { apiCall } = useAuth();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleting, setDeleting] = useState<SavedViewInterface | null>(null);

  const startRename = (view: SavedViewInterface) => {
    setRenamingId(view.id);
    setNewName(view.name);
    setRenameError(null);
  };
  const cancelRename = () => {
    setRenamingId(null);
    setRenameError(null);
  };
  const saveRename = async (view: SavedViewInterface) => {
    const error = validateSavedViewName(newName, views, view.id);
    if (error) {
      setRenameError(error);
      return;
    }
    setRenameSaving(true);
    try {
      await apiCall(`/saved-views/${view.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: newName.trim() }),
      });
      await mutate();
      cancelRename();
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : String(e));
    } finally {
      setRenameSaving(false);
    }
  };

  return (
    <>
      <ModalStandard
        open={true}
        header="Saved views"
        trackingEventModalType=""
        size="lg"
        closeCta="Close"
        close={close}
      >
        {views.length === 0 ? (
          <Text color="text-mid">You have no saved views.</Text>
        ) : (
          <Table variant="surface" layout="fixed">
            <TableHeader>
              <TableRow>
                <TableColumnHeader style={{ width: "35%" }}>
                  Name
                </TableColumnHeader>
                <TableColumnHeader>Search</TableColumnHeader>
                <TableColumnHeader style={{ width: 170 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {views.map((view) => (
                <TableRow key={view.id}>
                  <TableCell>
                    {renamingId === view.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveRename(view);
                        }}
                      >
                        <TextField
                          aria-label="Name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          error={renameError ?? undefined}
                          autoFocus
                        />
                      </form>
                    ) : (
                      <Text weight="medium" overflowWrap="anywhere">
                        {view.name}
                      </Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Text mono truncate title={view.query}>
                      {view.query}
                    </Text>
                  </TableCell>
                  <TableCell style={{ whiteSpace: "nowrap" }}>
                    {renamingId === view.id ? (
                      <Flex gap="2" justify="end">
                        <Button
                          size="sm"
                          loading={renameSaving}
                          onClick={() => saveRename(view)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={renameSaving}
                          onClick={cancelRename}
                        >
                          Cancel
                        </Button>
                      </Flex>
                    ) : (
                      <Flex gap="2" justify="end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startRename(view)}
                        >
                          Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          color="red"
                          onClick={() => setDeleting(view)}
                        >
                          Delete
                        </Button>
                      </Flex>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {deleting ? (
          <ConfirmDialog
            title="Delete saved view"
            content={`Delete the saved view "${deleting.name}"? This can't be undone.`}
            yesText="Delete"
            noText="Cancel"
            color="red"
            onCancel={() => setDeleting(null)}
            onConfirm={async () => {
              await apiCall(`/saved-views/${deleting.id}`, {
                method: "DELETE",
              });
              await mutate();
              if (renamingId === deleting.id) cancelRename();
              setDeleting(null);
            }}
          />
        ) : null}
      </ModalStandard>
    </>
  );
}
