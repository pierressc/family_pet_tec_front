import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PILLARS,
  buildWhatsAppUrl,
  formatDateBR,
  getImageUrl,
  getReviewAverageScore,
  getVitrineImageUrl,
  getVitrineTabLabel,
} from '../utils/helpers';
import {
  IconBookmark,
  IconClock,
  IconClose,
  IconEdit,
  IconExternalLink,
  IconInfo,
  IconMapPin,
  IconMessage,
  IconStar,
  IconTrash,
} from './Icons';

export default function DetailView({
  local,
  avaliacoes,
  averages,
  savedLists,
  existingUserReview,
  focusReviewsToken,
  hasChildModalOpen,
  onClose,
  onOpenRatingModal,
  onDeleteReview,
  onOpenSaveModal,
}) {
  const [activeTab, setActiveTab] = useState('visao');
  const [reviewSort, setReviewSort] = useState('recentes');
  const [confirmingDeleteReview, setConfirmingDeleteReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  const closeBtnRef = useRef(null);
  const tabRefs = useRef({});
  const reviewsPanelRef = useRef(null);
  const lastFocusTokenRef = useRef(focusReviewsToken);

  // Sempre abrir na aba "Visão geral" ao trocar de local
  useEffect(() => {
    setActiveTab('visao');
    setReviewSort('recentes');
    setConfirmingDeleteReview(false);
    closeBtnRef.current?.focus();
  }, [local?.id]);

  // Redirecionar automaticamente para "Avaliações" após publicar, editar ou excluir avaliação
  useEffect(() => {
    if (focusReviewsToken > lastFocusTokenRef.current) {
      lastFocusTokenRef.current = focusReviewsToken;
      setActiveTab('avaliacoes');
      setReviewSort('recentes');
      setConfirmingDeleteReview(false);
      window.requestAnimationFrame(() => {
        reviewsPanelRef.current?.focus();
      });
    }
  }, [focusReviewsToken]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !hasChildModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, hasChildModalOpen]);

  const sortedReviews = useMemo(() => {
    const copy = [...(avaliacoes || [])];
    const getTimeKey = (rev) => rev.timestamp || `${rev.data || '2000-01-01'}T00:00:00.000Z`;

    if (reviewSort === 'maiores') {
      return copy.sort((a, b) => {
        const diff = getReviewAverageScore(b) - getReviewAverageScore(a);
        if (diff !== 0) return diff;
        return String(getTimeKey(b)).localeCompare(String(getTimeKey(a)));
      });
    }

    if (reviewSort === 'menores') {
      return copy.sort((a, b) => {
        const diff = getReviewAverageScore(a) - getReviewAverageScore(b);
        if (diff !== 0) return diff;
        return String(getTimeKey(b)).localeCompare(String(getTimeKey(a)));
      });
    }

    // Padrão: Mais recentes
    return copy.sort((a, b) => String(getTimeKey(b)).localeCompare(String(getTimeKey(a))));
  }, [avaliacoes, reviewSort]);

  if (!local) return null;

  const isSaved = savedLists.length > 0;
  const hasUserReview = Boolean(existingUserReview);
  const whatsappUrl = buildWhatsAppUrl(local.contato?.whatsapp, local.nome);
  const siteUrl = local.contato?.site || '';
  const vitrineLabel = getVitrineTabLabel(local.categoria);

  const tabs = [
    { id: 'visao', label: 'Visão geral' },
    { id: 'vitrine', label: vitrineLabel },
    { id: 'avaliacoes', label: `Avaliações (${averages.total})` },
  ];

  const handleTabKeyDown = (event, currentIndex) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextTabId = tabs[nextIndex].id;
      setActiveTab(nextTabId);
      tabRefs.current[nextTabId]?.focus();
    }
  };

  const tagSections = [
    {
      title: 'Estrutura Infantil',
      items: local.tags?.infantil || [],
      emptyText: 'Sem itens infantis específicos informados.',
    },
    {
      title: 'Acessibilidade',
      items: local.tags?.acessibilidade || [],
      emptyText: 'Sem itens de acessibilidade física informados.',
    },
    {
      title: 'Conforto Sensorial',
      items: local.tags?.sensorial || [],
      emptyText: 'Sem informações sensoriais específicas.',
    },
    {
      title: 'Pet Friendly',
      items: local.tags?.pet || [],
      emptyText:
        local.tipoOrigem === 'Espaço Público'
          ? 'Não permite animais domésticos (proteção à fauna silvestre ou patrimônio).'
          : 'Não há informação de área pet neste local.',
    },
  ];

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
        aria-labelledby="detail-heading"
      >
        <div className="modal-header detail-modal-header">
          <div className="detail-modal-heading-wrap">
            <div className="badge-row">
              <span
                className={`badge ${
                  local.tipoOrigem === 'Espaço Público' ? 'badge-public' : 'badge-local'
                }`}
              >
                {local.tipoOrigem}
              </span>
              <span className="badge badge-category">{local.categoria}</span>
            </div>
            <h2 id="detail-heading" className="detail-modal-title">
              {local.nome}
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label={`Fechar detalhes de ${local.nome}`}
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="detail-modal-scroll">
          <div className="detail-cover-wrap">
            <img
              src={getImageUrl(local.imagem)}
              alt={`Foto de capa de ${local.nome} no bairro ${local.bairro}`}
              className="detail-cover-img"
            />
          </div>

          <div className="detail-top-summary">
            <div className="detail-meta-list">
              <div className="meta-item">
                <IconMapPin size={16} />
                <span>{local.endereco}</span>
              </div>
              <div className="meta-item">
                <IconClock size={16} />
                <span>{local.horario}</span>
              </div>
            </div>

            <div className="detail-primary-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onOpenRatingModal}
              >
                {hasUserReview ? <IconEdit size={15} /> : <IconStar size={16} filled />}
                <span>{hasUserReview ? 'Editar minha avaliação' : 'Avaliar local'}</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${isSaved ? 'btn-saved' : 'btn-secondary'}`}
                onClick={() => onOpenSaveModal(local)}
              >
                <IconBookmark size={16} filled={isSaved} />
                <span>{isSaved ? `Salvo (${savedLists.length})` : 'Salvar'}</span>
              </button>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-sm"
                >
                  <IconMessage size={16} />
                  <span>WhatsApp</span>
                  <IconExternalLink size={13} />
                </a>
              )}

              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <span>Site oficial</span>
                  <IconExternalLink size={13} />
                </a>
              )}
            </div>
          </div>

          <div className="detail-tabs-bar" role="tablist" aria-label="Seções do local">
            {tabs.map((tab, index) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  id={`detail-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`detail-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`detail-tab-btn ${selected ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="detail-modal-content">
            {/* ABA 1: VISÃO GERAL */}
            {activeTab === 'visao' && (
              <div
                id="detail-panel-visao"
                role="tabpanel"
                aria-labelledby="detail-tab-visao"
                className="detail-tabpanel"
              >
                <p className="detail-description">{local.descricao}</p>

                <section className="detail-subcard" aria-labelledby="tags-heading">
                  <h3 id="tags-heading" className="detail-subcard-title">
                    O que o local oferece
                  </h3>
                  <div className="tag-groups-grid">
                    {tagSections.map((sec) => (
                      <div key={sec.title} className="tag-group-block">
                        <h4>{sec.title}</h4>
                        {sec.items.length > 0 ? (
                          <div className="tag-list">
                            {sec.items.map((tag) => (
                              <span key={tag} className="tag-pill tag-pill-detail">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="tag-empty-note">{sec.emptyText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ABA 2: CARDÁPIO OU DESTAQUES */}
            {activeTab === 'vitrine' && (
              <div
                id="detail-panel-vitrine"
                role="tabpanel"
                aria-labelledby="detail-tab-vitrine"
                className="detail-tabpanel"
              >
                <div className="vitrine-grid">
                  {(local.vitrine || []).map((item) => (
                    <article key={item.nome} className="vitrine-card">
                      <div className="vitrine-media">
                        <img
                          src={getVitrineImageUrl(item.imagem)}
                          alt={`Foto ilustrativa de ${item.nome}`}
                          loading="lazy"
                          className="vitrine-img"
                        />
                        {item.favoritoDaCasa && (
                          <span className="vitrine-fav-overlay">Favorito da Casa</span>
                        )}
                      </div>
                      <div className="vitrine-card-body">
                        <h3 className="vitrine-item-title">{item.nome}</h3>
                        <p className="vitrine-price">{item.faixaPreco}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="info-banner" role="note">
                  <IconInfo size={16} />
                  <p>
                    Valores e itens têm caráter informativo. Para reservas, pedidos ou dúvidas,
                    entre em contato diretamente com o local.
                  </p>
                </div>
              </div>
            )}

            {/* ABA 3: AVALIAÇÕES */}
            {activeTab === 'avaliacoes' && (
              <div
                id="detail-panel-avaliacoes"
                ref={reviewsPanelRef}
                role="tabpanel"
                aria-labelledby="detail-tab-avaliacoes"
                tabIndex={-1}
                className="detail-tabpanel"
              >
                <section className="detail-subcard" aria-labelledby="pillars-heading">
                  <div className="card-title-row">
                    <h3 id="pillars-heading" className="detail-subcard-title">
                      Resumo das notas
                    </h3>
                    <span className="pill-counter">
                      {averages.total === 0
                        ? 'Sem avaliações'
                        : `${averages.total} ${averages.total === 1 ? 'avaliação' : 'avaliações'}`}
                    </span>
                  </div>

                  <div className="pillars-detail-grid">
                    {PILLARS.map((pillar) => {
                      const pData = averages.pillars[pillar.key];
                      const pct = pData.value !== null ? Math.round((pData.value / 5) * 100) : 0;
                      return (
                        <div key={pillar.key} className="pillar-row-card">
                          <div className="pillar-row-top">
                            <div>
                              <h4>{pillar.label}</h4>
                              <p className="pillar-help-text">{pillar.description}</p>
                            </div>
                            <div
                              className={`pillar-score-badge ${
                                pData.value === null ? 'is-empty' : ''
                              }`}
                            >
                              {pData.value !== null ? (
                                <>
                                  <IconStar size={14} filled />
                                  <span>{pData.formatted} / 5,0</span>
                                </>
                              ) : (
                                <span>{pData.formatted}</span>
                              )}
                            </div>
                          </div>
                          <div
                            className="meter-track"
                            role="progressbar"
                            aria-label={`Nota de ${pillar.label}`}
                            aria-valuemin={0}
                            aria-valuemax={5}
                            aria-valuenow={pData.value ?? 0}
                            aria-valuetext={
                              pData.value !== null ? `${pData.formatted} de 5` : pData.formatted
                            }
                          >
                            <div className="meter-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="detail-subcard" aria-labelledby="reviews-heading">
                  <div className="reviews-toolbar">
                    <h3 id="reviews-heading" className="detail-subcard-title">
                      Comentários da Comunidade
                    </h3>

                    <div className="reviews-controls">
                      {sortedReviews.length > 1 && (
                        <div className="sort-group">
                          <label htmlFor="ordem-avaliacoes" className="sort-label-sm">
                            Ordenar
                          </label>
                          <select
                            id="ordem-avaliacoes"
                            value={reviewSort}
                            onChange={(e) => setReviewSort(e.target.value)}
                            className="select-input select-sm"
                          >
                            <option value="recentes">Mais recentes</option>
                            <option value="maiores">Maiores notas</option>
                            <option value="menores">Menores notas</option>
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onOpenRatingModal}
                      >
                        {hasUserReview ? 'Editar minha avaliação' : 'Avaliar local'}
                      </button>
                    </div>
                  </div>

                  {sortedReviews.length === 0 ? (
                    <div className="empty-inline">
                      <p>
                        Ainda não há avaliações para este local. Compartilhe como foi sua visita.
                      </p>
                    </div>
                  ) : (
                    <ol className="reviews-list">
                      {sortedReviews.map((rev) => (
                        <li
                          key={rev.id}
                          className={`review-card ${rev.isUserReview ? 'is-user-review' : ''}`}
                        >
                          <div className="review-header">
                            <div className="review-author-group">
                              <strong>{rev.autor}</strong>
                              {rev.isUserReview && (
                                <span className="badge badge-user-review">Sua avaliação</span>
                              )}
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
                                  <strong>{isRated ? `${val}/5` : 'N/A'}</strong>
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

                          {rev.isUserReview && (
                            <div className="review-user-footer">
                              {!confirmingDeleteReview ? (
                                <div className="review-user-actions">
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-xs"
                                    onClick={onOpenRatingModal}
                                  >
                                    <IconEdit size={14} />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger-outline btn-xs"
                                    onClick={() => setConfirmingDeleteReview(true)}
                                  >
                                    <IconTrash size={14} />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="review-delete-confirm"
                                  role="alertdialog"
                                  aria-label="Confirmar exclusão da sua avaliação"
                                >
                                  <p>Excluir sua avaliação?</p>
                                  <div className="confirm-buttons">
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-xs"
                                      disabled={isDeletingReview}
                                      onClick={async () => {
                                        setIsDeletingReview(true);
                                        try {
                                          await onDeleteReview(local.id);
                                          setConfirmingDeleteReview(false);
                                        } finally {
                                          setIsDeletingReview(false);
                                        }
                                      }}
                                    >
                                      {isDeletingReview ? 'Excluindo...' : 'Confirmar exclusão'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-xs"
                                      disabled={isDeletingReview}
                                      onClick={() => setConfirmingDeleteReview(false)}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
