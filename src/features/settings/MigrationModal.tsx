// MigrationModal — local→remote upload confirmation (PRD SYNC-4).
// Controlled, presentational: the parent owns running state and the confirm
// handler. Copy comes from i18n (sync.migration.*); layout uses design tokens.
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { t } from '../../i18n/t';
import type { MigrationCounts } from '../../lib/sync/migrateLocalToRemote';

interface MigrationModalProps {
  open: boolean;
  counts: MigrationCounts;
  running: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function buildBody(counts: MigrationCounts): string {
  return t('sync.migration.body')
    .replace('{children}', String(counts.children))
    .replace('{weights}', String(counts.weights));
}

export function MigrationModal({
  open,
  counts,
  running,
  onConfirm,
  onCancel,
}: MigrationModalProps): React.JSX.Element | null {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('sync.migration.title')}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-[var(--space-3)]">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={running}
            fullWidthOnMobile
          >
            {t('sync.migration.notNow')}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={running}
            disabled={running}
            fullWidthOnMobile
          >
            {running ? t('sync.migration.uploading') : t('sync.migration.upload')}
          </Button>
        </div>
      }
    >
      <p className="text-[length:var(--text-body)] text-[var(--color-foreground)] m-0">
        {buildBody(counts)}
      </p>
    </Modal>
  );
}
