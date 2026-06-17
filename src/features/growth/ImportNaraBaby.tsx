// ImportNaraBaby — import baby weights from a Nara Baby CSV export (M2-13)
// Entry point on the Growth screen. Same-date entries are overwritten (CSV is source of truth).
// Uses: Button, Modal, Toast from ui/; useWeights; parseNaraBabyWeights; isWeightDateValid
import React, { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { Toast } from '../../components/ui/toast';
import { useWeights } from '../../lib/hooks/WeightsProvider';
import { isWeightDateValid } from '../../lib/hooks/useWeights';
import { parseNaraBabyWeights } from '../../lib/import/naraBaby';
import { t } from '../../i18n/t';
import type { WeightEntry } from '../../types';

// ---------------------------------------------------------------------------
// File reading utility (extracted for testability)
// ---------------------------------------------------------------------------

/**
 * Reads a File as UTF-8 text using FileReader, which jsdom supports.
 * Avoids File.prototype.text() which is not available in jsdom.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = (): void => {
      reject(reader.error ?? new Error('FileReader error'));
    };
    reader.readAsText(file);
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImportNaraBabyProps {
  dateOfBirth: string;
  existingEntries: WeightEntry[];
  onImported: () => void;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ParsedWeight {
  dateMeasured: string;
  weightGrams: number;
}

type WeightClassification = 'new' | 'update' | 'skipped';

interface ClassifiedWeight {
  dateMeasured: string;
  weightGrams: number;
  classification: WeightClassification;
  existingId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function interpolateSummary(
  found: number,
  newCount: number,
  updateCount: number,
  skippedCount: number,
): string {
  return t('growth.import.summary')
    .replace('{found}', String(found))
    .replace('{new}', String(newCount))
    .replace('{update}', String(updateCount))
    .replace('{skipped}', String(skippedCount));
}

function interpolateSuccess(count: number): string {
  return t('growth.import.success').replace('{count}', String(count));
}

function classifyWeights(
  parsed: ParsedWeight[],
  dateOfBirth: string,
  existingEntries: WeightEntry[],
): ClassifiedWeight[] {
  return parsed.map((pw) => {
    const validation = isWeightDateValid(pw.dateMeasured, dateOfBirth);
    if (!validation.ok) {
      return { ...pw, classification: 'skipped' as const };
    }

    const existing = existingEntries.find(
      (e) => e.dateMeasured === pw.dateMeasured,
    );
    if (existing !== undefined) {
      return {
        ...pw,
        classification: 'update' as const,
        existingId: existing.id,
      };
    }

    return { ...pw, classification: 'new' as const };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportNaraBaby({
  dateOfBirth,
  existingEntries,
  onImported,
}: ImportNaraBabyProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addWeight, editWeight } = useWeights();

  const [classified, setClassified] = useState<ClassifiedWeight[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'success' | 'error' | 'info'>('info');

  function showToast(message: string, tone: 'success' | 'error' | 'info'): void {
    setToastMessage(message);
    setToastTone(tone);
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (file === undefined) return;

    let csvText: string;
    try {
      csvText = await readFileAsText(file);
    } catch {
      showToast(t('growth.import.parseError'), 'error');
      return;
    }

    let parsed: ParsedWeight[];
    try {
      parsed = parseNaraBabyWeights(csvText);
    } catch {
      showToast(t('growth.import.parseError'), 'error');
      return;
    }

    if (parsed.length === 0) {
      showToast(t('growth.import.empty'), 'info');
      return;
    }

    const classifiedWeights = classifyWeights(parsed, dateOfBirth, existingEntries);
    setClassified(classifiedWeights);
    setModalOpen(true);
  }

  async function handleConfirm(): Promise<void> {
    setImporting(true);

    const inRange = classified.filter((w) => w.classification !== 'skipped');
    let importedCount = 0;

    try {
      for (const w of inRange) {
        if (w.classification === 'update' && w.existingId !== undefined) {
          await editWeight(w.existingId, {
            dateMeasured: w.dateMeasured,
            weightGrams: w.weightGrams,
          });
        } else {
          await addWeight({
            dateMeasured: w.dateMeasured,
            weightGrams: w.weightGrams,
          });
        }
        importedCount++;
      }
    } catch {
      showToast(t('growth.import.parseError'), 'error');
      setImporting(false);
      setModalOpen(false);
      resetFileInput();
      return;
    }

    setImporting(false);
    setModalOpen(false);
    showToast(interpolateSuccess(importedCount), 'success');
    resetFileInput();
    onImported();
  }

  function handleCancel(): void {
    setModalOpen(false);
    resetFileInput();
  }

  function resetFileInput(): void {
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = '';
    }
  }

  const newCount = classified.filter((w) => w.classification === 'new').length;
  const updateCount = classified.filter((w) => w.classification === 'update').length;
  const skippedCount = classified.filter((w) => w.classification === 'skipped').length;
  const totalFound = classified.length;

  const fileInputId = 'nara-baby-csv-input';

  return (
    <>
      {toastMessage !== null && (
        <div className="mt-[var(--space-2)]">
          <Toast
            tone={toastTone}
            message={toastMessage}
            onDismiss={() => setToastMessage(null)}
          />
        </div>
      )}

      <div className="flex items-center gap-[var(--space-2)]">
        <label htmlFor={fileInputId} className="sr-only">
          {t('growth.import.fileInputLabel')}
        </label>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept=".csv"
          aria-label={t('growth.import.fileInputLabel')}
          className="sr-only"
          onChange={(e) => {
            void handleFileChange(e);
          }}
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('growth.import.button')}
          className="min-h-[44px] min-w-[44px]"
        >
          {t('growth.import.button')}
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCancel}
        title={t('growth.import.title')}
        footer={
          <div className="flex justify-end gap-[var(--space-3)]">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={importing}
              className="min-h-[44px]"
            >
              {t('growth.import.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void handleConfirm();
              }}
              loading={importing}
              disabled={importing}
              className="min-h-[44px]"
            >
              {t('growth.import.confirm')}
            </Button>
          </div>
        }
      >
        <p className="text-[length:var(--text-body)] text-[var(--color-foreground)] m-0">
          {interpolateSummary(totalFound, newCount, updateCount, skippedCount)}
        </p>
      </Modal>
    </>
  );
}
