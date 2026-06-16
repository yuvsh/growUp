// StoragePrivacy — Settings → Storage & Privacy (PRD SYNC-5/6).
// Shows the current storage mode, lets the user switch between on-device and
// synced storage (copying data when leaving sync), export everything as JSON,
// and delete all synced data. Copy via t(); layout uses design tokens.
import { useCallback, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { Toast } from '../../components/ui/toast';
import { t } from '../../i18n/t';
import { useAuth, getLocalAnonUserId } from '../../auth/AuthContext';
import { useRepository } from '../../data/repository/useRepository';
import { migrateRemoteToLocal } from '../../lib/sync/migrateRemoteToLocal';
import { gatherExportData, downloadJson } from '../../lib/sync/exportData';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type ToastState = { tone: 'success' | 'error'; message: string } | null;

const EXPORT_FILENAME = 'growup-export.json';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StoragePrivacy(): React.JSX.Element {
  const { user, status, setMode, signInWithGoogle, signOut } = useAuth();
  const repository = useRepository();

  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);

  const isRemoteSignedIn = status === 'remote-signed-in' && user !== null;
  const modeLabel = isRemoteSignedIn
    ? t('sync.settings.modeRemote').replace('{email}', user?.email ?? '')
    : t('sync.settings.modeLocal');

  // ---- Switch: local → remote (sync) --------------------------------------

  const handleSyncToAccount = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      setMode('remote');
      await signInWithGoogle();
    } catch {
      // Roll back to a calm, known state if sign-in could not be started.
      setMode('local');
      setToast({ tone: 'error', message: t('sync.settings.switchError') });
    } finally {
      setBusy(false);
    }
  }, [setMode, signInWithGoogle]);

  // ---- Switch: remote → local (keep on device) ----------------------------

  const handleKeepOnDevice = useCallback(async (): Promise<void> => {
    if (user === null) return;
    if (!window.confirm(t('sync.settings.switchToLocalConfirm'))) return;

    setBusy(true);
    try {
      await migrateRemoteToLocal({
        remoteOwnerId: user.id,
        localOwnerId: getLocalAnonUserId(),
      });
      setMode('local');
      setToast({ tone: 'success', message: t('sync.settings.switchToLocalDone') });
    } catch {
      setToast({ tone: 'error', message: t('sync.settings.switchError') });
    } finally {
      setBusy(false);
    }
  }, [user, setMode]);

  // ---- Export -------------------------------------------------------------

  const handleExport = useCallback(async (): Promise<void> => {
    if (user === null) return;
    setBusy(true);
    try {
      const bundle = await gatherExportData(repository, user.id);
      downloadJson(bundle, EXPORT_FILENAME);
      setToast({ tone: 'success', message: t('sync.settings.exportSuccess') });
    } catch {
      setToast({ tone: 'error', message: t('sync.settings.exportError') });
    } finally {
      setBusy(false);
    }
  }, [repository, user]);

  // ---- Delete synced data --------------------------------------------------
  // NOTE: this removes the user's DATA rows. Deleting the Google auth-user
  // record itself requires a privileged server-side call and is a follow-up
  // Supabase Edge Function — out of scope here.

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (user === null) return;
    setBusy(true);
    try {
      const children = await repository.children.list(user.id);
      // FK cascade removes weights + feeding configs when the child is deleted.
      for (const child of children) {
        await repository.children.delete(child.id);
      }
      await signOut();
      setDeleteOpen(false);
      setToast({ tone: 'success', message: t('sync.delete.success') });
    } catch {
      setToast({ tone: 'error', message: t('sync.delete.error') });
    } finally {
      setBusy(false);
    }
  }, [repository, user, signOut]);

  return (
    <Card variant="default">
      <div className="flex flex-col gap-[var(--space-5)]">
        <h2 className="text-[var(--text-h3)] font-[var(--font-heading)] text-[var(--color-foreground)] m-0">
          {t('sync.settings.title')}
        </h2>

        {/* ---- Current mode ------------------------------------------------ */}
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
            {t('sync.settings.modeLabel')}
          </span>
          <span className="text-[var(--text-body)] text-[var(--color-foreground)] font-medium text-end">
            {modeLabel}
          </span>
        </div>

        {/* ---- Switch storage --------------------------------------------- */}
        <div className="flex flex-col gap-[var(--space-2)]">
          {isRemoteSignedIn ? (
            <Button
              variant="secondary"
              size="md"
              fullWidthOnMobile
              disabled={busy}
              onClick={(): void => { void handleKeepOnDevice(); }}
            >
              {t('sync.settings.switchToLocal')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidthOnMobile
              disabled={busy}
              onClick={(): void => { void handleSyncToAccount(); }}
            >
              {t('sync.settings.switchToRemote')}
            </Button>
          )}
        </div>

        {/* ---- Export (both modes, requires an owner) --------------------- */}
        {user !== null && (
          <Button
            variant="secondary"
            size="md"
            fullWidthOnMobile
            disabled={busy}
            onClick={(): void => { void handleExport(); }}
          >
            {t('sync.settings.exportButton')}
          </Button>
        )}

        {/* ---- Delete synced data (remote signed-in only) ---------------- */}
        {isRemoteSignedIn && (
          <Button
            variant="destructive"
            size="md"
            fullWidthOnMobile
            disabled={busy}
            onClick={(): void => { setDeleteOpen(true); }}
          >
            {t('sync.delete.button')}
          </Button>
        )}

        {/* ---- Privacy note ---------------------------------------------- */}
        <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] m-0">
          {t('sync.settings.privacyNote')}
        </p>

        {/* ---- Toast ----------------------------------------------------- */}
        {toast !== null && (
          <Toast
            tone={toast.tone}
            message={toast.message}
            onDismiss={(): void => { setToast(null); }}
          />
        )}
      </div>

      {/* ---- Hard-confirm delete modal ----------------------------------- */}
      <Modal
        open={deleteOpen}
        onClose={(): void => { if (!busy) setDeleteOpen(false); }}
        title={t('sync.delete.confirmTitle')}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-[var(--space-3)]">
            <Button
              variant="secondary"
              fullWidthOnMobile
              disabled={busy}
              onClick={(): void => { setDeleteOpen(false); }}
            >
              {t('sync.delete.keep')}
            </Button>
            <Button
              variant="destructive"
              fullWidthOnMobile
              loading={busy}
              disabled={busy}
              onClick={(): void => { void handleConfirmDelete(); }}
            >
              {t('sync.delete.confirm')}
            </Button>
          </div>
        }
      >
        <p className="text-[length:var(--text-body)] text-[var(--color-foreground)] m-0">
          {t('sync.delete.confirmBody')}
        </p>
      </Modal>
    </Card>
  );
}
