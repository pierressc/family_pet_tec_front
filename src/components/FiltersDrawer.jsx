import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIAS, FILTER_GROUPS } from '../utils/helpers';
import { IconChevronDown, IconClose, IconFilter } from './Icons';

export default function FiltersDrawer({
  selectedCategories,
  onToggleCategory,
  selectedTags,
  onToggleTag,
  onClearSelectedFilters,
  filteredCount,
  onClose,
}) {
  const groups = useMemo(
    () => [
      {
        key: 'categoria',
        title: 'Tipo de local',
        options: CATEGORIAS,
        selected: selectedCategories,
        onToggle: onToggleCategory,
      },
      ...FILTER_GROUPS.map((group) => ({
        key: group.key,
        title: group.title,
        options: group.options,
        selected: selectedTags,
        onToggle: onToggleTag,
      })),
    ],
    [selectedCategories, onToggleCategory, selectedTags, onToggleTag]
  );

  // Ao abrir a gaveta, recolhe todos os grupos por padrão, exceto os que já têm filtros ativos
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = new Set();
    if (selectedCategories.length > 0) {
      initial.add('categoria');
    }
    for (const group of FILTER_GROUPS) {
      if (group.options.some((opt) => selectedTags.includes(opt))) {
        initial.add(group.key);
      }
    }
    return initial;
  });

  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const totalSelected = selectedCategories.length + selectedTags.length;

  const primaryCtaLabel =
    filteredCount === 0
      ? 'Nenhum local encontrado'
      : filteredCount === 1
        ? 'Ver 1 local'
        : `Ver ${filteredCount} locais`;

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="filters-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        <div className="drawer-header">
          <div className="drawer-title-row">
            <IconFilter size={18} />
            <h2>Filtros</h2>
            {totalSelected > 0 && (
              <span className="drawer-total-badge" aria-label={`${totalSelected} filtros ativos`}>
                {totalSelected}
              </span>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Fechar filtros"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="drawer-scroll">
          <p className="drawer-intro">
            Combine categorias e recursos de infraestrutura para encontrar locais adequados ao seu
            passeio.
          </p>

          <div className="accordion-list">
            {groups.map((group) => {
              const isOpen = openGroups.has(group.key);
              const selectedInGroup = group.options.filter((opt) =>
                group.selected.includes(opt)
              ).length;
              const headerId = `filtro-grupo-btn-${group.key}`;
              const panelId = `filtro-grupo-panel-${group.key}`;

              return (
                <section key={group.key} className="accordion-group">
                  <h3 className="accordion-heading">
                    <button
                      id={headerId}
                      type="button"
                      className={`accordion-trigger ${isOpen ? 'is-open' : ''}`}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleGroup(group.key)}
                    >
                      <span className="accordion-title-group">
                        <span>{group.title}</span>
                        {selectedInGroup > 0 && (
                          <span
                            className="accordion-count-badge"
                            aria-label={`${selectedInGroup} selecionados`}
                          >
                            ({selectedInGroup})
                          </span>
                        )}
                      </span>
                      <span className={`accordion-chevron ${isOpen ? 'is-open' : ''}`}>
                        <IconChevronDown size={16} />
                      </span>
                    </button>
                  </h3>

                  {isOpen && (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={headerId}
                      className="accordion-panel"
                    >
                      <div className="checkbox-list">
                        {group.options.map((option) => {
                          const checked = group.selected.includes(option);
                          return (
                            <label
                              key={option}
                              className={`checkbox-label ${checked ? 'is-checked' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => group.onToggle(option)}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="btn btn-outline drawer-clear-btn"
            onClick={onClearSelectedFilters}
            disabled={totalSelected === 0}
          >
            Limpar filtros
          </button>
          <button type="button" className="btn btn-primary drawer-apply-btn" onClick={onClose}>
            {primaryCtaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
