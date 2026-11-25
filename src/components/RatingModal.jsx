import { useEffect, useRef, useState } from 'react';
import { PILLARS } from '../utils/helpers';
import { IconClose, IconShield, IconStar, IconTrash, IconUser } from './Icons';

const MAX_COMMENT = 500;

function getInitialScores(existingReview) {
  if (!existingReview?.pilares) {
    return {
      infantil: undefined,
      acessibilidade: undefined,
      pet: undefined,
      atendimento: undefined,
    };
  }
  const initial = {};
  for (const pillar of PILLARS) {
    const val = existingReview.pilares[pillar.key];
    initial[pillar.key] = typeof val === 'number' && val >= 1 && val <= 5 ? val : null;
  }
  return initial;
}

export default function RatingModal({
  local,
  authorName,
  existingReview = null,
  onClose,
  onSubmit,
  onDelete,
}) {
  const isEditing = Boolean(existingReview);

  // undefined = não marcado | 1..5 = nota numérica | null = Não se aplica
  const [scores, setScores] = useState(() => getInitialScores(existingReview));
  const [comentario, setComentario] = useState(() => existingReview?.comentario || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleSelectScore = (pillarKey, value) => {
    setScores((prev) => ({ ...prev, [pillarKey]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const unmarked = PILLARS.filter((p) => scores[p.key] === undefined);
    if (unmarked.length > 0) {
      setErrorMsg(
        `Selecione uma nota de 1 a 5 ou "Não se aplica" para: ${unmarked
          .map((m) => m.label)
          .join(', ')}.`
      );
      return;
    }

    const ratedCount = PILLARS.filter(
      (p) => typeof scores[p.key] === 'number' && scores[p.key] >= 1 && scores[p.key] <= 5
    ).length;
    if (ratedCount === 0) {
      setErrorMsg(
        'Atribua uma nota de 1 a 5 estrelas em pelo menos um dos quatro critérios para enviar sua avaliação.'
      );
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        pilares: { ...scores },
        comentario: comentario.trim().slice(0, MAX_COMMENT),
      });
      if (res && !res.ok && res.error) {
        setErrorMsg(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await onDelete();
      if (res && !res.ok && res.error) {
        setErrorMsg(res.error);
        setConfirmingDelete(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop modal-backdrop-top"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="rating-modal-title">{isEditing ? 'Editar avaliação' : 'Avaliar local'}</h2>
            <p className="modal-subtitle">{local.nome}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar janela de avaliação"
          >
            <IconClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="modal-body">
          <div className="rating-author-banner" role="status">
            <IconUser size={16} />
            <span>
              Avaliando como <strong>{authorName}</strong>
            </span>
          </div>

          <p className="form-lead">
            Avalie de 1 a 5 estrelas os critérios que você vivenciou ou marque &ldquo;Não se
            aplica&rdquo; nos demais (é necessário atribuir nota em pelo menos um critério).
          </p>

          {errorMsg && (
            <div className="alert-error" role="alert">
              {errorMsg}
            </div>
          )}

          <div className="rating-pillars-stack">
            {PILLARS.map((pillar) => {
              const current = scores[pillar.key];
              const isNA = current === null;
              const numericScore = typeof current === 'number' ? current : 0;

              return (
                <fieldset key={pillar.key} className="rating-pillar-fieldset">
                  <legend>{pillar.label}</legend>
                  <p className="pillar-help-text">{pillar.description}</p>
                  <div
                    className="star-rating-row"
                    role="group"
                    aria-label={`Avaliação para ${pillar.label}`}
                  >
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = numericScore > 0 && value <= numericScore;
                      const selected = numericScore === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`star-btn ${active ? 'is-active' : ''}`}
                          aria-pressed={selected}
                          aria-label={`Nota ${value} de 5 para ${pillar.label}`}
                          onClick={() => handleSelectScore(pillar.key, value)}
                          disabled={isSubmitting}
                        >
                          <IconStar size={19} filled={active} />
                          <span>{value}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className={`na-btn ${isNA ? 'is-active' : ''}`}
                      aria-pressed={isNA}
                      aria-label={`Marcar ${pillar.label} como Não se aplica`}
                      onClick={() => handleSelectScore(pillar.key, null)}
                      disabled={isSubmitting}
                    >
                      Não se aplica
                    </button>
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div className="form-field">
            <div className="label-with-counter">
              <label htmlFor="campo-comentario">Comentário sobre a visita (opcional)</label>
              <span className="char-counter" aria-live="polite">
                {comentario.length} / {MAX_COMMENT} caracteres
              </span>
            </div>
            <textarea
              id="campo-comentario"
              rows={4}
              maxLength={MAX_COMMENT}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte como foi o acolhimento, o ruído, a acessibilidade, o espaço kids ou a área pet..."
              className="textarea-input"
              disabled={isSubmitting}
            />
          </div>

          <div className="privacy-notice" role="note">
            <IconShield size={17} />
            <p>
              Sua avaliação é pública e exibe apenas seu nome de exibição. Você pode editar ou
              excluir sua avaliação quando quiser.
            </p>
          </div>

          <div className={`modal-footer ${isEditing ? 'modal-footer-split' : ''}`}>
            {isEditing && onDelete && (
              <div className="modal-delete-area">
                {!confirmingDelete ? (
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={isSubmitting}
                  >
                    <IconTrash size={15} />
                    <span>Excluir avaliação</span>
                  </button>
                ) : (
                  <div
                    className="modal-delete-confirm"
                    role="alertdialog"
                    aria-label="Confirmar exclusão da avaliação"
                  >
                    <span>Tem certeza?</span>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={handleConfirmDelete}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Excluindo...' : 'Confirmar exclusão'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-primary-buttons">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditing
                    ? 'Salvando...'
                    : 'Publicando...'
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Publicar avaliação'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
