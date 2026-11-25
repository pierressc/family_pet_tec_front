import { useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { signInWithEmail, signUpWithEmail } from '../services/supabaseService';
import { IconCheck, IconClose, IconInfo, IconShield } from './Icons';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthModal({
  initialMode = 'login',
  noticeMessage = '',
  onClose,
  onAuthSuccess,
}) {
  const [mode, setMode] = useState(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSwitchMode = (nextMode) => {
    setMode(nextMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSupabaseConfigured) {
      setErrorMsg(
        'A autenticação ainda não está disponível neste ambiente. Configure as credenciais do Supabase para ativar o login.'
      );
      return;
    }

    const trimmedEmail = email.trim();

    if (mode === 'register') {
      const trimmedName = displayName.trim();
      if (trimmedName.length < 2) {
        setErrorMsg('Informe seu nome de exibição com pelo menos 2 caracteres.');
        return;
      }
      if (trimmedName.length > 60) {
        setErrorMsg('O nome de exibição deve ter no máximo 60 caracteres.');
        return;
      }
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg('Informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await signInWithEmail({ email: trimmedEmail, password });
        if (!res.ok) {
          setErrorMsg(res.error);
          return;
        }
        onAuthSuccess({ user: res.user, isNewAccount: false });
      } else {
        const res = await signUpWithEmail({
          displayName: displayName.trim(),
          email: trimmedEmail,
          password,
        });
        if (!res.ok) {
          setErrorMsg(res.error);
          return;
        }
        if (res.requiresEmailConfirmation) {
          setSuccessMsg(
            'Conta criada com sucesso! Verifique sua caixa de entrada para confirmar o e-mail e depois faça login.'
          );
          setMode('login');
          setPassword('');
          return;
        }
        onAuthSuccess({
          user: res.user,
          displayName: displayName.trim(),
          isNewAccount: true,
        });
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog modal-dialog-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="auth-modal-title">
              {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta gratuita'}
            </h2>
            <p className="modal-subtitle">
              Salve seus locais favoritos na nuvem e compartilhe avaliações com a comunidade.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon-close"
            onClick={onClose}
            aria-label="Fechar janela de acesso"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="auth-tabs" role="tablist" aria-label="Opções de acesso">
            <button
              type="button"
              role="tab"
              id="auth-tab-login"
              aria-selected={mode === 'login'}
              aria-controls="auth-form-panel"
              className={`auth-tab-btn ${mode === 'login' ? 'is-active' : ''}`}
              onClick={() => handleSwitchMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              id="auth-tab-register"
              aria-selected={mode === 'register'}
              aria-controls="auth-form-panel"
              className={`auth-tab-btn ${mode === 'register' ? 'is-active' : ''}`}
              onClick={() => handleSwitchMode('register')}
            >
              Criar conta
            </button>
          </div>

          {noticeMessage && !successMsg && (
            <div className="info-banner" role="note">
              <IconInfo size={17} />
              <p>{noticeMessage}</p>
            </div>
          )}

          {successMsg && (
            <div className="alert-success" role="status">
              <IconCheck size={17} />
              <p>{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="alert-error" role="alert">
              {errorMsg}
            </div>
          )}

          <form
            id="auth-form-panel"
            role="tabpanel"
            aria-labelledby={mode === 'login' ? 'auth-tab-login' : 'auth-tab-register'}
            onSubmit={handleSubmit}
            noValidate
            className="auth-form"
          >
            {mode === 'register' && (
              <div className="form-field">
                <label htmlFor="auth-display-name">Nome de exibição</label>
                <input
                  id="auth-display-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Ex.: Camila, Rafael ou Família Silva"
                  className="text-input"
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="auth-email">E-mail</label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="seuemail@exemplo.com"
                className="text-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-field">
              <label htmlFor="auth-password">Senha</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={
                  mode === 'register' ? 'Mínimo de 6 caracteres' : 'Digite sua senha'
                }
                className="text-input"
                disabled={isSubmitting}
              />
            </div>

            {mode === 'register' && (
              <div className="privacy-notice" role="note">
                <IconShield size={17} />
                <p>
                  Seu e-mail é usado apenas para acesso à conta e nunca aparece publicamente nas
                  avaliações.
                </p>
              </div>
            )}

            <div className="modal-footer">
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
                  ? mode === 'login'
                    ? 'Entrando...'
                    : 'Criando conta...'
                  : mode === 'login'
                    ? 'Entrar'
                    : 'Criar conta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
