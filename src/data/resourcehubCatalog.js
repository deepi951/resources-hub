export const categoryCatalog = {
  'Books & Textbooks': {
    subcategories: [
      'Computer Science',
      'Mathematics',
      'MCA',
      'Engineering',
      'Programming',
      'Database',
      'Networking',
      'Other Books',
    ],
  },
  Calculators: {
    subcategories: [
      'Scientific Calculator',
      'Basic / Normal Calculator',
      'Financial Calculator',
      'Graphing Calculator',
      'Programmable Calculator',
      'Printing Calculator',
      'Desktop Calculator',
      'Other Calculators',
    ],
  },
  Laptops: {
    subcategories: ['Acer', 'HP', 'Dell', 'Lenovo', 'ASUS', 'Apple MacBook', 'MSI', 'Other Laptops'],
  },
  'Lab Tools': {
    subcategories: [
      'Electronics Tools',
      'Networking Tools',
      'Computer Hardware Tools',
      'Measuring Tools',
      'Soldering Tools',
      'Other Lab Tools',
    ],
  },
  'Lab Coats': {
    subcategories: [
      'White Lab Coat',
      'Cotton Lab Coat',
      'Full Sleeve Lab Coat',
      'Half Sleeve Lab Coat',
      'Other Lab Coats',
    ],
  },
  Stationery: {
    subcategories: ['Pens', 'Pencils', 'Notebooks', 'Files & Folders', 'Highlighters', 'Geometry Box', 'Sticky Notes', 'Other Stationery'],
  },
}

export const mainCategories = Object.keys(categoryCatalog)

export const getSubcategoriesForCategory = (category) => {
  if (!category) return []
  return categoryCatalog[category]?.subcategories || []
}

export const getDefaultSubcategoryForCategory = (category) => {
  const subcategories = getSubcategoriesForCategory(category)
  if (!subcategories.length) return ''

  return subcategories[0]
}

export const normalizeProductSubcategory = (product = {}) => {
  const { category, subcategory } = product
  const categoryOptions = getSubcategoriesForCategory(category)

  if (!category || !categoryOptions.length) {
    return { ...product, subcategory: '' }
  }

  if (subcategory && categoryOptions.includes(subcategory)) {
    return product
  }

  return { ...product, subcategory: getDefaultSubcategoryForCategory(category) }
}

export const getCategorySummary = (products = []) => {
  const summary = mainCategories.map((category) => ({
    name: category,
    count: products.filter((product) => product.category === category).length,
  }))

  return summary
}

