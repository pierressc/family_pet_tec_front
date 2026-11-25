import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function translateSupabaseError(error) {
  const raw = String(error?.message || error?.error_description || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (!isSupabaseConfigured || !supabase) {
    return 'A conexão com o banco de dados ainda não foi configurada neste ambiente.';
  }

  if (raw.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'E-mail ou senha incorretos. Confira seus dados e tente novamente.';
  }
  if (raw.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou pasta de spam.';
  }
  if (
    raw.includes('user already registered') ||
    raw.includes('already been registered') ||
    code === 'user_already_exists'
  ) {
    return 'Este e-mail já está cadastrado. Acesse a aba Entrar para usar sua conta.';
  }
  if (raw.includes('password should be at least') || code === 'weak_password') {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (raw.includes('unable to validate email') || raw.includes('invalid email')) {
    return 'Informe um endereço de e-mail válido.';
  }
  if (
    raw.includes('rate limit') ||
    raw.includes('for security purposes') ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit'
  ) {
    return 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.';
  }
  if (raw.includes('signup is disabled')) {
    return 'O cadastro de novas contas está temporariamente desativado.';
  }
  if (raw.includes('failed to fetch') || raw.includes('network')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
  }
  if (code === '23505') {
    return 'Este registro já existe na sua conta.';
  }

  return 'Não foi possível concluir a operação agora. Tente novamente em instantes.';
}

export function getFallbackDisplayName(user) {
  if (!user) return '';
  const metaName = String(user.user_metadata?.display_name || '').trim();
  if (metaName) return metaName;
  const email = String(user.email || '').trim();
  if (email.includes('@')) {
    return email.split('@')[0];
  }
  return 'Visitante';
}

export async function fetchUserProfile(user) {
  if (!supabase || !user?.id) {
    return getFallbackDisplayName(user);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!error && data?.display_name) {
    return data.display_name;
  }

  const fallback = getFallbackDisplayName(user);

  // Garante criacao do perfil caso o usuario ja existisse antes do trigger
  if (!error && !data) {
    await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: fallback }, { onConflict: 'id' });
  }

  return fallback;
}

export async function signInWithEmail({ email, password }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }
  return { ok: true, user: data.user, session: data.session };
}

export async function signUpWithEmail({ displayName, email, password }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }
  const cleanName = displayName.trim();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: cleanName,
      },
    },
  });
  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }

  // Quando o projeto exige confirmacao de e-mail, identities pode vir vazio se o e-mail ja existir
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      ok: false,
      error: 'Este e-mail já está cadastrado. Acesse a aba Entrar para usar sua conta.',
    };
  }

  const requiresEmailConfirmation = Boolean(data.user && !data.session);
  return {
    ok: true,
    user: data.user,
    session: data.session,
    requiresEmailConfirmation,
  };
}

export async function signOutUser() {
  if (!supabase) return { ok: true };
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }
  return { ok: true };
}

function mapReviewRow(row) {
  const effectiveTimestamp = row.updated_at || row.created_at || new Date().toISOString();
  return {
    id: row.id,
    placeId: row.place_id,
    userId: row.user_id || null,
    autor: row.author_name,
    data: String(effectiveTimestamp).slice(0, 10),
    timestamp: effectiveTimestamp,
    pilares: {
      infantil: row.infantil ?? null,
      acessibilidade: row.acessibilidade ?? null,
      pet: row.pet ?? null,
      atendimento: row.atendimento ?? null,
    },
    comentario: row.comment || '',
    edited: Boolean(row.edited),
  };
}

