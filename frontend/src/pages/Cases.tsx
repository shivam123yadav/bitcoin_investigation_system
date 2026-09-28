import { useState, useEffect } from 'react';
import {
  FolderKanban,
  Clock,
  User,
  FileText,
  CheckCircle2,
  ArrowRight,
  X,
  Trash2,
} from 'lucide-react';

import {
  GlassPanel,
  RiskBadge,
  IntelligenceTag,
  LoadingState,
  CommandButton,
} from '../components/ui';

import { caseService } from '../services';
import type { Case } from '../types';
import CaseReview from './CaseReview';

export default function Cases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] =
    useState<string | null>(null);

  // Delete state
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    caseService
      .getAll()
      .then(data => {
        setCases(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load cases:', error);
        setLoading(false);
      });
  }, []);

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;

    setDeleting(true);

    try {
      await caseService.delete(caseToDelete.id);

      // Remove the deleted case immediately from the UI
      setCases(current =>
        current.filter(item => item.id !== caseToDelete.id)
      );

      setCaseToDelete(null);
    } catch (error) {
      console.error('Failed to delete case:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete case'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading cases..." />;
  }

  const filteredCases =
    statusFilter === 'all'
      ? cases
      : cases.filter(c => c.status === statusFilter);

  const statusConfig: Record<
    string,
    {
      color: string;
      icon: React.ElementType;
    }
  > = {
    open: {
      color:
        'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      icon: FolderKanban,
    },

    in_progress: {
      color:
        'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: Clock,
    },

    resolved: {
      color:
        'text-green-400 bg-green-500/10 border-green-500/20',
      icon: CheckCircle2,
    },

    archived: {
      color:
        'text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] border-[var(--color-border-subtle)]',
      icon: FileText,
    },
  };

  // ------------------------------------------------------------
  // CASE REVIEW
  // ------------------------------------------------------------

  if (selectedCaseId) {
    return (
      <CaseReview
        caseId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
      />
    );
  }

  // ------------------------------------------------------------
  // MAIN CASE PAGE
  // ------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
            Cases & Reports
          </h1>

          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            Case will be saved to the local investigation backend.
          </p>
        </div>

        <CommandButton
          variant="primary"
          onClick={() => setShowNewCaseModal(true)}
        >
          <FileText size={12} />
          New Case
        </CommandButton>
      </div>

      {/* ======================================================
          NEW CASE MODAL
      ====================================================== */}

      {showNewCaseModal && (
        <NewCaseModal
          onClose={() => setShowNewCaseModal(false)}
          onCreated={newCase => {
            setCases(current => [newCase, ...current]);
            setShowNewCaseModal(false);
          }}
        />
      )}

      {/* ======================================================
          STATUS SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-4 gap-4">
        {['open', 'in_progress', 'resolved', 'archived'].map(
          status => {
            const count = cases.filter(
              c => c.status === status
            ).length;

            const config = statusConfig[status];
            const Icon = config.icon;

            return (
              <GlassPanel
                key={status}
                className={`p-4 cursor-pointer transition-all ${
                  statusFilter === status
                    ? 'glow-cyan border-[var(--color-border-active)]'
                    : ''
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === status ? 'all' : status
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg border ${config.color}`}
                  >
                    <Icon size={14} />
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                      {status.replace('_', ' ')}
                    </p>

                    <p className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
                      {count}
                    </p>
                  </div>
                </div>
              </GlassPanel>
            );
          }
        )}
      </div>

      {/* ======================================================
          CASE CARDS
      ====================================================== */}

      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <GlassPanel className="p-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No cases found.
            </p>

            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Try changing the status filter or create a new case.
            </p>
          </GlassPanel>
        ) : (
          filteredCases.map(caseItem => {
            const config = statusConfig[caseItem.status];

            const StatusIcon = config.icon;

            return (
              <GlassPanel
                key={caseItem.id}
                className="p-5 hover:glow-cyan transition-all cursor-pointer"
                onClick={() =>
                  setSelectedCaseId(caseItem.id)
                }
              >

                {/* ==================================================
                    TOP SECTION
                ================================================== */}

                <div className="flex items-start justify-between">

                  <div className="flex items-start gap-4">

                    {/* STATUS ICON */}

                    <div
                      className={`p-2.5 rounded-lg border ${config.color}`}
                    >
                      <StatusIcon size={18} />
                    </div>

                    {/* CASE INFORMATION */}

                    <div>
                      <div className="flex items-center gap-3 mb-1">

                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {caseItem.id}
                        </h3>

                        <RiskBadge
                          priority={caseItem.priority}
                        />

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border ${config.color} capitalize`}
                        >
                          {caseItem.status.replace(
                            '_',
                            ' '
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--color-text-secondary)] max-w-lg">
                        {caseItem.summary}
                      </p>

                      <div className="flex items-center gap-4 mt-2">

                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <User size={9} />
                          {caseItem.analyst}
                        </span>

                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <Clock size={9} />
                          Created:{' '}
                          {new Date(
                            caseItem.created
                          ).toLocaleDateString()}
                        </span>

                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <Clock size={9} />
                          Updated:{' '}
                          {new Date(
                            caseItem.updated
                          ).toLocaleDateString()}
                        </span>

                      </div>
                    </div>
                  </div>

                  {/* ==================================================
                      RIGHT SIDE ACTIONS
                  ================================================== */}

                  <div className="flex items-center gap-4">

                    <div className="text-right">

                      <div className="flex items-center gap-3">

                        {/* EVIDENCE */}

                        <div className="text-center">
                          <p className="text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
                            {caseItem.evidence_count}
                          </p>

                          <p className="text-[9px] text-[var(--color-text-muted)]">
                            Evidence
                          </p>
                        </div>

                        {/* PATTERNS */}

                        <div className="text-center">
                          <p className="text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
                            {caseItem.pattern_count}
                          </p>

                          <p className="text-[9px] text-[var(--color-text-muted)]">
                            Patterns
                          </p>
                        </div>

                        {/* RELATED */}

                        <div className="text-center">
                          <p className="text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
                            {caseItem.related_entities.length}
                          </p>

                          <p className="text-[9px] text-[var(--color-text-muted)]">
                            Related
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="flex items-center gap-2">

                      {/* DELETE */}

                      <button
                        type="button"
                        title="Delete case"
                        onClick={e => {
                          e.stopPropagation();
                          setCaseToDelete(caseItem);
                        }}
                        className="p-1.5 rounded-md border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>

                      {/* REVIEW */}

                      <span className="text-[10px] text-cyan-400">
                        Review
                      </span>

                      <ArrowRight
                        size={14}
                        className="text-cyan-400"
                      />

                    </div>
                  </div>
                </div>

                {/* ==================================================
                    PRIMARY ENTITY
                ================================================== */}

                <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-center gap-4">

                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    Primary Entity:
                  </span>

                  <span className="text-xs font-mono text-cyan-400">
                    {caseItem.primary_entity}
                  </span>

                  {caseItem.related_entities.length > 0 && (
                    <>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        Related:
                      </span>

                      <div className="flex items-center gap-1">

                        {caseItem.related_entities
                          .slice(0, 3)
                          .map(e => (
                            <IntelligenceTag
                              key={e}
                              label={
                                e.slice(0, 12) + '...'
                              }
                              color="cyan"
                            />
                          ))}

                      </div>
                    </>
                  )}

                </div>

              </GlassPanel>
            );
          })
        )}
      </div>

      {/* ======================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}

      {caseToDelete && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!deleting) {
              setCaseToDelete(null);
            }
          }}
        >
          <div
            className="modal-content max-w-md"
            onClick={e => e.stopPropagation()}
          >

            {/* MODAL BODY */}

            <div className="p-5">

              <div className="flex items-start gap-3">

                <div className="p-2 rounded-lg border border-red-500/20 bg-red-500/10">
                  <Trash2
                    size={16}
                    className="text-red-400"
                  />
                </div>

                <div>

                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Delete Case
                  </h2>

                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">

                    Are you sure you want to delete{' '}

                    <span className="font-mono text-red-400">
                      {caseToDelete.id}
                    </span>
                    ?

                  </p>

                  <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
                    This will permanently remove the case
                    from the local investigation backend.
                  </p>

                </div>

              </div>

            </div>

            {/* MODAL ACTIONS */}

            <div className="p-5 border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-3">

              <button
                type="button"
                disabled={deleting}
                onClick={() =>
                  setCaseToDelete(null)
                }
                className="px-4 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteCase}
                className="px-4 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                {deleting
                  ? 'Deleting...'
                  : 'Delete Case'}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}


// ============================================================
// NEW CASE MODAL
// ============================================================

function NewCaseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (caseItem: Case) => void;
}) {

  const [title, setTitle] = useState('');
  const [description, setDescription] =
    useState('');

  const [priority, setPriority] = useState<
    'high' | 'medium' | 'low'
  >('medium');

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (!title.trim()) return;

    setSaving(true);

    try {

      const createdCase =
        await caseService.create({
          title: title.trim(),
          description: description.trim(),
          priority,
        });

      onCreated(createdCase);

    } catch (error) {

      console.error(
        'Failed to create case:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to create case'
      );

    } finally {

      setSaving(false);

    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >

      <div
        className="modal-content"
        onClick={e =>
          e.stopPropagation()
        }
      >

        <form onSubmit={handleSubmit}>

          {/* ==================================================
              MODAL HEADER
          ================================================== */}

          <div className="p-5 border-b border-[var(--color-border-subtle)]">

            <div className="flex items-center justify-between">

              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Create Case
              </h2>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <X
                  size={14}
                  className="text-[var(--color-text-muted)]"
                />
              </button>

            </div>

            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Case will be saved to the local
              investigation backend.
            </p>

          </div>

          {/* ==================================================
              FORM
          ================================================== */}

          <div className="p-5 space-y-4">

            {/* TITLE */}

            <div>

              <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
                Case Title *
              </label>

              <input
                type="text"
                value={title}
                onChange={e =>
                  setTitle(e.target.value)
                }
                required
                className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-active)] transition-colors"
                placeholder="Enter case title"
              />

            </div>

            {/* DESCRIPTION */}

            <div>

              <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
                Description
              </label>

              <textarea
                value={description}
                onChange={e =>
                  setDescription(e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-active)] transition-colors resize-none"
                placeholder="Enter case description"
              />

            </div>

            {/* PRIORITY */}

            <div>

              <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
                Priority
              </label>

              <select
                value={priority}
                onChange={e =>
                  setPriority(
                    e.target.value as
                      | 'high'
                      | 'medium'
                      | 'low'
                  )
                }
                className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-active)] transition-colors"
              >
                <option value="high">
                  High
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="low">
                  Low
                </option>
              </select>

            </div>

          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="p-5 border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-3">

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)] transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving || !title.trim()
              }
              className="px-4 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? 'Creating...'
                : 'Create Case'}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}