// SyncUploadPrompt — post-sign-in "upload this device's data?" offer (PRD SYNC-4).
//
// When a remote user signs in on a device that still holds local data, we prefer
// the account's data (the app already reads the remote repo) but offer a one-time
// upload of the local data. The offer is shown at most once per device, tracked
// by a localStorage flag, so a parent who declines is never nagged again.
import { useCallback, useEffect, useState } from 'react';
import { useAuth, getLocalAnonUserId } from '../../auth/AuthContext';
import {
  getLocalDataCounts,
  migrateLocalToRemote,
  type MigrationCounts,
} from '../../lib/sync/migrateLocalToRemote';
import { MigrationModal } from '../settings/MigrationModal';
import { Toast } from '../../components/ui/toast';
import { t } from '../../i18n/t';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage flag recording that the upload offer was shown on this device. */
const UPLOAD_OFFERED_KEY = 'growup:syncUploadOffered';
const OFFERED_FLAG_VALUE = 'true';

// ---------------------------------------------------------------------------
// localStorage helpers (guarded so a blocked storage never crashes the app)
// ---------------------------------------------------------------------------

function hasOfferedUpload(): boolean {
  try {
    return localStorage.getItem(UPLOAD_OFFERED_KEY) === OFFERED_FLAG_VALUE;
  } catch {
    // If storage is unreadable, treat as "already offered" so we never nag.
    return true;
  }
}

function markUploadOffered(): void {
  try {
    localStorage.setItem(UPLOAD_OFFERED_KEY, OFFERED_FLAG_VALUE);
  } catch {
    // Best-effort: a blocked write simply means the offer may reappear next
    // session, which is acceptable and never loses data.
  }
}

function hasLocalData(counts: MigrationCounts): boolean {
  return counts.children > 0 || counts.weights > 0 || counts.feedingConfigs > 0;
}

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type ToastState = { tone: 'success' | 'error'; message: string } | null;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SyncUploadPrompt(): React.JSX.Element | null {
  const { user, status } = useAuth();

  const [counts, setCounts] = useState<MigrationCounts | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState>(null);

  const isRemoteSignedIn = status === 'remote-signed-in' && user !== null;

  // ---- Offer check: on becoming signed-in, look for local data ------------

  useEffect(() => {
    if (!isRemoteSignedIn) {
      return;
    }
    if (hasOfferedUpload()) {
      return;
    }

    let cancelled = false;

    void getLocalDataCounts(getLocalAnonUserId())
      .then((localCounts) => {
        if (cancelled) return;
        if (hasLocalData(localCounts)) {
          setCounts(localCounts);
        }
      })
      .catch(() => {
        // A failed count check simply means no offer this session — never crash.
      });

    return () => {
      cancelled = true;
    };
  }, [isRemoteSignedIn]);

  // ---- Confirm: upload local data to the account --------------------------

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (user === null || counts === null) return;

    setRunning(true);
    try {
      const result = await migrateLocalToRemote({
        localOwnerId: getLocalAnonUserId(),
        remoteOwnerId: user.id,
      });
      markUploadOffered();
      setCounts(null);

      if (result.failed > 0) {
        setToast({ tone: 'error', message: t('sync.migration.error') });
        return;
      }

      const uploadedCount =
        result.uploaded.children +
        result.uploaded.weights +
        result.uploaded.feedingConfigs;
      setToast({
        tone: 'success',
        message: t('sync.migration.success').replace('{n}', String(uploadedCount)),
      });
      // Refresh so the newly-uploaded cloud data is read from the remote repo.
      window.location.reload();
    } catch {
      markUploadOffered();
      setCounts(null);
      setToast({ tone: 'error', message: t('sync.migration.error') });
    } finally {
      setRunning(false);
    }
  }, [user, counts]);

  // ---- Cancel: remember the choice, don't nag again -----------------------

  const handleCancel = useCallback((): void => {
    markUploadOffered();
    setCounts(null);
  }, []);

  if (!isRemoteSignedIn) {
    return toast !== null ? (
      <Toast
        tone={toast.tone}
        message={toast.message}
        onDismiss={(): void => { setToast(null); }}
      />
    ) : null;
  }

  return (
    <>
      <MigrationModal
        open={counts !== null}
        counts={counts ?? { children: 0, weights: 0, feedingConfigs: 0 }}
        running={running}
        onConfirm={(): void => { void handleConfirm(); }}
        onCancel={handleCancel}
      />
      {toast !== null && (
        <Toast
          tone={toast.tone}
          message={toast.message}
          onDismiss={(): void => { setToast(null); }}
        />
      )}
    </>
  );
}
