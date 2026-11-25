import { useEffect, useRef } from 'react';
import { CIDADES_BRASIL } from '../utils/helpers';
import { IconCheck, IconClose, IconMapPin } from './Icons';

export default function CityModal({ onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog modal-dialog-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="city-modal-title">Escolher cidade</h2>
            <p className="modal-subtitle">
              Estamos começando por João Pessoa e expandindo para todo o Brasil.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Fechar seletor de cidade"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="modal-body">
          <ul className="city-list" aria-label="Cidades disponíveis e próximas expansões">
            {CIDADES_BRASIL.map((cidade) => (
              <li key={cidade.id}>
                {cidade.ativa ? (
                  <button
                    type="button"
                    className="city-option is-active"
                    aria-current="true"
                    onClick={onClose}
                  >
                    <span className="city-option-main">
                      <IconMapPin size={17} />
                      <span>
                        <strong>{cidade.nome}</strong>, {cidade.uf}
                      </span>
                    </span>
                    <span className="city-status-active">
                      <IconCheck size={14} />
                      <span>Ativa</span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="city-option is-disabled"
                    disabled
                    aria-disabled="true"
                  >
                    <span className="city-option-main">
                      <IconMapPin size={17} />
                      <span>
                        {cidade.nome}, {cidade.uf}
                      </span>
                    </span>
                    <span className="city-status-soon">Em breve</span>
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Continuar em João Pessoa, PB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
