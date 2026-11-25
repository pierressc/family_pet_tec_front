-- =============================================================================
-- Family Place — Schema PostgreSQL e Politicas RLS para Supabase
-- Execute este script uma unica vez no SQL Editor do projeto Supabase.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tabela de perfis publicos (vinculada a auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if v_display_name is null then
    v_display_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Visitante');
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(v_display_name, 60))
  on conflict (id) do update
    set display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. Tabela de avaliacoes por local
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  author_name text not null,
  infantil smallint check (infantil between 1 and 5),
  acessibilidade smallint check (acessibilidade between 1 and 5),
  pet smallint check (pet between 1 and 5),
  atendimento smallint check (atendimento between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_at_least_one_pillar check (
    infantil is not null
    or acessibilidade is not null
    or pet is not null
    or atendimento is not null
  ),
  constraint reviews_unique_user_place unique (user_id, place_id)
);

create index if not exists idx_reviews_place_id on public.reviews (place_id);
create index if not exists idx_reviews_user_id on public.reviews (user_id);

create or replace function public.set_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute procedure public.set_reviews_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Tabelas de listas de favoritos personalizadas
-- -----------------------------------------------------------------------------
create table if not exists public.favorite_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_favorite_lists_user_id on public.favorite_lists (user_id);

create table if not exists public.favorite_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.favorite_lists(id) on delete cascade,
  place_id text not null,
  created_at timestamptz not null default now(),
  unique (list_id, place_id)
);

create index if not exists idx_favorite_list_items_list_id on public.favorite_list_items (list_id);

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.favorite_lists enable row level security;
alter table public.favorite_list_items enable row level security;

-- Politicas: profiles
drop policy if exists "Perfis visiveis publicamente" on public.profiles;
create policy "Perfis visiveis publicamente"
  on public.profiles
  for select
  using (true);

drop policy if exists "Usuario cria o proprio perfil" on public.profiles;
create policy "Usuario cria o proprio perfil"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Usuario atualiza o proprio perfil" on public.profiles;
create policy "Usuario atualiza o proprio perfil"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Politicas: reviews
drop policy if exists "Avaliacoes visiveis publicamente" on public.reviews;
create policy "Avaliacoes visiveis publicamente"
  on public.reviews
  for select
  using (true);

drop policy if exists "Usuario autenticado publica avaliacao" on public.reviews;
create policy "Usuario autenticado publica avaliacao"
  on public.reviews
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Usuario edita a propria avaliacao" on public.reviews;
create policy "Usuario edita a propria avaliacao"
  on public.reviews
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Usuario exclui a propria avaliacao" on public.reviews;
create policy "Usuario exclui a propria avaliacao"
  on public.reviews
  for delete
  using (auth.uid() = user_id);

-- Politicas: favorite_lists
drop policy if exists "Usuario visualiza proprias listas" on public.favorite_lists;
create policy "Usuario visualiza proprias listas"
  on public.favorite_lists
  for select
  using (auth.uid() = user_id);

drop policy if exists "Usuario cria proprias listas" on public.favorite_lists;
create policy "Usuario cria proprias listas"
  on public.favorite_lists
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Usuario atualiza proprias listas" on public.favorite_lists;
create policy "Usuario atualiza proprias listas"
  on public.favorite_lists
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Usuario exclui proprias listas" on public.favorite_lists;
create policy "Usuario exclui proprias listas"
  on public.favorite_lists
  for delete
  using (auth.uid() = user_id);

-- Politicas: favorite_list_items
drop policy if exists "Usuario visualiza itens das proprias listas" on public.favorite_list_items;
create policy "Usuario visualiza itens das proprias listas"
  on public.favorite_list_items
  for select
  using (
    exists (
      select 1
      from public.favorite_lists fl
      where fl.id = favorite_list_items.list_id
        and fl.user_id = auth.uid()
    )
  );

