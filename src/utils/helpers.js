export const PILLARS = [
  {
    key: 'infantil',
    label: 'Estrutura Infantil',
    shortLabel: 'Infantil',
    description: 'Trocador, espaço kids, cadeirão e segurança.',
  },
  {
    key: 'acessibilidade',
    label: 'Acessibilidade e Conforto',
    shortLabel: 'Acessib.',
    description: 'Rampas, banheiro adaptado, assentos e conforto sensorial.',
  },
  {
    key: 'pet',
    label: 'Pet Friendly',
    shortLabel: 'Pet',
    description: 'Área coberta, potes de água e portes aceitos.',
  },
  {
    key: 'atendimento',
    label: 'Atendimento e Custo-Benefício',
    shortLabel: 'Atend.',
    description: 'Cordialidade, preparo da equipe e preços justos.',
  },
];

export const CATEGORIAS = [
  'Restaurante',
  'Cafeteria / Padaria',
  'Parque / Lazer / Cultura',
  'Serviço / Lazer',
];

export const FILTER_GROUPS = [
  {
    key: 'infantil',
    title: 'Estrutura Infantil',
    options: [
      'Espaço Kids Monitorado',
      'Trocador Acessível',
      'Cadeirão Infantil',
      'Área Infantil Segura',
    ],
  },
  {
    key: 'pet',
    title: 'Pet Friendly',
    options: [
      'Aceita Pet Porte Pequeno',
      'Aceita Pet Porte Médio',
      'Aceita Pet Porte Grande',
      'Área Coberta Permitida',
      'Potes de Água Disponíveis',
    ],
  },
  {
    key: 'acessibilidade',
    title: 'Acessibilidade',
    options: [
      'Rampa de Acessibilidade',
      'Banheiro Adaptado',
      'Piso Tátil / Sinalização',
      'Assentos Confortáveis',
      'Circulação Ampla',
    ],
  },
  {
    key: 'sensorial',
    title: 'Conforto Sensorial',
    options: [
      'Ambiente com Baixo Ruído',
      'Iluminação Controlada',
      'Área Reservada / Calma',
      'Cardápio / Comunicação Visual',
    ],
  },
];

export const CIDADES_BRASIL = [
  { id: 'joao-pessoa-pb', nome: 'João Pessoa', uf: 'PB', ativa: true },
  { id: 'recife-pe', nome: 'Recife', uf: 'PE', ativa: false },
  { id: 'natal-rn', nome: 'Natal', uf: 'RN', ativa: false },
  { id: 'fortaleza-ce', nome: 'Fortaleza', uf: 'CE', ativa: false },
  { id: 'salvador-ba', nome: 'Salvador', uf: 'BA', ativa: false },
  { id: 'sao-paulo-sp', nome: 'São Paulo', uf: 'SP', ativa: false },
  { id: 'rio-de-janeiro-rj', nome: 'Rio de Janeiro', uf: 'RJ', ativa: false },
  { id: 'curitiba-pr', nome: 'Curitiba', uf: 'PR', ativa: false },
  { id: 'florianopolis-sc', nome: 'Florianópolis', uf: 'SC', ativa: false },
];

export function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function calculatePillarAverages(avaliacoes) {
  const list = Array.isArray(avaliacoes) ? avaliacoes : [];
  const total = list.length;

  const result = {};
  for (const pillar of PILLARS) {
    if (total === 0) {
      result[pillar.key] = {
        value: null,
        status: 'empty',
        formatted: 'Sem avaliações',
        shortFormatted: 'Sem aval.',
      };
      continue;
    }

    const validScores = list
      .map((item) => item.pilares?.[pillar.key])
      .filter((v) => typeof v === 'number' && v >= 1 && v <= 5);

    if (validScores.length === 0) {
      result[pillar.key] = {
        value: null,
        status: 'na',
        formatted: 'Não se aplica',
        shortFormatted: 'N/A',
      };
    } else {
      const sum = validScores.reduce((acc, v) => acc + v, 0);
      const avg = Math.round((sum / validScores.length) * 10) / 10;
      const formatted = avg.toFixed(1).replace('.', ',');
      result[pillar.key] = {
        value: avg,
        status: 'rated',
        formatted,
        shortFormatted: formatted,
      };
    }
  }

  return {
    total,
    pillars: result,
  };
}

export function getOverallScore(averages) {
  if (!averages || averages.total === 0) return -1;
  const vals = PILLARS.map((p) => averages.pillars[p.key].value).filter((v) => v !== null);
  if (vals.length === 0) return -1;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function getAllTagsFlat(local) {
  if (!local?.tags) return [];
  return [
    ...(local.tags.infantil || []),
    ...(local.tags.acessibilidade || []),
    ...(local.tags.sensorial || []),
    ...(local.tags.pet || []),
  ];
}

export function getImageUrl(filename) {
  if (!filename) return '';
  return `${import.meta.env.BASE_URL}images/${filename}`;
}

export function getVitrineImageUrl(filename) {
  if (!filename) return '';
  return `${import.meta.env.BASE_URL}images/vitrine/${filename}`;
}

export function getVitrineTabLabel(categoria) {
  if (categoria === 'Restaurante' || categoria === 'Cafeteria / Padaria') {
    return 'Cardápio';
  }
  return 'Destaques';
}

export function getReviewAverageScore(review) {
  if (!review?.pilares) return 0;
  const vals = PILLARS.map((p) => review.pilares[p.key]).filter(
    (v) => typeof v === 'number' && v >= 1 && v <= 5
  );
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function buildWhatsAppUrl(numero, nomeLocal) {
  if (!numero) return '';
  const digits = String(numero).replace(/\D/g, '');
  const message = `Olá! Encontrei ${nomeLocal} no Family Place e gostaria de confirmar informações sobre atendimento e estrutura.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const parts = String(isoDate).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const DEFAULT_FAVORITES_LIST_NAME = 'Favoritos';

export function isDefaultFavoritesList(list) {
  if (!list) return false;
  if (list.isDefault) return true;
  return normalizeText(list.nome) === normalizeText(DEFAULT_FAVORITES_LIST_NAME);
}

export function sortFavoriteLists(lists) {
  if (!Array.isArray(lists)) return [];
  let defaultAssigned = false;
  const normalized = lists.map((list) => {
    const matchesDefault =
      !defaultAssigned &&
      normalizeText(list?.nome) === normalizeText(DEFAULT_FAVORITES_LIST_NAME);
    if (matchesDefault) {
      defaultAssigned = true;
      return { ...list, isDefault: true };
    }
    return { ...list, isDefault: false };
  });

  const defaultLists = normalized.filter((list) => list.isDefault);
  const customLists = normalized.filter((list) => !list.isDefault);
  return [...defaultLists, ...customLists];
}

export function formatReviewsCount(total) {
  const count = Number(total) || 0;
  if (count === 0) return 'Sem avaliações';
  if (count === 1) return '1 avaliação';
  return `${count} avaliações`;
}
