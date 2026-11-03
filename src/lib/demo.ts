import type { CategoryId, Garment, Season, Style } from '../types'

type Seed = {
  name: string
  category: CategoryId
  sub: string
  brand: string
  color: string
  material: string
  size: string
  seasons: Season[]
  styles: Style[]
  formality: 1 | 2 | 3 | 4 | 5
  price: number
}

const ALL: Season[] = ['printemps', 'ete', 'automne', 'hiver']

const SEEDS: Seed[] = [
  { name: 'Chemise Oxford blanche', category: 'chemise', sub: 'Oxford', brand: 'Ralph Lauren', color: '#f6f4ee', material: 'Coton', size: 'M', seasons: ALL, styles: ['classique', 'old money'], formality: 4, price: 129 },
  { name: 'Chemise en lin bleu ciel', category: 'chemise', sub: 'Lin', brand: 'Massimo Dutti', color: '#a9c4e0', material: 'Lin', size: 'M', seasons: ['printemps', 'ete'], styles: ['casual', 'classique'], formality: 3, price: 89 },
  { name: 'T-shirt blanc', category: 'tshirt', sub: 'Col rond', brand: 'Sunspel', color: '#f6f4ee', material: 'Coton', size: 'M', seasons: ['printemps', 'ete', 'automne'], styles: ['casual'], formality: 2, price: 55 },
  { name: 'T-shirt noir', category: 'tshirt', sub: 'Col rond', brand: 'Uniqlo', color: '#161616', material: 'Coton', size: 'M', seasons: ALL, styles: ['casual', 'streetwear'], formality: 1, price: 20 },
  { name: 'Polo marine piqué', category: 'polo', sub: 'Piqué', brand: 'Lacoste', color: '#1c2b4a', material: 'Coton', size: 'M', seasons: ['printemps', 'ete', 'automne'], styles: ['classique', 'casual'], formality: 3, price: 99 },
  { name: 'Pull marine col rond', category: 'pull', sub: 'Col rond', brand: 'Loro Piana', color: '#1c2b4a', material: 'Cachemire', size: 'M', seasons: ['automne', 'hiver'], styles: ['old money', 'classique'], formality: 4, price: 420 },
  { name: 'Pull gris chiné', category: 'pull', sub: 'Col V', brand: 'Uniqlo', color: '#8b8b8b', material: 'Laine', size: 'M', seasons: ['automne', 'hiver'], styles: ['casual', 'classique'], formality: 3, price: 50 },
  { name: 'Sweat à capuche noir', category: 'sweat', sub: 'Capuche', brand: 'Carhartt', color: '#161616', material: 'Coton', size: 'L', seasons: ['automne', 'hiver', 'printemps'], styles: ['streetwear', 'casual'], formality: 1, price: 95 },
  { name: 'Pantalon chino beige', category: 'pantalon', sub: 'Chino', brand: 'Ralph Lauren', color: '#cdb994', material: 'Coton', size: '32', seasons: ['printemps', 'ete', 'automne'], styles: ['classique', 'old money'], formality: 3, price: 110 },
  { name: 'Pantalon de costume anthracite', category: 'pantalon', sub: 'Laine froide', brand: 'Suitsupply', color: '#3a3b3d', material: 'Laine', size: '32', seasons: ['automne', 'hiver', 'printemps'], styles: ['business', 'classique'], formality: 5, price: 180 },
  { name: 'Jean brut brun foncé', category: 'jean', sub: 'Slim', brand: 'A.P.C.', color: '#3a2a20', material: 'Denim', size: '31', seasons: ALL, styles: ['casual'], formality: 2, price: 150 },
  { name: 'Short en lin écru', category: 'short', sub: 'Lin', brand: 'Massimo Dutti', color: '#e9e0cc', material: 'Lin', size: 'M', seasons: ['ete'], styles: ['casual'], formality: 2, price: 59 },
  { name: 'Veste en laine camel', category: 'veste', sub: 'Blazer', brand: 'Brunello Cucinelli', color: '#b58a56', material: 'Laine', size: '50', seasons: ['automne', 'printemps', 'hiver'], styles: ['old money', 'classique'], formality: 4, price: 890 },
  { name: 'Manteau en laine marine', category: 'manteau', sub: 'Pardessus', brand: 'Suitsupply', color: '#1c2b4a', material: 'Laine', size: '50', seasons: ['hiver', 'automne'], styles: ['classique', 'business'], formality: 4, price: 450 },
  { name: 'Blouson Harrington beige', category: 'blouson', sub: 'Harrington', brand: 'Baracuta', color: '#cdb994', material: 'Coton', size: 'M', seasons: ['printemps', 'automne'], styles: ['casual', 'old money'], formality: 3, price: 320 },
  { name: 'Mocassins marron', category: 'chaussures', sub: 'Mocassins', brand: 'Church’s', color: '#5e4331', material: 'Cuir', size: '43', seasons: ALL, styles: ['classique', 'old money'], formality: 4, price: 520 },
  { name: 'Derbies noirs', category: 'chaussures', sub: 'Derbies', brand: 'Church’s', color: '#161616', material: 'Cuir', size: '43', seasons: ALL, styles: ['business', 'soiree'], formality: 5, price: 480 },
  { name: 'Baskets blanches', category: 'baskets', sub: 'Cuir', brand: 'Common Projects', color: '#f6f4ee', material: 'Cuir', size: '43', seasons: ['printemps', 'ete', 'automne'], styles: ['casual'], formality: 2, price: 410 },
  { name: 'Bottines chelsea marron', category: 'bottines', sub: 'Chelsea', brand: 'Crockett & Jones', color: '#3a2a20', material: 'Daim', size: '43', seasons: ['automne', 'hiver'], styles: ['classique', 'soiree'], formality: 4, price: 560 },
  { name: 'Ceinture en cuir marron', category: 'ceinture', sub: 'Cuir', brand: 'Anderson’s', color: '#5e4331', material: 'Cuir', size: '90', seasons: ALL, styles: ['classique'], formality: 4, price: 120 },
  { name: 'Montre à bracelet cuir', category: 'montre', sub: 'Habillée', brand: 'Jaeger-LeCoultre', color: '#c5ad83', material: 'Cuir', size: 'U', seasons: ALL, styles: ['classique', 'old money'], formality: 4, price: 0 },
]

/** Jeu de pièces de démonstration (sans photo). Clairement étiquetées « Démo ». */
export function demoGarments(): Omit<Garment, 'id' | 'createdAt'>[] {
  return SEEDS.map((s) => ({
    name: s.name,
    category: s.category,
    subcategory: s.sub,
    brand: s.brand,
    color: s.color,
    secondaryColors: [],
    material: s.material,
    size: s.size,
    seasons: s.seasons,
    styles: s.styles,
    formality: s.formality,
    purchaseDate: '',
    price: s.price || null,
    notes: 'Démo',
    photo: '',
    wornDates: [],
    status: 'available' as const,
  }))
}
