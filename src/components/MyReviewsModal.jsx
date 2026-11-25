import { useEffect, useRef, useState } from 'react';
import { PILLARS, formatDateBR, getImageUrl } from '../utils/helpers';
import {
  IconClose,
  IconEdit,
  IconMapPin,
  IconSearch,
  IconStar,
  IconTrash,
} from './Icons';

export default function MyReviewsModal({
  reviews,
  allPlacesById,
  hasChildModalOpen,
  onClose,
  onViewPlace,
  onEditReview,
  onDeleteReview,
  onGoExplore,
}) {
  const [confirmingDeletePlaceId, setConfirmingDeletePlaceId] = useState(null);
  const [deletingPlaceId, setDeletingPlaceId] = useState(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !hasChildModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, hasChildModalOpen]);

  const handleConfirmDelete = async (placeId) => {
    setDeletingPlaceId(placeId);
    try {
      await onDeleteReview(placeId);
      setConfirmingDeletePlaceId(null);
    } finally {
      setDeletingPlaceId(null);
    }
  };

  const total = reviews.length;
  const subtitle =
    total === 0
      ? 'Você ainda não publicou nenhuma avaliação.'
      : total === 1
        ? '1 avaliação publicada na comunidade.'
        : `${total} avaliações publicadas na comunidade.`;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !hasChildModalOpen) {
          onClose();
        }
      }}
    >
      <div
        className="modal-dialog modal-dialog-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-reviews-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="my-reviews-modal-title">Minhas avaliações</h2>
            <p className="modal-subtitle">{subtitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Fechar minhas avaliações"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="modal-body my-reviews-body">
          {total === 0 ? (
            <div className="empty-state my-reviews-empty">
              <div className="auth-gate-icon" aria-hidden="true">
                <IconStar size={24} />
              </div>
              <h3>Nenhuma avaliação publicada ainda</h3>
              <p>
                Compartilhe sua experiência sobre estrutura infantil, acessibilidade, acolhimento
                pet e atendimento para ajudar outras famílias a escolherem melhor.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onGoExplore();
                }}
              >
                <IconSearch size={16} />
                <span>Explorar locais</span>
              </button>
            </div>
          ) : (
            <ol className="my-reviews-list">
              {reviews.map((rev) => {
                const place = allPlacesById[rev.placeId];
                const isConfirming = confirmingDeletePlaceId === rev.placeId;
                const isDeleting = deletingPlaceId === rev.placeId;

                return (
                  <li key={rev.id} className="my-review-card">
                    <div className="my-review-top">
                      <div className="my-review-place-info">
                        {place?.imagem && (
                          <img
                            src={getImageUrl(place.imagem)}
                            alt={`Foto de ${place.nome}`}
                            className="my-review-thumb"
                            loading="lazy"
                          />
                        )}
                        <div className="my-review-place-text">
                          <h3 className="my-review-place-name">
                            {place ? place.nome : rev.placeId}
                          </h3>
                          {place && (
                            <p className="my-review-place-meta">
                              <span>{place.categoria}</span>
                              <span aria-hidden="true">•</span>
                              <span className="meta-item">
                                <IconMapPin size={13} />
                                <span>{place.bairro}</span>
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="review-date-group">
                        <time dateTime={rev.data}>{formatDateBR(rev.data)}</time>
                        {rev.edited && <span className="badge badge-edited">Editada</span>}
                      </div>
                    </div>

                    <div className="review-pillars-strip">
                      {PILLARS.map((pillar) => {
                        const val = rev.pilares?.[pillar.key];
                        const isRated = typeof val === 'number' && val >= 1 && val <= 5;
                        return (
                          <span
                            key={pillar.key}
                            className={`review-pillar-pill ${isRated ? '' : 'is-na'}`}
                            title={
                              isRated
                                ? `${pillar.label}: ${val} de 5`
                                : `${pillar.label}: Não se aplica`
                            }
                          >
                            {pillar.shortLabel}:{' '}
                            <strong>{isRated ? `${val}/5` : 'Não se aplica'}</strong>
                          </span>
                        );
                      })}
                    </div>

                    {rev.comentario ? (
                      <p className="review-comment">{rev.comentario}</p>
                    ) : (
                      <p className="review-comment is-muted">
                        Avaliação registrada sem comentário.
                      </p>
                    )}

                    <div className="review-user-footer">
                      {!isConfirming ? (
                        <div className="review-user-actions">
                          {place && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => onViewPlace(place.id)}
                            >
                              <span>Ver local</span>
                            </button>
                          )}
                          {place && (
                            <button
                              type="button"
                              className="btn btn-outline btn-xs"
                              onClick={() => onEditReview(place)}
                            >
                              <IconEdit size={14} />
                              <span>Editar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger-outline btn-xs"
                            onClick={() => setConfirmingDeletePlaceId(rev.placeId)}
                          >
                            <IconTrash size={14} />
                            <span>Excluir</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="review-delete-confirm"
                          role="alertdialog"
                          aria-label={`Confirmar exclusão da avaliação de ${place?.nome || 'local'}`}
                        >
                          <p>Excluir sua avaliação?</p>
                          <div className="confirm-buttons">
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              disabled={isDeleting}
                              onClick={() => handleConfirmDelete(rev.placeId)}
                            >
                              {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-xs"
                              disabled={isDeleting}
                              onClick={() => setConfirmingDeletePlaceId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
