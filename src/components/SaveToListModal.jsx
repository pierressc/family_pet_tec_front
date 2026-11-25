import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconClose, IconPlus } from './Icons';

export default function SaveToListModal({
  local,
  lists,
  onClose,
  onTogglePlaceInList,
  onCreateList,
}) {
  const [newListName, setNewListName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [togglingListId, setTogglingListId] = useState(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleToggle = async (listId) => {
    setErrorMsg('');
    setTogglingListId(listId);
    try {
      const res = await onTogglePlaceInList(listId, local.id);
      if (res && !res.ok && res.error) {
        setErrorMsg(res.error);
      }
    } finally {
      setTogglingListId(null);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setIsCreating(true);
    try {
      const res = await onCreateList(newListName, local.id);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setNewListName('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="modal-backdrop modal-backdrop-top"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog modal-dialog-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="save-modal-title">Salvar em Listas de Favoritos</h2>
            <p className="modal-subtitle">{local.nome}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Fechar seleção de listas"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="form-lead">
            Marque uma ou mais listas organizadas por critério. Um mesmo local pode pertencer a várias
            listas simultaneamente.
          </p>

          {lists.length === 0 ? (
            <p className="tag-empty-note">Nenhuma lista criada ainda. Crie sua primeira lista abaixo.</p>
          ) : (
            <div className="save-lists-stack">
              {lists.map((list) => {
                const checked = list.locaisIds.includes(local.id);
                const busy = togglingListId === list.id;
                return (
                  <label
                    key={list.id}
                    className={`save-list-option ${checked ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => handleToggle(list.id)}
                    />
                    <span className="save-list-name">{list.nome}</span>
                    <span className="save-list-count">
                      {checked && <IconCheck size={14} />}
                      {list.locaisIds.length} {list.locaisIds.length === 1 ? 'local' : 'locais'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <form onSubmit={handleCreate} className="inline-create-form" noValidate>
            <label htmlFor="nova-lista-modal">Criar nova lista e salvar este local</label>
            <div className="inline-input-row">
              <input
                id="nova-lista-modal"
                type="text"
                maxLength={60}
                value={newListName}
                onChange={(e) => {
                  setNewListName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Ex.: Almoço de domingo em família"
                className="text-input"
                disabled={isCreating}
              />
              <button type="submit" className="btn btn-secondary" disabled={isCreating}>
                <IconPlus size={16} />
                <span>{isCreating ? 'Criando...' : 'Criar'}</span>
              </button>
            </div>
            {errorMsg && (
              <p className="field-error" role="alert">
                {errorMsg}
              </p>
            )}
          </form>

          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
