// Add / Edit Child
// Blueprint: docs/ui-blueprints.md → "Add / Edit Child"
// Design system: design-system/MASTER.md
// Uses from ui/: Input, Button, Card, Modal (delete confirm), Toast
// Screen components used: SexSelector.tsx
// Philosophy: Apple — calm single-purpose form.
// Data: useChild (createChild/updateChild/deleteChild); Zod validation via childFormSchema.
// States: blank (add) / prefilled (edit); Save spinner; field errors below each field;
//         save failure → Toast "Couldn't save — your details are still here".

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Modal } from '../../components/ui/modal';
import { Toast } from '../../components/ui/toast';
import { SexSelector } from './SexSelector';
import { useChild } from '../../lib/hooks/useChild';
import { childFormSchema, type ChildFormValues, type ChildFormOutput } from './types';
import { t } from '../../i18n/t';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChildForm(): React.JSX.Element {
  const navigate = useNavigate();
  const { child, createChild, updateChild, deleteChild } = useChild();

  const isEditMode = child !== null;

  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChildFormValues>({
    // The Zod schema output type (ChildFormOutput) is narrower than the form
    // state type (ChildFormValues) because sex is null-able in the form but
    // validated to 'male'|'female' on submit. The cast is safe: by the time
    // react-hook-form calls onSubmit, the schema has already validated/parsed
    // the values into ChildFormOutput.
    resolver: zodResolver(childFormSchema) as Resolver<ChildFormValues>,
    defaultValues: {
      name: child?.name ?? '',
      sex: child?.sex ?? null,
      dateOfBirth: child?.dateOfBirth ?? '',
    },
  });

  // ---- Submit handler -------------------------------------------------------

  async function onSubmit(values: ChildFormValues): Promise<void> {
    // By the time onSubmit is invoked, zod has validated values — sex is non-null.
    const sex = values.sex as ChildFormOutput['sex'];
    setMutationError(null);
    try {
      if (isEditMode && child !== null) {
        await updateChild(child.id, {
          name: values.name,
          sex,
          dateOfBirth: values.dateOfBirth,
        });
      } else {
        await createChild({
          name: values.name,
          sex,
          dateOfBirth: values.dateOfBirth,
        });
      }
      navigate('/profile');
    } catch {
      setMutationError(t('profile.childForm.saveMutationError'));
    }
  }

  // ---- Delete handler -------------------------------------------------------

  async function handleDeleteConfirm(): Promise<void> {
    if (child === null) return;
    setIsDeleting(true);
    setMutationError(null);
    try {
      await deleteChild(child.id);
      setDeleteModalOpen(false);
      navigate('/onboarding');
    } catch {
      setMutationError(t('profile.childForm.saveMutationError'));
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  // ---- Computed -------------------------------------------------------

  const isDisabled = isSubmitting || isDeleting;

  // ---- Render -------------------------------------------------------

  return (
    <main
      className={[
        'min-h-dvh',
        'bg-[var(--color-background)]',
        'flex flex-col items-center justify-start',
        'py-[var(--space-6)] px-[var(--space-4)]',
      ].join(' ')}
    >
      <Card
        className={[
          'w-full max-w-[520px]',
          'p-[var(--space-6)]',
          'flex flex-col',
          'gap-[var(--space-5)]',
        ].join(' ')}
      >
        {/* ---- Title ---- */}
        <h1
          className={[
            'text-[var(--text-h2)]',
            'font-[var(--font-heading)]',
            'text-[var(--color-foreground)]',
            'font-bold',
            'my-0',
          ].join(' ')}
        >
          {isEditMode
            ? t('profile.childForm.titleEdit')
            : t('profile.childForm.titleAdd')}
        </h1>

        {/* ---- Form ---- */}
        {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-[var(--space-5)]"
        >
          {/* ---- Name field ---- */}
          <Input
            id="child-name"
            label={t('profile.childForm.nameLabel')}
            autoComplete="off"
            error={errors.name?.message}
            disabled={isDisabled}
            {...register('name')}
          />

          {/* ---- Sex field ---- */}
          <Controller
            name="sex"
            control={control}
            render={({ field }): React.JSX.Element => (
              <SexSelector
                id="child-sex"
                value={field.value}
                onChange={field.onChange}
                error={errors.sex?.message}
              />
            )}
          />

          {/* ---- Date of birth field ---- */}
          <Input
            id="child-dob"
            label={t('profile.childForm.dobLabel')}
            type="date"
            error={errors.dateOfBirth?.message}
            disabled={isDisabled}
            {...register('dateOfBirth')}
          />

          {/* ---- Action buttons ---- */}
          <div className="flex flex-col gap-[var(--space-3)]">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isDisabled}
              fullWidthOnMobile
            >
              {isSubmitting
                ? t('profile.childForm.saving')
                : t('common.save')}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={isDisabled}
              fullWidthOnMobile
              onClick={(): void => {
                navigate(isEditMode ? '/profile' : '/onboarding');
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>

          {/* ---- Delete action (edit mode only) ---- */}
          {isEditMode && (
            <Button
              type="button"
              variant="ghost"
              disabled={isDisabled}
              aria-label={t('profile.childForm.deleteAction')}
              onClick={(): void => {
                setDeleteModalOpen(true);
              }}
              className="text-[var(--color-destructive)] self-center"
            >
              {t('profile.childForm.deleteAction')}
            </Button>
          )}
        </form>

        {/* ---- Mutation error toast ---- */}
        {mutationError !== null && (
          <Toast
            tone="error"
            message={mutationError}
            onDismiss={(): void => {
              setMutationError(null);
            }}
          />
        )}
      </Card>

      {/* ---- Delete confirm modal ---- */}
      <Modal
        open={deleteModalOpen}
        onClose={(): void => {
          setDeleteModalOpen(false);
        }}
        title={t('profile.childForm.deleteModalTitle')}
        footer={
          <div className="flex gap-[var(--space-3)] justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting}
              onClick={(): void => {
                setDeleteModalOpen(false);
              }}
            >
              {t('common.keep')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={isDeleting}
              disabled={isDeleting}
              /* eslint-disable-next-line @typescript-eslint/no-misused-promises */
              onClick={handleDeleteConfirm}
            >
              {t('common.delete')}
            </Button>
          </div>
        }
      >
        <p
          className={[
            'text-[var(--text-body)]',
            'text-[var(--color-foreground)]',
            'font-[var(--font-body)]',
          ].join(' ')}
        >
          {t('profile.childForm.deleteModalBody')}
        </p>
      </Modal>
    </main>
  );
}
