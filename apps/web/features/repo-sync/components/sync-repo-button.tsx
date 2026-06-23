"use client";

import React from "react";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/ui/button";
import { RepoSyncStatus } from "../types";
import { toast } from "sonner";

type SyncRepoButtonProps = {
  repoFullName: string;
  branch: string;
  syncStatus: RepoSyncStatus | null;
};

function isSyncing(status: RepoSyncStatus | null, mutationPending: boolean) {
  if (mutationPending) {
    return true;
  }

  return status === "pending" || status === "syncing";
}

function getButtonLabel(
  status: RepoSyncStatus | null,
  mutationPending: boolean,
) {
  if (isSyncing(status, mutationPending)) {
    return "Syncing…";
  }

  if (status === "synced") {
    return "Re-sync";
  }

  return "Sync";
}

const SyncRepoButton = ({
  repoFullName,
  branch,
  syncStatus,
}: SyncRepoButtonProps) => {
  const utils = trpc.useUtils();
  const syncRepo = trpc.repoSync.sync.useMutation({
    onSuccess: () => {
      utils.github.getRepos.invalidate();
      toast.success(`Sync started for ${repoFullName}`);
    },
    onError: (error) => {
      toast.error(`Failed to sync repo ${repoFullName}: ${error.message}`);
    },
  });

  const syncing = isSyncing(syncStatus, syncRepo.isPending);

  const prevStatusRef = React.useRef<RepoSyncStatus | null>(syncStatus);

  React.useEffect(() => {
    if (prevStatusRef.current !== syncStatus) {
      if (
        syncStatus === "synced" &&
        (prevStatusRef.current === "syncing" ||
          prevStatusRef.current === "pending")
      ) {
        toast.success(`Repo ${repoFullName} synced successfully`);
      } else if (
        syncStatus === "failed" &&
        (prevStatusRef.current === "syncing" ||
          prevStatusRef.current === "pending")
      ) {
        toast.error(`Failed to sync repo ${repoFullName}`);
      }
      prevStatusRef.current = syncStatus;
    }
  }, [syncStatus, repoFullName]);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={syncing}
      onClick={() => syncRepo.mutate({ repoFullName, branch })}
    >
      {getButtonLabel(syncStatus, syncRepo.isPending)}
    </Button>
  );
};

export default SyncRepoButton;