export const demoProducts = [
  {
    id: 'demo-book-cs',
    title: 'Data Structures and Algorithms Guide',
    description: 'Used engineering textbook covering arrays, stacks, trees, and algorithm design for semester preparation.',
    category: 'Books & Textbooks',
    subcategory: 'Computer Science',
    price: 320,
    condition: 'Good',
    quantity: 1,
    location: 'Campus',
    block: 'CSE Block',
    sellerName: 'Ritika S.',
    status: 'Approved',
    views: 120,
    favoritesCount: 8,
    images: [],
  },
  {
    id: 'demo-book-maths',
    title: 'Engineering Mathematics Handbook',
    description: 'Mathematics reference book with formulas, solved examples, and exam-oriented practice sets.',
    category: 'Books & Textbooks',
    subcategory: 'Mathematics',
    price: 260,
    condition: 'Like New',
    quantity: 1,
    location: 'Hostel',
    block: 'A Block',
    sellerName: 'Arjun K.',
    status: 'Approved',
    views: 90,
    favoritesCount: 5,
    images: [],
  },
  {
    id: 'demo-calc-scientific',
    title: 'Casio Scientific Calculator',
    description: 'Reliable scientific calculator for engineering mathematics, statistics, and lab calculations.',
    category: 'Calculators',
    subcategory: 'Scientific Calculator',
    price: 580,
    condition: 'Good',
    quantity: 1,
    location: 'Campus',
    block: 'Science Block',
    sellerName: 'Mithun P.',
    status: 'Approved',
    views: 160,
    favoritesCount: 11,
    images: [],
  },
  {
    id: 'demo-calc-basic',
    title: 'Basic Calculator for Lab Work',
    description: 'Compact calculator ideal for basic arithmetic and quick academic calculations.',
    category: 'Calculators',
    subcategory: 'Basic / Normal Calculator',
    price: 210,
    condition: 'Used',
    quantity: 1,
    location: 'Campus',
    block: 'Mechanical Block',
    sellerName: 'Sneha V.',
    status: 'Approved',
    views: 78,
    favoritesCount: 3,
    images: [],
  },
  {
    id: 'demo-laptop-hp',
    title: 'HP Pavilion 14 Laptop',
    description: 'Lightweight laptop for coding, reports, and day-to-day academic tasks with good battery life.',
    category: 'Laptops',
    subcategory: 'HP',
    price: 32000,
    condition: 'Good',
    quantity: 1,
    location: 'Campus',
    block: 'CSE Block',
    sellerName: 'Karthik N.',
    status: 'Approved',
    views: 210,
    favoritesCount: 19,
    images: [],
  },
  {
    id: 'demo-laptop-dell',
    title: 'Dell Inspiron 15',
    description: 'Dell laptop with performance suitable for assignments, coding work, and everyday student use.',
    category: 'Laptops',
    subcategory: 'Dell',
    price: 34500,
    condition: 'Like New',
    quantity: 1,
    location: 'Hostel',
    block: 'B Block',
    sellerName: 'Nisha R.',
    status: 'Approved',
    views: 174,
    favoritesCount: 14,
    images: [],
  },
  {
    id: 'demo-lab-tools-multimeter',
    title: 'Digital Multimeter Tester',
    description: 'Accurate measuring tool for circuit analysis and electronics lab experiments.',
    category: 'Lab Tools',
    subcategory: 'Measuring Tools',
    price: 860,
    condition: 'Good',
    quantity: 1,
    location: 'Campus',
    block: 'EEE Lab',
    sellerName: 'Deepak M.',
    status: 'Approved',
    views: 142,
    favoritesCount: 10,
    images: [],
  },
  {
    id: 'demo-lab-tools-soldering',
    title: 'Soldering Kit with Iron',
    description: 'Compact soldering kit suitable for electronics projects and practical lab work.',
    category: 'Lab Tools',
    subcategory: 'Soldering Tools',
    price: 720,
    condition: 'Good',
    quantity: 1,
    location: 'Campus',
    block: 'ECE Workshop',
    sellerName: 'Saran T.',
    status: 'Approved',
    views: 98,
    favoritesCount: 6,
    images: [],
  },
  {
    id: 'demo-lab-coat-white',
    title: 'White Full Sleeve Lab Coat',
    description: 'Comfort-fit white lab coat suitable for practical sessions and laboratory use.',
    category: 'Lab Coats',
    subcategory: 'White Lab Coat',
    price: 710,
    condition: 'Like New',
    quantity: 1,
    location: 'Campus',
    block: 'Chemistry Lab',
    sellerName: 'Vignesh D.',
    status: 'Approved',
    views: 129,
    favoritesCount: 9,
    images: [],
  },
  {
    id: 'demo-lab-coat-women',
    title: 'Women’s Half Sleeve Lab Coat',
    description: 'Comfortable lab coat made for practical sessions and safe, clean lab usage.',
    category: 'Lab Coats',
    subcategory: 'Half Sleeve Lab Coat',
    price: 640,
    condition: 'Good',
    quantity: 1,
    location: 'Campus',
    block: 'Biotech Lab',
    sellerName: 'Priya J.',
    status: 'Approved',
    views: 88,
    favoritesCount: 4,
    images: [],
  },
  {
    id: 'demo-stationery-notebook',
    title: 'A4 Notebook Bundle',
    description: 'Packed notebook set ideal for assignments, notes, and project documentation.',
    category: 'Stationery',
    subcategory: 'Notebooks',
    price: 180,
    condition: 'New',
    quantity: 3,
    location: 'Campus',
    block: 'Library',
    sellerName: 'Asha K.',
    status: 'Approved',
    views: 70,
    favoritesCount: 2,
    images: [],
  },
  {
    id: 'demo-stationery-marker',
    title: 'Marker Set for Notes and Diagrams',
    description: 'Color marker set for classroom notes, diagrams, and presentation prep.',
    category: 'Stationery',
    subcategory: 'Highlighters',
    price: 150,
    condition: 'New',
    quantity: 2,
    location: 'Campus',
    block: 'Study Hall',
    sellerName: 'Ishita G.',
    status: 'Approved',
    views: 64,
    favoritesCount: 4,
    images: [],
  },
]
