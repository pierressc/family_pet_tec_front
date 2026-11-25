import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import estabelecimentosData from './data/estabelecimentos.json';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  addPlaceToUserList,
  createUserFavoriteList,
  deleteUserFavoriteList,
  deleteUserReview,
  fetchAllReviews,
  fetchUserFavoriteLists,
  fetchUserProfile,
  getFallbackDisplayName,
  removePlaceFromUserList,
  renameUserFavoriteList,
  saveUserReview,
  signOutUser,
} from './services/supabaseService';
import {
  calculatePillarAverages,
  getAllTagsFlat,
  getOverallScore,
  isDefaultFavoritesList,
  normalizeText,
  sortFavoriteLists,
} from './utils/helpers';
import { loadThemePreference, saveThemePreference } from './utils/storage';
import ExploreView from './components/ExploreView';
import DetailView from './components/DetailView';
import FavoritesView from './components/FavoritesView';
import RatingModal from './components/RatingModal';
import SaveToListModal from './components/SaveToListModal';
import CityModal from './components/CityModal';
import AuthModal from './components/AuthModal';
import MyReviewsModal from './components/MyReviewsModal';
import {
  IconBookmark,
  IconChevronDown,
  IconHome,
  IconInfo,
  IconLogIn,
  IconLogOut,
  IconMapPin,
  IconMoon,
  IconSearch,
  IconStar,
  IconSun,
  IconUser,
} from './components/Icons';

