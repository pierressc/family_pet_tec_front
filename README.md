# Family Place

Aplicação web colaborativa para ajudar famílias, tutores de pets, pessoas idosas, pessoas com deficiência e pessoas neurodivergentes a encontrarem estabelecimentos e espaços públicos acolhedores em João Pessoa (PB) antes de sair de casa.

**Aplicação publicada:** https://pierressc.github.io/family_pet_tec_front/

## Funcionalidades principais

- **Exploração com busca e filtros combinados:** pesquisa por nome, bairro ou categoria, com filtros para Estrutura Infantil, Pet Friendly, Acessibilidade e Conforto Sensorial, além de ordenação por relevância ou por critério específico.
- **Detalhes completos do local:** visão geral com características disponíveis, cardápio ou destaques da casa, atalhos para WhatsApp e site oficial, e resumo de notas por critério.
- **Avaliações na nuvem com conta de usuário:** visitantes visualizam todas as avaliações e médias (incluindo o tratamento de "Não se aplica"); usuários autenticados podem publicar, editar e excluir sua própria avaliação em cada local.
- **Listas personalizadas de favoritos:** usuários autenticados podem criar, renomear e excluir listas próprias e organizar locais em múltiplas listas sincronizadas no banco de dados.
- **Tema claro e escuro e acessibilidade:** interface responsiva de 360 px a 1440 px, navegação por teclado, contrastes adequados e alternância entre tema claro e escuro.

## Tecnologias utilizadas

- **React 19** e **Vite 6**
- **Supabase** (Autenticação por e-mail/senha e banco de dados **PostgreSQL** com Row Level Security)
- **GitHub Actions** e **GitHub Pages** para compilação e publicação automática

## Como configurar o Supabase e executar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar as tabelas e políticas no Supabase

1. Acesse o painel do seu projeto no Supabase e abra o **SQL Editor**.
2. Copie todo o conteúdo de `supabase/schema.sql` e execute uma única vez.
3. O script cria automaticamente:
   - `public.profiles` (com trigger para preencher o nome de exibição no cadastro);
   - `public.reviews` (com restrições de integridade e carga inicial de avaliações comunitárias);
   - `public.favorite_lists` e `public.favorite_list_items`;
   - políticas de Row Level Security (RLS) em todas as tabelas.

### 3. Configurar variáveis de ambiente

Crie o arquivo `.env.local` na raiz do repositório a partir do modelo `.env.example`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
```

O arquivo `.env.local` está listado no `.gitignore` e nunca é enviado ao repositório.

### 4. Executar em desenvolvimento ou gerar build

```bash
npm run dev
```

Para validar o build de produção:

```bash
npm run build
```

## Publicação automática no GitHub Pages

Cada envio para a branch `main` dispara o workflow `.github/workflows/deploy.yml`, que compila o projeto e publica a pasta `dist/` no GitHub Pages.

Para habilitar o banco de dados na versão publicada, cadastre os segredos abaixo em **Settings > Secrets and variables > Actions** do repositório:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