drop policy if exists "Usuario adiciona itens nas proprias listas" on public.favorite_list_items;
create policy "Usuario adiciona itens nas proprias listas"
  on public.favorite_list_items
  for insert
  with check (
    exists (
      select 1
      from public.favorite_lists fl
      where fl.id = favorite_list_items.list_id
        and fl.user_id = auth.uid()
    )
  );

drop policy if exists "Usuario atualiza itens nas proprias listas" on public.favorite_list_items;
create policy "Usuario atualiza itens nas proprias listas"
  on public.favorite_list_items
  for update
  using (
    exists (
      select 1
      from public.favorite_lists fl
      where fl.id = favorite_list_items.list_id
        and fl.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.favorite_lists fl
      where fl.id = favorite_list_items.list_id
        and fl.user_id = auth.uid()
    )
  );

drop policy if exists "Usuario remove itens das proprias listas" on public.favorite_list_items;
create policy "Usuario remove itens das proprias listas"
  on public.favorite_list_items
  for delete
  using (
    exists (
      select 1
      from public.favorite_lists fl
      where fl.id = favorite_list_items.list_id
        and fl.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Carga inicial de avaliacoes comunitarias (idempotente)
-- -----------------------------------------------------------------------------
insert into public.reviews (
  id,
  place_id,
  user_id,
  author_name,
  infantil,
  acessibilidade,
  pet,
  atendimento,
  comment,
  edited,
  created_at,
  updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'espaco-cultural-jose-lins-do-rego',
    null,
    'Visitante de Tambauzinho',
    5, 5, 3, 4,
    'Rampas largas sem degraus no salão principal e banheiros adaptados sinalizados. Ótima opção cultural gratuita para ir com crianças e avós.',
    false,
    '2026-11-12T12:00:00Z',
    '2026-11-12T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'espaco-cultural-jose-lins-do-rego',
    null,
    'Família Costa',
    4, 5, 3, 5,
    'A biblioteca oferece área silenciosa para pausas sensoriais e a equipe da recepção orientou sobre o acesso térreo.',
    false,
    '2026-11-04T12:00:00Z',
    '2026-11-04T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'estacao-cabo-branco',
    null,
    'Cuidadora de Manaíra',
    5, 5, 4, 5,
    'Circulação excelente para cadeira de rodas, piso regular e salas expositivas climatizadas com pouco ruído.',
    false,
    '2026-11-15T12:00:00Z',
    '2026-11-15T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'centro-cultural-sao-francisco',
    null,
    'Visitante do Centro',
    3, 4, 2, 5,
    'Ambiente muito silencioso e acolhedor. Como é patrimônio histórico, há trechos de calçamento antigo, mas os guias auxiliam no percurso mais plano.',
    false,
    '2026-11-08T12:00:00Z',
    '2026-11-08T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'parque-solon-de-lucena',
    null,
    'Morador da Torre',
    4, 5, 5, 4,
    'Ótimo piso tátil e rampas nas travessias. Passeio amplo para caminhar com idosos e cães de todos os portes no início da manhã ou fim da tarde.',
    false,
    '2026-11-10T12:00:00Z',
    '2026-11-10T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'jardim-botanico-benjamin-maranhao',
    null,
    'Mãe dos Bancários',
    4, 4, null, 5,
    'Ambiente extremamente calmo e sombreado, excelente para crianças com sensibilidade auditiva. Importante observar que não aceita pets por ser reserva de fauna silvestre.',
    false,
    '2026-11-14T12:00:00Z',
    '2026-11-14T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    'parque-zoobotanico-bica',
    null,
    'Família Oliveira',
    5, 4, null, 4,
    'Estrutura infantil excelente com áreas amplas para piquenique e trocador no bloco principal. Pets domésticos não são permitidos devido aos animais do parque.',
    false,
    '2026-11-11T12:00:00Z',
    '2026-11-11T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    'parque-linear-parahyba',
    null,
    'Tutor do Bessa',
    4, 5, 5, 4,
    'Espaço aberto 24h muito utilizado por tutores de cães de médio e grande porte e famílias com carrinho de bebê.',
    false,
    '2026-11-16T12:00:00Z',
    '2026-11-16T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    'bistro-jardim-da-orla',
    null,
    'Visitante de Manaíra',
    5, 5, 4, 5,
    'Salão silencioso e com iluminação suave; conseguimos almoçar em família com tranquilidade e há rampa sem degraus na entrada.',
    false,
    '2026-11-18T12:00:00Z',
    '2026-11-18T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    'bistro-jardim-da-orla',
    null,
    'Tutora de Dois Cães',
    4, 5, 5, 4,
    'Varanda coberta ventilada que aceita cão de porte médio e equipe sempre atenta para renovar os potes de água.',
    false,
    '2026-11-09T12:00:00Z',
    '2026-11-09T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    'quintal-bessa-familia',
    null,
    'Família Santos',
    5, 5, 5, 4,
    'Espaço kids realmente monitorado e seguro. Levamos nosso cachorro de porte médio e ficamos em uma área coberta ventilada.',
    false,
    '2026-11-17T12:00:00Z',
    '2026-11-17T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000012',
    'quintal-bessa-familia',
    null,
    'Visitante do Bessa',
    5, 4, 5, 5,
    'Banheiro adaptado limpo, cadeirões conservados e sala lateral mais silenciosa para quem prefere menos movimento.',
    false,
    '2026-11-06T12:00:00Z',
    '2026-11-06T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    'casa-calma-gastronomia',
    null,
    'Visitante de Cabo Branco',
    4, 5, 4, 5,
    'Melhor ambiente acústico que já visitamos em João Pessoa. Cardápio com fonte grande e atendimento extremamente paciente.',
    false,
    '2026-11-19T12:00:00Z',
    '2026-11-19T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000014',
    'casa-calma-gastronomia',
    null,
    'Acompanhante de Idoso',
    4, 5, 5, 5,
    'Piso tátil bem instalado, cadeiras com apoio de braço e mesas bem espaçadas para cadeira de rodas.',
    false,
    '2026-11-05T12:00:00Z',
    '2026-11-05T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000015',
    'cafeteria-acolher-tambau',
    null,
    'Visitante de Tambaú',
    4, 5, 5, 5,
    'Varanda protegida do sol e da chuva, equipe cordial e confirmação de mesa térrea pelo WhatsApp.',
    false,
    '2026-11-16T12:00:00Z',
    '2026-11-16T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000016',
    'padaria-sabor-dos-bancarios',
    null,
    'Morador dos Bancários',
    4, 4, 4, 5,
    'Bom custo-benefício para café da manhã em família. Entrada sem degraus e atendimento atencioso com idosos.',
    false,
    '2026-11-13T12:00:00Z',
    '2026-11-13T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000017',
    'cantina-brisa-do-bessa',
    null,
    'Tutor de Cão Grande',
    4, 4, 5, 5,
    'Raro restaurante na orla que recebe cães de porte grande em área coberta sem restrições constrangedoras.',
    false,
    '2026-11-15T12:00:00Z',
    '2026-11-15T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000018',
    'cafe-silencio-e-leitura',
    null,
    'Visitante Neurodivergente',
    3, 5, 4, 5,
    'Zero música alta, iluminação muito confortável e cabines reservadas. Referência em previsibilidade sensorial em Manaíra.',
    false,
    '2026-11-18T12:00:00Z',
    '2026-11-18T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000019',
    'espaco-brincar-e-cuidar',
    null,
    'Mãe dos Bancários',
    5, 5, 2, 5,
    'A sala de descompressão sensorial faz toda diferença para meu filho autista. Trocador amplo e equipe preparada.',
    false,
    '2026-11-19T12:00:00Z',
    '2026-11-19T12:00:00Z'
  )
on conflict (id) do nothing;
