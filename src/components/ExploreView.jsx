import { useState } from 'react';
import {
  CATEGORIAS,
  FILTER_GROUPS,
  PILLARS,
  formatReviewsCount,
  getAllTagsFlat,
  getImageUrl,
} from '../utils/helpers';
import {
  IconBookmark,
  IconClock,
  IconClose,
  IconFilter,
  IconMapPin,
  IconSearch,
  IconStar,
} from './Icons';

export default function ExploreView({
  locaisFiltrados,
  totalCatalogo,
  searchQuery,
  onSearchChange,
  selectedCategories,
  onToggleCategory,
  selectedTags,
  onToggleTag,
  sortBy,
  onSortChange,
  onClearFilters,
  onOpenDetail,
  onOpenSaveModal,
  getAveragesForPlace,
  getListsContainingPlace,
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFiltersCount =
    selectedCategories.length + selectedTags.length + (searchQuery.trim() ? 1 : 0);

  const handleCardKeyDown = (event, placeId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenDetail(placeId);
    }
  };

  return (
    <section aria-labelledby="explore-heading" className="explore-section">
      <div className="hero-banner">
        <h1 id="explore-heading">Encontre lugares preparados para sua família e seu pet</h1>

        <div className="search-bar-card" role="search" aria-label="Busca de locais">
          <div className="search-input-group">
            <label htmlFor="campo-busca" className="sr-only">
              Pesquisar por nome, bairro ou tipo de local
            </label>
            <span className="search-icon">
              <IconSearch size={19} />
            </span>
            <input
              id="campo-busca"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome, bairro ou tipo de local..."
              className="search-input"
            />
          </div>

          <div className="search-actions">
            <div className="sort-group">
              <label htmlFor="campo-ordenacao" className="sort-label">
                Ordenar
              </label>
              <select
                id="campo-ordenacao"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="select-input"
              >
                <option value="relevancia">Relevância</option>
                <option value="acessibilidade">Melhor Acessibilidade</option>
                <option value="infantil">Melhor Estrutura Infantil</option>
                <option value="pet">Melhor Pet Friendly</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button type="button" onClick={onClearFilters} className="btn btn-secondary btn-sm">
                Limpar ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mobile-filter-bar">
        <button
          type="button"
          className="btn btn-outline mobile-filter-toggle"
          aria-expanded={mobileFiltersOpen}
          aria-controls="painel-filtros"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
        >
          <IconFilter size={17} />
          <span>
            {mobileFiltersOpen ? 'Ocultar filtros' : 'Filtrar locais'}
            {selectedCategories.length + selectedTags.length > 0
              ? ` (${selectedCategories.length + selectedTags.length})`
              : ''}
          </span>
        </button>
      </div>

      <div className="explore-layout">
        <aside
          id="painel-filtros"
          aria-label="Filtros de busca"
          className={`filters-panel ${mobileFiltersOpen ? 'is-open' : ''}`}
        >
          <div className="filters-header">
            <h2>Filtros</h2>
            {selectedCategories.length + selectedTags.length > 0 && (
              <button type="button" onClick={onClearFilters} className="btn-link">
                Limpar
              </button>
            )}
          </div>

          <fieldset className="filter-fieldset">
            <legend>Tipo de local</legend>
            <div className="checkbox-list">
              {CATEGORIAS.map((cat) => {
                const checked = selectedCategories.includes(cat);
                return (
                  <label key={cat} className={`checkbox-label ${checked ? 'is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleCategory(cat)}
                    />
                    <span>{cat}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {FILTER_GROUPS.map((group) => (
            <fieldset key={group.key} className="filter-fieldset">
              <legend>{group.title}</legend>
              <div className="checkbox-list">
                {group.options.map((tag) => {
                  const checked = selectedTags.includes(tag);
                  return (
                    <label key={tag} className={`checkbox-label ${checked ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleTag(tag)}
                      />
                      <span>{tag}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </aside>

        <div className="results-column">
          <div className="results-toolbar" aria-live="polite">
            <p className="results-count">
              <strong>{locaisFiltrados.length}</strong> de <strong>{totalCatalogo}</strong> locais
              em João Pessoa
            </p>
          </div>

          {(selectedCategories.length > 0 || selectedTags.length > 0) && (
            <div className="active-chips" aria-label="Filtros ativos">
              {selectedCategories.map((cat) => (
                <button
                  key={`cat-${cat}`}
                  type="button"
                  className="chip-active"
                  onClick={() => onToggleCategory(cat)}
                  aria-label={`Remover filtro ${cat}`}
                >
                  <span>{cat}</span>
                  <IconClose size={13} />
                </button>
              ))}
              {selectedTags.map((tag) => (
                <button
                  key={`tag-${tag}`}
                  type="button"
                  className="chip-active"
                  onClick={() => onToggleTag(tag)}
                  aria-label={`Remover filtro ${tag}`}
                >
                  <span>{tag}</span>
                  <IconClose size={13} />
                </button>
              ))}
            </div>
          )}

          {locaisFiltrados.length === 0 ? (
            <div className="empty-state" role="status">
              <h3>Nenhum local encontrado com essa combinação</h3>
              <p>
                Remova algum filtro ou limpe a busca para ver novamente todos os locais disponíveis.
              </p>
              <button type="button" onClick={onClearFilters} className="btn btn-primary">
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="places-grid">
              {locaisFiltrados.map((local) => {
                const avg = getAveragesForPlace(local);
                const savedLists = getListsContainingPlace(local.id);
                const isSaved = savedLists.length > 0;
                const flatTags = getAllTagsFlat(local);
                const visibleTags = flatTags.slice(0, 2);
                const extraTagsCount = Math.max(0, flatTags.length - visibleTags.length);

                return (
                  <article
                    key={local.id}
                    className="place-card is-clickable"
                    role="link"
                    tabIndex={0}
                    aria-label={`Abrir detalhes de ${local.nome}, em ${local.bairro}`}
                    onClick={() => onOpenDetail(local.id)}
                    onKeyDown={(e) => handleCardKeyDown(e, local.id)}
                  >
                    <div className="card-media">
                      <img
                        src={getImageUrl(local.imagem)}
                        alt={`Foto de ${local.nome} no bairro ${local.bairro}`}
                        loading="lazy"
                        className="card-cover-img"
                      />
                      <span className="card-category-overlay">{local.categoria}</span>
                      <button
                        type="button"
                        className={`card-save-overlay ${isSaved ? 'is-saved' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSaveModal(local);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        aria-label={
                          isSaved
                            ? `Gerenciar favoritos de ${local.nome} (salvo em ${savedLists.length})`
                            : `Salvar ${local.nome} nos favoritos`
                        }
                      >
                        <IconBookmark size={17} filled={isSaved} />
                        {isSaved && <span className="save-overlay-count">{savedLists.length}</span>}
                      </button>
                    </div>

                    <div className="card-body">
                      <div className="card-title-row">
                        <h3 className="place-title">{local.nome}</h3>
                        {local.tipoOrigem === 'Espaço Público' && (
                          <span className="badge badge-public">Espaço Público</span>
                        )}
                      </div>

                      <div className="place-meta-compact">
                        <span className="meta-item">
                          <IconMapPin size={14} />
                          <span>{local.bairro}</span>
                        </span>
                        <span className="meta-sep" aria-hidden="true">•</span>
                        <span className="meta-item meta-hours">
                          <IconClock size={14} />
                          <span>{local.horario}</span>
                        </span>
                      </div>

                      <div className="tag-list tag-list-compact" aria-label="Destaques">
                        {visibleTags.map((tag) => (
                          <span key={tag} className="tag-pill">
                            {tag}
                          </span>
                        ))}
                        {extraTagsCount > 0 && (
                          <span className="tag-pill tag-pill-more">+{extraTagsCount}</span>
                        )}
                      </div>

                      <div className="card-ratings-block">
                        <div className="card-ratings-header">
                          <span className="card-ratings-label">Notas da comunidade</span>
                          <span
                            className={`card-reviews-count ${avg.total > 0 ? 'has-reviews' : ''}`}
                          >
                            <IconStar size={12} filled={avg.total > 0} />
                            <span>{formatReviewsCount(avg.total)}</span>
                          </span>
                        </div>
                        <div className="pillars-summary" aria-label="Notas por critério">
                          {PILLARS.map((pillar) => {
                            const pData = avg.pillars[pillar.key];
                            return (
                              <div key={pillar.key} className="pillar-mini-box">
                                <span className="pillar-mini-label">{pillar.shortLabel}</span>
                                <strong
                                  className={`pillar-mini-score ${
                                    pData.value === null ? 'is-empty' : ''
                                  }`}
                                >
                                  {pData.shortFormatted}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
