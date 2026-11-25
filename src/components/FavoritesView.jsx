import { useState } from 'react';
import { PILLARS, getImageUrl } from '../utils/helpers';
import {
  IconClock,
  IconEdit,
  IconLock,
  IconLogIn,
  IconMapPin,
  IconPlus,
  IconTrash,
} from './Icons';

export default function FavoritesView({
  isAuthenticated,
  isLoadingLists,
  lists,
  allPlacesById,
  getAveragesForPlace,
  onOpenAuthModal,
  onCreateList,
  onRenameList,
  onDeleteList,
  onRemovePlaceFromList,
  onOpenDetail,
  onGoExplore,
}) {
  const [selectedListId, setSelectedListId] = useState(lists[0]?.id || '');
  const [newListName, setNewListName] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  if (!isAuthenticated) {
    return (
      <section aria-labelledby="favorites-heading" className="favorites-section">
        <header className="page-header-block">
          <h1 id="favorites-heading">Meus Favoritos</h1>
          <p>Organize seus locais preferidos em listas personalizadas para cada tipo de passeio.</p>
        </header>

        <div className="empty-state auth-gate-card">
          <div className="auth-gate-icon" aria-hidden="true">
            <IconLock size={24} />
          </div>
          <h2>Salve suas listas de favoritos na nuvem</h2>
          <p>
            Entre na sua conta ou crie um cadastro gratuito para montar listas como &ldquo;Passeios
            com Pets&rdquo;, &ldquo;Locais com Baixo Ruído&rdquo; ou &ldquo;Almoço em Família&rdquo;
            e acessar tudo em qualquer dispositivo.
          </p>
          <div className="auth-gate-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                onOpenAuthModal(
                  'login',
                  'Entre na sua conta ou crie um cadastro gratuito para criar e acessar suas listas de favoritos.'
                )
              }
            >
              <IconLogIn size={17} />
              <span>Entrar ou criar conta</span>
            </button>
            <button type="button" className="btn btn-outline" onClick={onGoExplore}>
              Explorar locais
            </button>
          </div>
        </div>
      </section>
    );
  }

  const activeList = lists.find((l) => l.id === selectedListId) || lists[0] || null;

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      const res = await onCreateList(newListName);
      if (!res.ok) {
        setCreateError(res.error);
        return;
      }
      setNewListName('');
      setCreateError('');
      if (res.createdId) {
        setSelectedListId(res.createdId);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const startRename = () => {
    if (!activeList) return;
    setRenameValue(activeList.nome);
    setRenameError('');
    setIsRenaming(true);
    setConfirmingDeleteId(null);
  };

  const handleRenameSubmit = async (event) => {
    event.preventDefault();
    if (!activeList) return;
    setIsSavingRename(true);
    try {
      const res = await onRenameList(activeList.id, renameValue);
      if (!res.ok) {
        setRenameError(res.error);
        return;
      }
      setIsRenaming(false);
      setRenameError('');
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleConfirmDelete = async (listId) => {
    setIsDeletingList(true);
    try {
      const res = await onDeleteList(listId);
      if (res && !res.ok) return;
      setConfirmingDeleteId(null);
      setIsRenaming(false);
      const remaining = lists.filter((l) => l.id !== listId);
      setSelectedListId(remaining[0]?.id || '');
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleCardKeyDown = (event, placeId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenDetail(placeId);
    }
  };

  const savedPlaces = activeList
    ? activeList.locaisIds.map((id) => allPlacesById[id]).filter(Boolean)
    : [];

  return (
    <section aria-labelledby="favorites-heading" className="favorites-section">
      <header className="page-header-block">
        <h1 id="favorites-heading">Meus Favoritos</h1>
        <p>Organize seus locais preferidos em listas personalizadas para cada tipo de passeio.</p>
      </header>

      <form onSubmit={handleCreateSubmit} className="create-list-card" noValidate>
        <div className="create-list-fields">
          <label htmlFor="campo-nova-lista" className="create-list-label">
            Criar nova lista
          </label>
          <div className="inline-input-row">
            <input
              id="campo-nova-lista"
              type="text"
              maxLength={60}
              value={newListName}
              onChange={(e) => {
                setNewListName(e.target.value);
                if (createError) setCreateError('');
              }}
              placeholder="Ex.: Melhores para ir com meu Avô, Locais tranquilos..."
              className="text-input"
              disabled={isCreating}
            />
            <button type="submit" className="btn btn-primary" disabled={isCreating}>
              <IconPlus size={17} />
              <span>{isCreating ? 'Criando...' : 'Criar lista'}</span>
            </button>
          </div>
          {createError && (
            <p className="field-error" role="alert">
              {createError}
            </p>
          )}
        </div>
      </form>

      {isLoadingLists ? (
        <div className="empty-state" role="status" aria-live="polite">
          <p>Carregando suas listas de favoritos...</p>
        </div>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhuma lista criada</h2>
          <p>Crie uma lista acima ou explore os locais disponíveis para salvar seus favoritos.</p>
          <button type="button" className="btn btn-primary" onClick={onGoExplore}>
            Explorar locais
          </button>
        </div>
      ) : (
        <div className="favorites-layout">
          <aside className="lists-sidebar" aria-label="Minhas listas">
            <h2>Minhas listas ({lists.length})</h2>
            <ul className="lists-nav">
              {lists.map((list) => {
                const isSelected = activeList && activeList.id === list.id;
                return (
                  <li key={list.id}>
                    <button
                      type="button"
                      className={`list-nav-btn ${isSelected ? 'is-selected' : ''}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => {
                        setSelectedListId(list.id);
                        setIsRenaming(false);
                        setConfirmingDeleteId(null);
                      }}
                    >
                      <span className="list-nav-name">{list.nome}</span>
                      <span className="list-nav-badge" aria-label={`${list.locaisIds.length} locais`}>
                        {list.locaisIds.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="list-detail-column">
            {activeList && (
              <>
                <div className="active-list-header">
                  <div>
                    <h2>{activeList.nome}</h2>
                    <p className="active-list-count">
                      {savedPlaces.length}{' '}
                      {savedPlaces.length === 1 ? 'local salvo' : 'locais salvos'}
                    </p>
                  </div>

                  <div className="active-list-actions">
                    <button type="button" className="btn btn-outline btn-sm" onClick={startRename}>
                      <IconEdit size={15} />
                      <span>Renomear</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-outline btn-sm"
                      onClick={() => {
                        setConfirmingDeleteId(activeList.id);
                        setIsRenaming(false);
                      }}
                    >
                      <IconTrash size={15} />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>

                {isRenaming && (
                  <form onSubmit={handleRenameSubmit} className="action-box" noValidate>
                    <label htmlFor="campo-renomear-lista">Novo nome da lista</label>
                    <div className="inline-input-row">
                      <input
                        id="campo-renomear-lista"
                        type="text"
                        maxLength={60}
                        value={renameValue}
                        onChange={(e) => {
                          setRenameValue(e.target.value);
                          if (renameError) setRenameError('');
                        }}
                        className="text-input"
                        disabled={isSavingRename}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={isSavingRename}
                      >
                        {isSavingRename ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setIsRenaming(false)}
                        disabled={isSavingRename}
                      >
                        Cancelar
                      </button>
                    </div>
                    {renameError && (
                      <p className="field-error" role="alert">
                        {renameError}
                      </p>
                    )}
                  </form>
                )}

                {confirmingDeleteId === activeList.id && (
                  <div
                    className="action-box action-box-danger"
                    role="alertdialog"
                    aria-labelledby="confirm-del-title"
                  >
                    <p id="confirm-del-title">
                      Deseja excluir a lista <strong>{activeList.nome}</strong>? Os locais
                      continuarão disponíveis nas demais listas.
                    </p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleConfirmDelete(activeList.id)}
                        disabled={isDeletingList}
                      >
                        {isDeletingList ? 'Excluindo...' : 'Confirmar exclusão'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setConfirmingDeleteId(null)}
                        disabled={isDeletingList}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {savedPlaces.length === 0 ? (
                  <div className="empty-state">
                    <h3>Esta lista ainda está vazia</h3>
                    <p>Explore os locais e salve seus preferidos nesta lista.</p>
                    <button type="button" className="btn btn-primary" onClick={onGoExplore}>
                      Explorar locais
                    </button>
                  </div>
                ) : (
                  <div className="places-grid">
                    {savedPlaces.map((local) => {
                      const avg = getAveragesForPlace(local);
                      return (
                        <article
                          key={local.id}
                          className="place-card is-clickable"
                          role="link"
                          tabIndex={0}
                          aria-label={`Abrir detalhes de ${local.nome}`}
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
                              className="card-remove-overlay"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemovePlaceFromList(activeList.id, local.id);
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              aria-label={`Remover ${local.nome} da lista ${activeList.nome}`}
                            >
                              <IconTrash size={15} />
                              <span>Remover</span>
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

                            <div className="pillars-summary">
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
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