function parseInitialHash() {
  const raw = (window.location.hash || '#explorar').replace(/^#\/?/, '');
  if (raw.startsWith('local/')) {
    return {
      tab: 'explorar',
      placeId: decodeURIComponent(raw.slice('local/'.length)),
    };
  }
  if (raw === 'favoritos') {
    return { tab: 'favoritos', placeId: null };
  }
  return { tab: 'explorar', placeId: null };
}

function buildFallbackReviewsByPlace() {
  const grouped = {};
  for (const place of estabelecimentosData) {
    const initial = place.avaliacoesIniciais || [];
    if (initial.length > 0) {
      grouped[place.id] = initial.map((rev) => ({
        ...rev,
        placeId: place.id,
        userId: null,
        timestamp: rev.timestamp || `${rev.data || '2026-11-01'}T12:00:00.000Z`,
        edited: Boolean(rev.edited),
      }));
    }
  }
  return grouped;
}

function groupReviewsByPlace(reviewRows) {
  const grouped = {};
  for (const rev of reviewRows) {
    if (!grouped[rev.placeId]) {
      grouped[rev.placeId] = [];
    }
    grouped[rev.placeId].push(rev);
  }
  return grouped;
}

export default function App() {
  const initialState = useMemo(() => parseInitialHash(), []);
  const [activeTab, setActiveTab] = useState(initialState.tab);
  const [detailPlaceId, setDetailPlaceId] = useState(initialState.placeId);

  const [theme, setTheme] = useState(() => loadThemePreference());
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [statusWarning, setStatusWarning] = useState(() =>
    isSupabaseConfigured
      ? ''
      : 'Modo de demonstração: configure as credenciais do Supabase para ativar cadastro, login e sincronização na nuvem.'
  );
  const [toastMessage, setToastMessage] = useState('');

  // Sessão de autenticação e menu de perfil
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login', notice: '' });
  const [pendingAction, setPendingAction] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [myReviewsOpen, setMyReviewsOpen] = useState(false);

  // Estado preservado de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('relevancia');

  // Dados carregados do Supabase
  const [reviewsByPlace, setReviewsByPlace] = useState(() =>
    isSupabaseConfigured ? {} : buildFallbackReviewsByPlace()
  );
  const [favoriteLists, setFavoriteLists] = useState([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // Modais empilhados (camada superior)
  const [ratingTargetPlace, setRatingTargetPlace] = useState(null);
  const [saveTargetPlace, setSaveTargetPlace] = useState(null);
  const [reviewsFocusToken, setReviewsFocusToken] = useState(0);

  // Referências para restauração de foco e fechamento de dropdown
  const detailTriggerRef = useRef(null);
  const topModalTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const profileTriggerRef = useRef(null);

  // Aplicação do tema claro/escuro (único dado mantido em localStorage)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveThemePreference(theme);
  }, [theme]);

  // Carregamento inicial das avaliações públicas do banco
  const loadPublicReviews = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setReviewsByPlace(buildFallbackReviewsByPlace());
      return;
    }

    const res = await fetchAllReviews();
    if (!res.ok) {
      setStatusWarning(
        'Não foi possível carregar as avaliações do servidor no momento. Exibindo dados iniciais.'
      );
      setReviewsByPlace(buildFallbackReviewsByPlace());
      return;
    }

    setReviewsByPlace(groupReviewsByPlace(res.data));
  }, []);

  useEffect(() => {
    loadPublicReviews();
  }, [loadPublicReviews]);

  // Carregamento de perfil e listas do usuário autenticado
  const loadAuthenticatedUserData = useCallback(async (authUser, explicitName = '') => {
    if (!authUser) {
      setProfileName('');
      setFavoriteLists([]);
      setIsLoadingLists(false);
      return;
    }

    const fallbackName = explicitName || getFallbackDisplayName(authUser);
    setProfileName(fallbackName);
    setIsLoadingLists(true);

    const [resolvedName, listsRes] = await Promise.all([
      explicitName ? Promise.resolve(explicitName) : fetchUserProfile(authUser),
      fetchUserFavoriteLists(authUser.id),
    ]);

    setProfileName(resolvedName || fallbackName);
    if (listsRes.ok) {
      setFavoriteLists(sortFavoriteLists(listsRes.data));
    } else if (listsRes.error) {
      setToastMessage(listsRes.error);
    }
    setIsLoadingLists(false);
  }, []);

  // Fechar menu de perfil ao clicar fora ou pressionar Esc
  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setProfileMenuOpen(false);
        profileTriggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  // Persistência de sessão com Supabase Auth
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data?.session?.user || null;
      setUser(sessionUser);
      loadAuthenticatedUserData(sessionUser);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      loadAuthenticatedUserData(sessionUser);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadAuthenticatedUserData]);

  // Travamento da rolagem da página de fundo enquanto qualquer modal estiver aberto
  const hasAnyModalOpen = Boolean(
    detailPlaceId ||
      ratingTargetPlace ||
      saveTargetPlace ||
      cityModalOpen ||
      authModal.open ||
      myReviewsOpen
  );
  useEffect(() => {
    if (hasAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [hasAnyModalOpen]);

  // Sincronização com hash sem perder contexto da aba de origem
  useEffect(() => {
    const onHashChange = () => {
      const raw = (window.location.hash || '#explorar').replace(/^#\/?/, '');
      if (raw.startsWith('local/')) {
        setDetailPlaceId(decodeURIComponent(raw.slice('local/'.length)));
      } else if (raw === 'favoritos') {
        setDetailPlaceId(null);
        setActiveTab('favoritos');
      } else {
        setDetailPlaceId(null);
        setActiveTab('explorar');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Limpeza automática da notificação
  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const switchTab = useCallback((tab) => {
    setDetailPlaceId(null);
    setActiveTab(tab);
    const nextHash = `#${tab}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const openAuthModal = useCallback((mode = 'login', notice = '', nextAction = null) => {
    if (document.activeElement instanceof HTMLElement) {
      topModalTriggerRef.current = document.activeElement;
    }
    setPendingAction(nextAction);
    setAuthModal({ open: true, mode, notice });
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, open: false, notice: '' }));
    setPendingAction(null);
    const trigger = topModalTriggerRef.current;
    if (trigger && trigger.isConnected) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  }, []);

  const handleAuthSuccess = useCallback(
    ({ user: authUser, displayName: explicitName, isNewAccount }) => {
      setAuthModal({ open: false, mode: 'login', notice: '' });
      if (authUser) {
        setUser(authUser);
        loadAuthenticatedUserData(authUser, explicitName || '');
      }

      const greetingName = explicitName || getFallbackDisplayName(authUser);
      setToastMessage(
        isNewAccount
          ? `Conta criada com sucesso. Bem-vindo(a), ${greetingName}.`
          : `Sessão iniciada como ${greetingName}.`
      );

      if (pendingAction?.type === 'rate' && pendingAction.place) {
        setRatingTargetPlace(pendingAction.place);
      } else if (pendingAction?.type === 'save' && pendingAction.place) {
        setSaveTargetPlace(pendingAction.place);
      }
      setPendingAction(null);
    },
    [loadAuthenticatedUserData, pendingAction]
  );

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    const res = await signOutUser();
    if (!res.ok) {
      setToastMessage(res.error);
      return;
    }
    setUser(null);
    setProfileName('');
    setFavoriteLists([]);
    setRatingTargetPlace(null);
    setSaveTargetPlace(null);
    setMyReviewsOpen(false);
    setToastMessage('Você saiu da sua conta.');
  };

  const handleOpenMyReviews = () => {
    setProfileMenuOpen(false);
    setMyReviewsOpen(true);
  };

  const handleCloseMyReviews = useCallback(() => {
    setMyReviewsOpen(false);
    const trigger = profileTriggerRef.current;
    if (trigger && trigger.isConnected) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  }, []);

  const handleOpenDetail = useCallback((placeId) => {
    if (document.activeElement instanceof HTMLElement) {
      detailTriggerRef.current = document.activeElement;
    }
    setDetailPlaceId(placeId);
    const targetHash = `#local/${encodeURIComponent(placeId)}`;
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailPlaceId(null);
    const returnHash = `#${activeTab}`;
    if (window.location.hash !== returnHash) {
      window.history.replaceState(null, '', returnHash);
    }
    const trigger = detailTriggerRef.current;
    if (trigger && trigger.isConnected) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  }, [activeTab]);

  const handleOpenRatingModal = useCallback(
    (local) => {
      if (!user) {
        openAuthModal(
          'login',
          'Entre na sua conta ou crie um cadastro gratuito para publicar sua avaliação.',
          { type: 'rate', place: local }
        );
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        topModalTriggerRef.current = document.activeElement;
      }
      setRatingTargetPlace(local);
    },
    [openAuthModal, user]
  );

  const handleCloseRatingModal = useCallback(() => {
    setRatingTargetPlace(null);
    const trigger = topModalTriggerRef.current;
    if (trigger && trigger.isConnected) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  }, []);

  const handleOpenSaveModal = useCallback(
    (local) => {
      if (!user) {
        openAuthModal(
          'login',
          'Entre na sua conta ou crie um cadastro gratuito para salvar locais nas suas listas de favoritos.',
          { type: 'save', place: local }
        );
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        topModalTriggerRef.current = document.activeElement;
      }
      setSaveTargetPlace(local);
    },
    [openAuthModal, user]
  );

  const handleCloseSaveModal = useCallback(() => {
    setSaveTargetPlace(null);
    const trigger = topModalTriggerRef.current;
    if (trigger && trigger.isConnected) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const allPlacesById = useMemo(() => {
    const map = {};
    for (const item of estabelecimentosData) {
      map[item.id] = item;
    }
    return map;
  }, []);

  const getAllReviewsForPlace = useCallback(
    (local) => {
      if (!local) return [];
      const items = reviewsByPlace[local.id] || [];
      return items
        .map((rev) => ({
          ...rev,
          isUserReview: Boolean(user && rev.userId && rev.userId === user.id),
        }))
        .sort((a, b) => {
          const ta = a.timestamp || `${a.data || '2000-01-01'}T00:00:00.000Z`;
          const tb = b.timestamp || `${b.data || '2000-01-01'}T00:00:00.000Z`;
          return String(tb).localeCompare(String(ta));
        });
    },
    [reviewsByPlace, user]
  );

  const getUserReviewForPlace = useCallback(
    (placeId) => {
      if (!user || !placeId) return null;
      const items = reviewsByPlace[placeId] || [];
      return items.find((rev) => rev.userId === user.id) || null;
    },
    [reviewsByPlace, user]
  );

  const getAveragesForPlace = useCallback(
    (local) => calculatePillarAverages(getAllReviewsForPlace(local)),
    [getAllReviewsForPlace]
  );

  const getListsContainingPlace = useCallback(
    (placeId) => favoriteLists.filter((list) => list.locaisIds.includes(placeId)),
    [favoriteLists]
  );

  const locaisFiltrados = useMemo(() => {
    const queryNorm = normalizeText(searchQuery);

    const filtered = estabelecimentosData.filter((local) => {
      if (queryNorm) {
        const haystack = normalizeText(`${local.nome} ${local.bairro} ${local.categoria}`);
        if (!haystack.includes(queryNorm)) return false;
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(local.categoria)) {
        return false;
      }

      if (selectedTags.length > 0) {
        const placeTags = getAllTagsFlat(local);
        if (!selectedTags.every((tag) => placeTags.includes(tag))) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const avgA = getAveragesForPlace(a);
      const avgB = getAveragesForPlace(b);

      let scoreA = -1;
      let scoreB = -1;
      if (sortBy === 'relevancia') {
        scoreA = getOverallScore(avgA);
        scoreB = getOverallScore(avgB);
      } else {
        scoreA = avgA.pillars[sortBy]?.value ?? -1;
        scoreB = avgB.pillars[sortBy]?.value ?? -1;
      }

      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [searchQuery, selectedCategories, selectedTags, sortBy, getAveragesForPlace]);

  const handleToggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleClearSelectedFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setSortBy('relevancia');
  };

  const handleSaveReview = async (placeId, payload) => {
    if (!user) {
      return { ok: false, error: 'Faça login para publicar sua avaliação.' };
    }

    const existing = getUserReviewForPlace(placeId);
    const authorName = profileName || getFallbackDisplayName(user);

    const res = await saveUserReview({
      placeId,
      userId: user.id,
      authorName,
      pilares: payload.pilares,
      comentario: payload.comentario,
      existingReviewId: existing?.id || null,
    });

    if (!res.ok) {
      return res;
    }

    setReviewsByPlace((prev) => {
      const currentList = prev[placeId] || [];
      const filtered = currentList.filter((item) => item.id !== res.review.id);
      return {
        ...prev,
        [placeId]: [res.review, ...filtered],
      };
    });

    setRatingTargetPlace(null);
    setReviewsFocusToken((prev) => prev + 1);
    setToastMessage(
      res.isUpdate ? 'Sua avaliação foi atualizada com sucesso.' : 'Avaliação publicada com sucesso.'
    );
    return { ok: true };
  };

  const handleDeleteReview = async (placeId) => {
    if (!user) return { ok: false, error: 'Faça login para gerenciar sua avaliação.' };
    const existing = getUserReviewForPlace(placeId);
    if (!existing) return { ok: true };

    const res = await deleteUserReview({ reviewId: existing.id, userId: user.id });
    if (!res.ok) {
      setToastMessage(res.error);
      return res;
    }

    setReviewsByPlace((prev) => {
      const currentList = prev[placeId] || [];
      return {
        ...prev,
        [placeId]: currentList.filter((item) => item.id !== existing.id),
      };
    });

    setRatingTargetPlace(null);
    setReviewsFocusToken((prev) => prev + 1);
    setToastMessage('Sua avaliação foi excluída.');
    return { ok: true };
  };

  const handleCreateList = async (rawName, initialPlaceId = null) => {
    if (!user) {
      return { ok: false, error: 'Faça login para criar listas de favoritos.' };
    }

    const trimmed = String(rawName || '').trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      return { ok: false, error: 'Informe um nome entre 2 e 60 caracteres para a lista.' };
    }

    const normNew = normalizeText(trimmed);
    const duplicate = favoriteLists.some((l) => normalizeText(l.nome) === normNew);
    if (duplicate) {
      return { ok: false, error: 'Já existe uma lista com este nome.' };
    }

    const res = await createUserFavoriteList({
      userId: user.id,
      name: trimmed,
      initialPlaceId,
    });

    if (!res.ok) {
      return res;
    }

    setFavoriteLists((prev) => sortFavoriteLists([res.list, ...prev]));
    setToastMessage(`Lista "${trimmed}" criada.`);
    return { ok: true, createdId: res.list.id };
  };

  const handleRenameList = async (listId, rawName) => {
    if (!user) {
      return { ok: false, error: 'Faça login para renomear listas.' };
    }

    const target = favoriteLists.find((l) => l.id === listId);
    if (isDefaultFavoritesList(target)) {
      return { ok: false, error: 'A lista padrão "Favoritos" não pode ser renomeada.' };
    }

    const trimmed = String(rawName || '').trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      return { ok: false, error: 'O nome deve ter entre 2 e 60 caracteres.' };
    }

    const normNew = normalizeText(trimmed);
    const duplicate = favoriteLists.some(
      (l) => l.id !== listId && normalizeText(l.nome) === normNew
    );
    if (duplicate) {
      return { ok: false, error: 'Já existe outra lista com este nome.' };
    }

    const res = await renameUserFavoriteList({ listId, userId: user.id, name: trimmed });
    if (!res.ok) {
      return res;
    }

    setFavoriteLists((prev) =>
      sortFavoriteLists(prev.map((l) => (l.id === listId ? { ...l, nome: trimmed } : l)))
    );
    setToastMessage(`Lista renomeada para "${trimmed}".`);
    return { ok: true };
  };

  const handleDeleteList = async (listId) => {
    if (!user) return { ok: false };
    const target = favoriteLists.find((l) => l.id === listId);
    if (isDefaultFavoritesList(target)) {
      setToastMessage('A lista padrão "Favoritos" não pode ser excluída.');
      return { ok: false };
    }

    const res = await deleteUserFavoriteList({ listId, userId: user.id });
    if (!res.ok) {
      setToastMessage(res.error);
      return res;
    }

    setFavoriteLists((prev) => sortFavoriteLists(prev.filter((l) => l.id !== listId)));
    if (target) {
      setToastMessage(`Lista "${target.nome}" removida.`);
    }
    return { ok: true };
  };

  const handleTogglePlaceInList = async (listId, placeId) => {
    if (!user) return { ok: false, error: 'Faça login para atualizar suas listas.' };
    const targetList = favoriteLists.find((l) => l.id === listId);
    if (!targetList) return { ok: false };

    const exists = targetList.locaisIds.includes(placeId);
    const res = exists
      ? await removePlaceFromUserList({ listId, placeId })
      : await addPlaceToUserList({ listId, placeId });

    if (!res.ok) {
      setToastMessage(res.error);
      return res;
    }

    setFavoriteLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          locaisIds: exists
            ? list.locaisIds.filter((id) => id !== placeId)
            : [placeId, ...list.locaisIds],
        };
      })
    );
    return { ok: true };
  };

  const handleRemovePlaceFromList = async (listId, placeId) => {
    if (!user) return;
    const res = await removePlaceFromUserList({ listId, placeId });
    if (!res.ok) {
      setToastMessage(res.error);
      return;
    }

    setFavoriteLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          locaisIds: list.locaisIds.filter((id) => id !== placeId),
        };
      })
    );
    setToastMessage('Local removido desta lista.');
  };

  const totalUniqueSavedPlaces = useMemo(() => {
    const set = new Set();
    for (const list of favoriteLists) {
      for (const id of list.locaisIds) set.add(id);
    }
    return set.size;
  }, [favoriteLists]);

  const userReviewsList = useMemo(() => {
    if (!user) return [];
    const collected = [];
    for (const list of Object.values(reviewsByPlace)) {
      for (const rev of list) {
        if (rev.userId && rev.userId === user.id) {
          collected.push(rev);
        }
      }
    }
    return collected.sort((a, b) => {
      const ta = a.timestamp || `${a.data || '2000-01-01'}T00:00:00.000Z`;
      const tb = b.timestamp || `${b.data || '2000-01-01'}T00:00:00.000Z`;
      return String(tb).localeCompare(String(ta));
    });
  }, [reviewsByPlace, user]);

  const currentDetailPlace = detailPlaceId ? allPlacesById[detailPlaceId] || null : null;
  const currentUserReview = currentDetailPlace ? getUserReviewForPlace(currentDetailPlace.id) : null;
  const ratingTargetUserReview = ratingTargetPlace
    ? getUserReviewForPlace(ratingTargetPlace.id)
    : null;
  const hasChildModalOpen = Boolean(ratingTargetPlace || saveTargetPlace || authModal.open);

  return (
    <div className="app-shell">
      <a href="#conteudo-principal" className="skip-link">
        Pular para o conteúdo principal
      </a>

      <header className="top-header">
        <div className="container header-inner">
          <div className="header-left">
            <a
              href="#explorar"
              className="brand-link"
              onClick={(e) => {
                e.preventDefault();
                switchTab('explorar');
              }}
            >
              <span className="brand-mark">
                <IconHome size={19} />
              </span>
              <span className="brand-name">Family Place</span>
            </a>

            <button
              type="button"
              className="city-selector-btn"
              onClick={() => setCityModalOpen(true)}
              aria-label="Selecionar cidade. Atual: João Pessoa, PB"
            >
              <IconMapPin size={15} />
              <span>João Pessoa, PB</span>
              <IconChevronDown size={14} />
            </button>
          </div>

          <div className="header-right">
            <nav aria-label="Navegação principal" className="main-nav">
              <a
                href="#explorar"
                className={`nav-link ${activeTab === 'explorar' ? 'is-active' : ''}`}
                aria-current={activeTab === 'explorar' ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  switchTab('explorar');
                }}
              >
                <IconSearch size={16} />
                <span>Explorar</span>
              </a>

              <a
                href="#favoritos"
                className={`nav-link ${activeTab === 'favoritos' ? 'is-active' : ''}`}
                aria-current={activeTab === 'favoritos' ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  switchTab('favoritos');
                }}
              >
                <IconBookmark size={16} />
                <span>Favoritos</span>
                {user && (
                  <span className="nav-badge" aria-label={`${totalUniqueSavedPlaces} locais salvos`}>
                    {totalUniqueSavedPlaces}
                  </span>
                )}
              </a>
            </nav>

            <div className="header-utility-group">
              {user ? (
                <div className="profile-menu-wrap" ref={profileMenuRef}>
                  <button
                    ref={profileTriggerRef}
                    type="button"
                    className={`profile-menu-trigger ${profileMenuOpen ? 'is-open' : ''}`}
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                    aria-controls="profile-dropdown-menu"
                    aria-label={`Menu do perfil de ${profileName || 'usuário'}`}
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                  >
                    <IconUser size={15} />
                    <span className="header-user-name">{profileName}</span>
                    <span className={`profile-menu-chevron ${profileMenuOpen ? 'is-open' : ''}`}>
                      <IconChevronDown size={14} />
                    </span>
                  </button>

                  {profileMenuOpen && (
                    <div
                      id="profile-dropdown-menu"
                      role="menu"
                      aria-label="Opções do perfil"
                      className="profile-dropdown"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="profile-menu-item"
                        onClick={handleOpenMyReviews}
                      >
                        <span className="profile-menu-item-main">
                          <IconStar size={15} />
                          <span>Minhas avaliações</span>
                        </span>
                        <span
                          className="menu-count-badge"
                          aria-label={`${userReviewsList.length} avaliações`}
                        >
                          {userReviewsList.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="profile-menu-item is-disabled"
                        aria-disabled="true"
                        tabIndex={-1}
                        onClick={(e) => e.preventDefault()}
                      >
                        <span className="profile-menu-item-main">
                          <IconUser size={15} />
                          <span>Minha conta</span>
                        </span>
                        <span className="menu-soon-badge">Em breve</span>
                      </button>

                      <div className="profile-menu-divider" role="separator" />

                      <button
                        type="button"
                        role="menuitem"
                        className="profile-menu-item is-danger"
                        onClick={handleSignOut}
                      >
                        <span className="profile-menu-item-main">
                          <IconLogOut size={15} />
                          <span>Sair</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm header-auth-btn"
                  onClick={() => openAuthModal('login')}
                >
                  <IconLogIn size={15} />
                  <span>Entrar</span>
                </button>
              )}

              <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
                title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              >
                {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {statusWarning && (
        <div className="container">
          <div className="storage-alert" role="status">
            <IconInfo size={18} />
            <p>{statusWarning}</p>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="toast-container" role="status" aria-live="polite">
          <div className="toast-box">{toastMessage}</div>
        </div>
      )}

      <main id="conteudo-principal" className="container main-content" tabIndex={-1}>
        {activeTab === 'explorar' && (
          <ExploreView
            locaisFiltrados={locaisFiltrados}
            totalCatalogo={estabelecimentosData.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategories={selectedCategories}
            onToggleCategory={handleToggleCategory}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onClearSelectedFilters={handleClearSelectedFilters}
            onClearFilters={handleClearFilters}
            onOpenDetail={handleOpenDetail}
            onOpenSaveModal={handleOpenSaveModal}
            getAveragesForPlace={getAveragesForPlace}
            getListsContainingPlace={getListsContainingPlace}
          />
        )}

        {activeTab === 'favoritos' && (
          <FavoritesView
            isAuthenticated={Boolean(user)}
            isLoadingLists={isLoadingLists}
            lists={favoriteLists}
            allPlacesById={allPlacesById}
            getAveragesForPlace={getAveragesForPlace}
            onOpenAuthModal={(mode, notice) => openAuthModal(mode, notice)}
            onCreateList={handleCreateList}
            onRenameList={handleRenameList}
            onDeleteList={handleDeleteList}
            onRemovePlaceFromList={handleRemovePlaceFromList}
            onOpenDetail={handleOpenDetail}
            onGoExplore={() => switchTab('explorar')}
          />
        )}
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <p className="footer-brand">
              <strong>Family Place</strong>
            </p>
            <p className="footer-note">
              Guia colaborativo para famílias, crianças, pets, idosos, pessoas com deficiência e
              pessoas neurodivergentes encontrarem espaços acolhedores antes de sair de casa.
            </p>
          </div>
          <div className="footer-roadmap">
            <p className="footer-roadmap-title">Em breve</p>
            <ul>
              <li>Clube de benefícios presenciais</li>
              <li>Novidades dos locais favoritos</li>
              <li>Assistente de recomendações</li>
            </ul>
          </div>
        </div>
      </footer>

      {currentDetailPlace && (
        <DetailView
          local={currentDetailPlace}
          avaliacoes={getAllReviewsForPlace(currentDetailPlace)}
          averages={getAveragesForPlace(currentDetailPlace)}
          savedLists={getListsContainingPlace(currentDetailPlace.id)}
          existingUserReview={currentUserReview}
          focusReviewsToken={reviewsFocusToken}
          hasChildModalOpen={hasChildModalOpen}
          onClose={handleCloseDetail}
          onOpenRatingModal={() => handleOpenRatingModal(currentDetailPlace)}
          onDeleteReview={handleDeleteReview}
          onOpenSaveModal={handleOpenSaveModal}
        />
      )}

      {cityModalOpen && <CityModal onClose={() => setCityModalOpen(false)} />}

      {myReviewsOpen && user && (
        <MyReviewsModal
          reviews={userReviewsList}
          allPlacesById={allPlacesById}
          hasChildModalOpen={Boolean(ratingTargetPlace || detailPlaceId)}
          onClose={handleCloseMyReviews}
          onViewPlace={(placeId) => {
            setMyReviewsOpen(false);
            handleOpenDetail(placeId);
          }}
          onEditReview={(place) => handleOpenRatingModal(place)}
          onDeleteReview={handleDeleteReview}
          onGoExplore={() => switchTab('explorar')}
        />
      )}

      {authModal.open && (
        <AuthModal
          initialMode={authModal.mode}
          noticeMessage={authModal.notice}
          onClose={handleCloseAuthModal}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {ratingTargetPlace && user && (
        <RatingModal
          local={ratingTargetPlace}
          authorName={profileName || getFallbackDisplayName(user)}
          existingReview={ratingTargetUserReview}
          onClose={handleCloseRatingModal}
          onSubmit={(payload) => handleSaveReview(ratingTargetPlace.id, payload)}
          onDelete={() => handleDeleteReview(ratingTargetPlace.id)}
        />
      )}

      {saveTargetPlace && user && (
        <SaveToListModal
          local={saveTargetPlace}
          lists={favoriteLists}
          onClose={handleCloseSaveModal}
          onTogglePlaceInList={handleTogglePlaceInList}
          onCreateList={handleCreateList}
        />
      )}
    </div>
  );
}