export async function fetchAllReviews() {
  if (!supabase) {
    return { ok: false, data: [], error: translateSupabaseError(null) };
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(
      'id, place_id, user_id, author_name, infantil, acessibilidade, pet, atendimento, comment, edited, created_at, updated_at'
    )
    .order('updated_at', { ascending: false });

  if (error) {
    return { ok: false, data: [], error: translateSupabaseError(error) };
  }

  return {
    ok: true,
    data: (data || []).map(mapReviewRow),
  };
}

export async function saveUserReview({
  placeId,
  userId,
  authorName,
  pilares,
  comentario,
  existingReviewId = null,
}) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }

  const fields = {
    author_name: authorName,
    infantil: pilares.infantil ?? null,
    acessibilidade: pilares.acessibilidade ?? null,
    pet: pilares.pet ?? null,
    atendimento: pilares.atendimento ?? null,
    comment: comentario,
  };

  if (existingReviewId) {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        ...fields,
        edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingReviewId)
      .eq('user_id', userId)
      .select(
        'id, place_id, user_id, author_name, infantil, acessibilidade, pet, atendimento, comment, edited, created_at, updated_at'
      )
      .single();

    if (error) {
      return { ok: false, error: translateSupabaseError(error) };
    }
    return { ok: true, review: mapReviewRow(data), isUpdate: true };
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      place_id: placeId,
      user_id: userId,
      ...fields,
      edited: false,
    })
    .select(
      'id, place_id, user_id, author_name, infantil, acessibilidade, pet, atendimento, comment, edited, created_at, updated_at'
    )
    .single();

  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }

  return { ok: true, review: mapReviewRow(data), isUpdate: false };
}

export async function deleteUserReview({ reviewId, userId }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId);

  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }

  return { ok: true };
}

export async function fetchUserFavoriteLists(userId) {
  if (!supabase || !userId) {
    return { ok: true, data: [] };
  }

  const { data, error } = await supabase
    .from('favorite_lists')
    .select('id, name, created_at, favorite_list_items(place_id, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, data: [], error: translateSupabaseError(error) };
  }

  const lists = (data || []).map((row) => {
    const items = Array.isArray(row.favorite_list_items) ? [...row.favorite_list_items] : [];
    items.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return {
      id: row.id,
      nome: row.name,
      locaisIds: items.map((item) => item.place_id),
    };
  });

  return { ok: true, data: lists };
}

export async function createUserFavoriteList({ userId, name, initialPlaceId = null }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }

  const { data: listRow, error: listError } = await supabase
    .from('favorite_lists')
    .insert({ user_id: userId, name })
    .select('id, name')
    .single();

  if (listError) {
    return { ok: false, error: translateSupabaseError(listError) };
  }

  const locaisIds = [];
  if (initialPlaceId) {
    const { error: itemError } = await supabase.from('favorite_list_items').insert({
      list_id: listRow.id,
      place_id: initialPlaceId,
    });
    if (!itemError) {
      locaisIds.push(initialPlaceId);
    }
  }

  return {
    ok: true,
    list: {
      id: listRow.id,
      nome: listRow.name,
      locaisIds,
    },
  };
}

export async function renameUserFavoriteList({ listId, userId, name }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }

  const { error } = await supabase
    .from('favorite_lists')
    .update({ name })
    .eq('id', listId)
    .eq('user_id', userId);

  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }

  return { ok: true };
}

export async function deleteUserFavoriteList({ listId, userId }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }

  const { error } = await supabase
    .from('favorite_lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', userId);

  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }

  return { ok: true };
}

export async function addPlaceToUserList({ listId, placeId }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }

  const { error } = await supabase
    .from('favorite_list_items')
    .insert({ list_id: listId, place_id: placeId });

  if (error && error.code !== '23505') {
    return { ok: false, error: translateSupabaseError(error) };
  }

  return { ok: true };
}

export async function removePlaceFromUserList({ listId, placeId }) {
  if (!supabase) {
    return { ok: false, error: translateSupabaseError(null) };
  }

  const { error } = await supabase
    .from('favorite_list_items')
    .delete()
    .eq('list_id', listId)
    .eq('place_id', placeId);

  if (error) {
    return { ok: false, error: translateSupabaseError(error) };
  }

  return { ok: true };
}
