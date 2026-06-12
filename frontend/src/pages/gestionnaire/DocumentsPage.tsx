import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Download, Trash2, FileText, Pencil } from 'lucide-react'
import {
  getDocuments,
  storeDocument,
  updateDocument,
  deleteDocument,
  type GestDoc,
} from '@/services/documents.service'
import { getResidences } from '@/services/gestionnaire.service'
import { useResidenceStore } from '@/stores/residenceStore'
import { ResidenceFilter } from '@/components/shared'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Constants ────────────────────────────────────────────────────────────────

type DocType = GestDoc['type']

const DOC_TYPES: DocType[] = [
  'reglement',
  'pv_ag',
  'contrat',
  'facture',
  'autre',
]

const TYPE_BADGE_STYLES: Record<DocType, string> = {
  reglement: 'bg-blue-100 text-blue-800',
  pv_ag: 'bg-purple-100 text-purple-800',
  contrat: 'bg-green-100 text-green-800',
  facture: 'bg-orange-100 text-orange-800',
  autre: 'bg-gray-100 text-gray-600',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(ko: number): string {
  if (ko >= 1024) return `${(ko / 1024).toFixed(1)} MB`
  return `${ko} KB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Add form state type ───────────────────────────────────────────────────────

type AddForm = {
  nom: string
  type: DocType
  categorie_libre: string
  residence_id: string
  date: string
  file: File | null
}

const EMPTY_FORM: AddForm = {
  nom: '',
  type: 'autre',
  categorie_libre: '',
  residence_id: '',
  date: '',
  file: null,
}

/** Label shown for a document's category — custom free-text when type=autre. */
function categoryLabel(
  doc: Pick<GestDoc, 'type' | 'categorie_libre'>,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  if (doc.type === 'autre' && doc.categorie_libre) return doc.categorie_libre
  return t(`gestionnaire.documents.type.${doc.type}`, {
    defaultValue: doc.type,
  })
}

type TFn = (k: string, o?: Record<string, unknown>) => string

// ─── Shared metadata fields (Add + Edit dialogs) ───────────────────────────────

function DocFields({
  form,
  setForm,
  residences,
  t,
}: {
  form: AddForm
  setForm: React.Dispatch<React.SetStateAction<AddForm>>
  residences: Array<{ id: number; name: string }>
  t: TFn
}) {
  return (
    <>
      {/* Nom */}
      <div className="space-y-1">
        <Label htmlFor="doc-nom">
          {t('gestionnaire.documents.form.nom', {
            defaultValue: 'Nom du document',
          })}
        </Label>
        <Input
          id="doc-nom"
          value={form.nom}
          onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
          placeholder={t('gestionnaire.documents.form.nomPlaceholder', {
            defaultValue: 'Ex: Règlement de copropriété 2026',
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Type */}
        <div className="space-y-1">
          <Label>
            {t('gestionnaire.documents.form.type', { defaultValue: 'Type' })}
          </Label>
          <Select
            value={form.type}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                type: v as DocType,
                // Drop the custom label when leaving "autre".
                categorie_libre: v === 'autre' ? f.categorie_libre : '',
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`gestionnaire.documents.type.${type}`, {
                    defaultValue: type,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label htmlFor="doc-date">
            {t('gestionnaire.documents.form.date', { defaultValue: 'Date' })}
          </Label>
          <Input
            id="doc-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
      </div>

      {/* Custom category — only when type = autre */}
      {form.type === 'autre' && (
        <div className="space-y-1">
          <Label htmlFor="doc-cat">
            {t('gestionnaire.documents.form.customCategory', {
              defaultValue: 'Catégorie personnalisée',
            })}
          </Label>
          <Input
            id="doc-cat"
            value={form.categorie_libre}
            onChange={(e) =>
              setForm((f) => ({ ...f, categorie_libre: e.target.value }))
            }
            placeholder={t(
              'gestionnaire.documents.form.customCategoryPlaceholder',
              {
                defaultValue: 'Ex: Manuel, Plan, Attestation…',
              },
            )}
          />
        </div>
      )}

      {/* Résidence (optional) */}
      <div className="space-y-1">
        <Label>
          {t('gestionnaire.documents.form.residence', {
            defaultValue: 'Résidence (optionnel)',
          })}
        </Label>
        <Select
          value={form.residence_id || '_all'}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, residence_id: v === '_all' ? '' : v }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={t('gestionnaire.documents.allResidences', {
                defaultValue: 'Toutes les résidences',
              })}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">
              {t('gestionnaire.documents.allResidences', {
                defaultValue: 'Toutes les résidences',
              })}
            </SelectItem>
            {residences.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

// ─── Page component ───────────────────────────────────────────────────────────

export function DocumentsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [filterType, setFilterType] = useState<DocType | '_all'>('_all')
  const residenceId = useResidenceStore((s) => s.residenceId)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<AddForm>(EMPTY_FORM)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteTarget, setDeleteTarget] = useState<GestDoc | null>(null)

  const [editTarget, setEditTarget] = useState<GestDoc | null>(null)
  const [editForm, setEditForm] = useState<AddForm>(EMPTY_FORM)

  function openEdit(doc: GestDoc) {
    setEditForm({
      nom: doc.nom,
      type: doc.type,
      categorie_libre: doc.categorie_libre ?? '',
      residence_id: doc.residence ? String(doc.residence.id) : '',
      date: doc.date.slice(0, 10),
      file: null,
    })
    setEditTarget(doc)
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getDocuments(),
  })

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  // ── Derived filtered list ─────────────────────────────────────────────────

  const filtered = docs.filter((d) => {
    const typeOk = filterType === '_all' || d.type === filterType
    // Global residence scope (KAN-47): null = all (incl. cabinet-wide docs).
    const resOk = residenceId === null || d.residence?.id === residenceId
    return typeOk && resOk
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('nom', form.nom)
      fd.append('type', form.type)
      fd.append('date', form.date)
      if (form.type === 'autre' && form.categorie_libre.trim())
        fd.append('categorie_libre', form.categorie_libre.trim())
      if (form.residence_id) fd.append('residence_id', form.residence_id)
      if (form.file) fd.append('file', form.file)
      return storeDocument(fd)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      toast.success(
        t('gestionnaire.documents.addSuccess', {
          defaultValue: 'Document ajouté',
        }),
      )
    },
    onError: () =>
      toast.error(
        t('gestionnaire.documents.addError', {
          defaultValue: "Erreur lors de l'ajout",
        }),
      ),
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editTarget) throw new Error('no edit target')
      return updateDocument(editTarget.id, {
        nom: editForm.nom.trim(),
        type: editForm.type,
        categorie_libre:
          editForm.type === 'autre'
            ? editForm.categorie_libre.trim() || null
            : null,
        residence_id: editForm.residence_id
          ? Number(editForm.residence_id)
          : null,
        date: editForm.date,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] })
      setEditTarget(null)
      toast.success(
        t('gestionnaire.documents.updateSuccess', {
          defaultValue: 'Document modifié',
        }),
      )
    },
    onError: () =>
      toast.error(
        t('gestionnaire.documents.updateError', {
          defaultValue: 'Erreur lors de la modification',
        }),
      ),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] })
      setDeleteTarget(null)
      toast.success(
        t('gestionnaire.documents.deleteSuccess', {
          defaultValue: 'Document supprimé',
        }),
      )
    },
    onError: () =>
      toast.error(
        t('gestionnaire.documents.deleteError', {
          defaultValue: 'Erreur lors de la suppression',
        }),
      ),
  })

  // ── Form validation ───────────────────────────────────────────────────────

  const isFormValid =
    form.nom.trim() !== '' && form.date !== '' && form.file !== null

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<GestDoc>[] = [
    {
      key: 'nom',
      header: t('gestionnaire.documents.col.nom', { defaultValue: 'Nom' }),
      sortable: true,
      renderCell: (doc) => <span className="font-medium">{doc.nom}</span>,
    },
    {
      key: 'type',
      header: t('gestionnaire.documents.col.type', { defaultValue: 'Type' }),
      renderCell: (doc) => (
        <Badge
          className={`${TYPE_BADGE_STYLES[doc.type]} border-0 text-xs hover:opacity-80`}
        >
          {categoryLabel(doc, t)}
        </Badge>
      ),
    },
    {
      key: 'residence',
      header: t('gestionnaire.documents.col.residence', {
        defaultValue: 'Résidence',
      }),
      renderCell: (doc) =>
        doc.residence ? (
          <span>{doc.residence.name}</span>
        ) : (
          <span className="text-muted-foreground text-xs">
            {t('gestionnaire.documents.allResidences', {
              defaultValue: 'Toutes',
            })}
          </span>
        ),
    },
    {
      key: 'date',
      header: t('gestionnaire.documents.col.date', { defaultValue: 'Date' }),
      sortable: true,
      renderCell: (doc) => <span>{formatDate(doc.date)}</span>,
    },
    {
      key: 'taille_ko',
      header: t('gestionnaire.documents.col.taille', {
        defaultValue: 'Taille',
      }),
      renderCell: (doc) => (
        <span className="text-muted-foreground text-sm">
          {formatSize(doc.taille_ko)}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      className: 'w-32 text-right',
      renderCell: (doc) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
            title={t('gestionnaire.documents.download', {
              defaultValue: 'Télécharger PDF',
            })}
          >
            <a
              href={doc.url}
              download={doc.nom.endsWith('.pdf') ? doc.nom : `${doc.nom}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="size-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(doc)}
            title={t('gestionnaire.documents.edit', {
              defaultValue: 'Renommer / modifier',
            })}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(doc)}
            className="text-destructive hover:text-destructive"
            title={t('gestionnaire.documents.delete', {
              defaultValue: 'Supprimer',
            })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.documents.title', { defaultValue: 'Documents' })}
        subtitle={t('gestionnaire.documents.subtitle', {
          defaultValue: 'Gérez les documents de vos résidences',
        })}
        actions={
          <div className="flex items-center gap-2">
            <ResidenceFilter />
            <Button onClick={() => setAddOpen(true)} size="sm">
              <Plus className="me-1.5 size-4" />
              {t('gestionnaire.documents.add', { defaultValue: 'Ajouter' })}
            </Button>
          </div>
        }
      />

      {/* Filter row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as DocType | '_all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">
              {t('gestionnaire.documents.filterAllTypes', {
                defaultValue: 'Tous les types',
              })}
            </SelectItem>
            {DOC_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`gestionnaire.documents.type.${type}`, {
                  defaultValue: type,
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Résidence is now scoped globally via the sidebar selector (KAN-47). */}
      </div>

      {/* Data table */}
      <DataTable
        data={filtered}
        columns={columns}
        rowKey="id"
        isLoading={isLoading}
        searchable
        searchPlaceholder={t('gestionnaire.documents.searchPlaceholder', {
          defaultValue: 'Rechercher un document…',
        })}
        emptyIcon={<FileText className="size-12" />}
        emptyTitle={t('gestionnaire.documents.emptyTitle', {
          defaultValue: 'Aucun document',
        })}
        emptyDescription={t('gestionnaire.documents.emptyDesc', {
          defaultValue:
            'Ajoutez votre premier document en cliquant sur Ajouter.',
        })}
      />

      {/* Add dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setForm(EMPTY_FORM)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('gestionnaire.documents.addDialog.title', {
                defaultValue: 'Ajouter un document',
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <DocFields
              form={form}
              setForm={setForm}
              residences={residences}
              t={t}
            />

            {/* File */}
            <div className="space-y-1">
              <Label htmlFor="doc-file">
                {t('gestionnaire.documents.form.file', {
                  defaultValue: 'Fichier',
                })}
              </Label>
              <Input
                id="doc-file"
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setForm((f) => ({ ...f, file }))
                }}
              />
              {form.file && (
                <p className="text-xs text-muted-foreground">
                  {form.file.name} —{' '}
                  {formatSize(Math.round(form.file.size / 1024))}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false)
                setForm(EMPTY_FORM)
              }}
              disabled={addMutation.isPending}
            >
              {t('actions.cancel', { defaultValue: 'Annuler' })}
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!isFormValid || addMutation.isPending}
            >
              {addMutation.isPending
                ? t('actions.loading', { defaultValue: 'Chargement…' })
                : t('actions.save', { defaultValue: 'Enregistrer' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / rename dialog */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('gestionnaire.documents.editDialog.title', {
                defaultValue: 'Modifier le document',
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <DocFields
              form={editForm}
              setForm={setEditForm}
              residences={residences}
              t={t}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={updateMutation.isPending}
            >
              {t('actions.cancel', { defaultValue: 'Annuler' })}
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={
                editForm.nom.trim() === '' ||
                editForm.date === '' ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending
                ? t('actions.loading', { defaultValue: 'Chargement…' })
                : t('actions.save', { defaultValue: 'Enregistrer' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={t('gestionnaire.documents.deleteConfirm.title', {
          defaultValue: 'Supprimer le document ?',
        })}
        description={
          deleteTarget
            ? t('gestionnaire.documents.deleteConfirm.desc', {
                defaultValue: `Le document "${deleteTarget.nom}" sera définitivement supprimé.`,
                nom: deleteTarget.nom,
              })
            : ''
        }
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
