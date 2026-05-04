/**
 * searchExpand.ts
 * ───────────────
 * Expands a raw search query into a richer set of terms so that e.g.
 *  • "mechanic"     → also matches "garagist", "garage", "auto repair"
 *  • "shoes"        → also matches "boutique", "fashion", "footwear", "retail"
 *  • "start motor"  → also matches "starter", "garage", "auto repair"
 *  • "car alarm"    → also matches "security system", "garage", "auto accessories"
 *  • "cake"         → also matches "bakery", "patisserie", "pastry"
 *
 * Returned: { terms: string[], categoryHint: string | null }
 *   terms        – deduplicated list of words/phrases to OR-search across db fields
 *   categoryHint – optional DB category value to OR against the `category` column
 *                  (must match actual DB values: auto, retail, beauty, health, etc.)
 */

// ── Synonym table (lowercased keys + values) ─────────────────────────────────
const SYNONYMS: Record<string, string[]> = {

  // ─── Automotive / Garage ──────────────────────────────────────────────────
  mechanic:         ['mechanic', 'garagist', 'garage', 'auto repair', 'car repair', 'workshop', 'motor garage', 'automobile repair', 'auto workshop'],
  garagist:         ['garagist', 'garage', 'mechanic', 'auto repair', 'car workshop'],
  garage:           ['garage', 'mechanic', 'garagist', 'auto repair', 'workshop', 'auto workshop'],
  'auto repair':    ['auto repair', 'mechanic', 'garagist', 'garage', 'car repair', 'workshop'],
  'car repair':     ['car repair', 'mechanic', 'garagist', 'garage', 'auto repair'],
  'motor repair':   ['motor repair', 'engine repair', 'mechanic', 'garage', 'auto repair', 'workshop'],
  workshop:         ['workshop', 'garage', 'mechanic', 'auto repair', 'car repair'],
  // Auto parts & accessories
  starter:          ['starter', 'start motor', 'engine starter', 'auto parts', 'garage', 'mechanic', 'car parts', 'auto accessories'],
  'start motor':    ['start motor', 'starter', 'engine starter', 'auto parts', 'garage', 'mechanic', 'car parts'],
  'starting motor': ['starting motor', 'starter', 'start motor', 'auto parts', 'garage', 'mechanic'],
  alternator:       ['alternator', 'generator', 'auto parts', 'car parts', 'electrical', 'garage', 'mechanic'],
  'car alarm':      ['car alarm', 'alarm system', 'security system', 'auto accessories', 'car accessories', 'garage', 'auto parts'],
  'car security':   ['car security', 'car alarm', 'alarm', 'auto accessories', 'garage'],
  'car audio':      ['car audio', 'car stereo', 'car speaker', 'auto accessories', 'car accessories'],
  radiator:         ['radiator', 'cooling system', 'auto parts', 'car parts', 'garage', 'mechanic'],
  battery:          ['battery', 'car battery', 'auto parts', 'garage', 'mechanic'],
  brakes:           ['brakes', 'brake pads', 'auto parts', 'car parts', 'garage', 'mechanic'],
  suspension:       ['suspension', 'shocks', 'shock absorber', 'auto parts', 'car parts', 'garage'],
  exhaust:          ['exhaust', 'muffler', 'auto parts', 'car parts', 'garage'],
  'auto parts':     ['auto parts', 'car parts', 'spare parts', 'spares', 'garage', 'mechanic', 'auto accessories'],
  'car parts':      ['car parts', 'auto parts', 'spare parts', 'spares', 'garage', 'mechanic'],
  'spare parts':    ['spare parts', 'car parts', 'auto parts', 'spares', 'garage'],
  spares:           ['spares', 'spare parts', 'car parts', 'auto parts', 'garage'],
  tyre:             ['tyre', 'tire', 'wheel', 'puncture', 'rim', 'auto parts'],
  tire:             ['tire', 'tyre', 'wheel', 'puncture', 'auto parts'],
  rim:              ['rim', 'wheel', 'tyre', 'tire', 'auto parts'],
  'car wash':       ['car wash', 'carwash', 'auto wash', 'vehicle wash'],
  carwash:          ['carwash', 'car wash', 'auto wash'],
  'panel beater':   ['panel beater', 'panel shop', 'auto body', 'car body', 'smash repair', 'body shop'],
  panel:            ['panel beater', 'panel shop', 'auto body', 'car body'],
  'auto body':      ['auto body', 'panel beater', 'body shop', 'smash repair'],
  'driving school': ['driving school', 'driver training', 'driving lessons', 'auto school'],
  windscreen:       ['windscreen', 'windshield', 'glass repair', 'auto glass', 'car glass'],
  'car glass':      ['car glass', 'windscreen', 'windshield', 'auto glass'],
  detailing:        ['detailing', 'car detailing', 'car wash', 'auto cleaning', 'valeting'],
  'gas station':    ['gas station', 'petrol station', 'filling station', 'fuel station'],
  petrol:           ['petrol', 'gas station', 'fuel', 'filling station'],
  fuel:             ['fuel', 'petrol', 'gas station', 'filling station'],

  // ─── Fashion / Retail / Clothing ─────────────────────────────────────────
  shoes:            ['shoes', 'footwear', 'boots', 'sandals', 'sneakers', 'boutique', 'fashion', 'shoe shop', 'shoe store', 'retail'],
  footwear:         ['footwear', 'shoes', 'boots', 'sandals', 'sneakers', 'shoe shop', 'retail'],
  sneakers:         ['sneakers', 'shoes', 'trainers', 'footwear', 'sportswear', 'retail', 'boutique'],
  boots:            ['boots', 'shoes', 'footwear', 'retail', 'boutique'],
  sandals:          ['sandals', 'shoes', 'footwear', 'flip flops', 'retail', 'boutique'],
  heels:            ['heels', 'high heels', 'shoes', 'footwear', 'ladies shoes', 'boutique', 'retail'],
  clothing:         ['clothing', 'clothes', 'fashion', 'apparel', 'garments', 'boutique', 'retail', 'wear'],
  clothes:          ['clothes', 'clothing', 'fashion', 'apparel', 'garments', 'boutique', 'retail'],
  fashion:          ['fashion', 'clothing', 'clothes', 'apparel', 'boutique', 'retail', 'style', 'wear'],
  boutique:         ['boutique', 'fashion', 'clothing', 'clothes', 'retail', 'shop', 'store', 'apparel'],
  apparel:          ['apparel', 'clothing', 'clothes', 'fashion', 'garments', 'boutique', 'retail'],
  garments:         ['garments', 'clothing', 'clothes', 'apparel', 'fashion', 'retail'],
  dress:            ['dress', 'dresses', 'gown', 'clothing', 'fashion', 'ladies wear', 'boutique', 'retail'],
  dresses:          ['dresses', 'dress', 'gown', 'clothing', 'fashion', 'boutique', 'retail'],
  shirt:            ['shirt', 'shirts', 'blouse', 'top', 'clothing', 'fashion', 'retail', 'boutique'],
  shirts:           ['shirts', 'shirt', 'blouses', 'clothing', 'fashion', 'retail'],
  jeans:            ['jeans', 'trousers', 'pants', 'denim', 'clothing', 'fashion', 'retail', 'boutique'],
  trousers:         ['trousers', 'pants', 'jeans', 'clothing', 'fashion', 'retail'],
  jacket:           ['jacket', 'coat', 'blazer', 'clothing', 'fashion', 'retail', 'boutique'],
  suits:            ['suits', 'suit', 'formal wear', 'clothing', 'fashion', 'tailor', 'retail'],
  suit:             ['suit', 'suits', 'formal wear', 'tailor', 'clothing', 'fashion', 'retail'],
  tailor:           ['tailor', 'tailoring', 'sewing', 'fashion', 'clothing', 'dressmaker', 'alterations'],
  tailoring:        ['tailoring', 'tailor', 'sewing', 'clothing', 'alterations', 'dressmaker'],
  dressmaker:       ['dressmaker', 'tailor', 'tailoring', 'sewing', 'clothing', 'fashion'],
  fabric:           ['fabric', 'cloth', 'material', 'textile', 'wax print', 'ankara', 'retail'],
  ankara:           ['ankara', 'wax print', 'fabric', 'cloth', 'african print', 'textile', 'retail'],
  'wax print':      ['wax print', 'ankara', 'fabric', 'african print', 'textile', 'retail'],
  accessories:      ['accessories', 'fashion accessories', 'jewelry', 'bags', 'belts', 'boutique', 'retail'],
  bag:              ['bag', 'bags', 'handbag', 'purse', 'backpack', 'boutique', 'retail', 'accessories'],
  bags:             ['bags', 'bag', 'handbags', 'purses', 'backpacks', 'boutique', 'retail', 'accessories'],
  handbag:          ['handbag', 'bag', 'purse', 'ladies bag', 'boutique', 'retail', 'accessories'],
  backpack:         ['backpack', 'bag', 'rucksack', 'school bag', 'retail', 'boutique'],
  jewelry:          ['jewelry', 'jewellery', 'accessories', 'necklace', 'ring', 'bracelet', 'boutique', 'retail'],
  jewellery:        ['jewellery', 'jewelry', 'accessories', 'necklace', 'ring', 'bracelet', 'boutique'],
  watch:            ['watch', 'watches', 'timepiece', 'accessories', 'retail', 'boutique'],
  watches:          ['watches', 'watch', 'timepiece', 'accessories', 'retail'],
  sunglasses:       ['sunglasses', 'glasses', 'eyewear', 'shades', 'retail', 'boutique'],
  hat:              ['hat', 'cap', 'headwear', 'accessories', 'retail'],
  cap:              ['cap', 'hat', 'headwear', 'accessories', 'retail'],
  underwear:        ['underwear', 'lingerie', 'undergarments', 'clothing', 'retail'],
  sportswear:       ['sportswear', 'activewear', 'gym wear', 'sport clothes', 'clothing', 'retail'],
  uniform:          ['uniform', 'workwear', 'school uniform', 'clothing', 'retail', 'tailor'],
  secondhand:       ['secondhand', 'second hand', 'used clothes', 'thrift', 'preloved', 'retail'],
  thrift:           ['thrift', 'secondhand', 'used clothes', 'preloved', 'affordable', 'retail'],
  'shoe repair':    ['shoe repair', 'cobbler', 'footwear repair', 'shoes', 'retail services'],
  cobbler:          ['cobbler', 'shoe repair', 'footwear repair', 'shoes'],

  // ─── Supermarket / General Retail / Shopping ─────────────────────────────
  supermarket:      ['supermarket', 'grocery', 'store', 'shop', 'market', 'retail', 'provisions'],
  grocery:          ['grocery', 'supermarket', 'store', 'provisions', 'food store', 'retail', 'market'],
  market:           ['market', 'supermarket', 'store', 'grocery', 'provisions', 'retail'],
  shop:             ['shop', 'store', 'retail', 'boutique', 'market'],
  store:            ['store', 'shop', 'retail', 'boutique', 'supermarket'],
  provisions:       ['provisions', 'grocery', 'supermarket', 'foodstuff', 'store', 'retail'],
  pharmacy:         ['pharmacy', 'chemist', 'drug store', 'drugstore', 'medicine', 'pharmacist'],
  chemist:          ['chemist', 'pharmacy', 'drug store', 'medicine'],
  hardware:         ['hardware', 'tools', 'construction supplies', 'building materials', 'retail'],
  electronics:      ['electronics', 'gadgets', 'appliances', 'tech', 'phones', 'computers', 'retail'],
  appliances:       ['appliances', 'electronics', 'home appliances', 'white goods', 'retail'],
  furniture:        ['furniture', 'home furnishing', 'carpentry', 'interior', 'retail'],
  mattress:         ['mattress', 'bed', 'bedding', 'furniture', 'retail'],
  bedding:          ['bedding', 'mattress', 'bed linen', 'sheets', 'retail'],
  kitchenware:      ['kitchenware', 'kitchen', 'cookware', 'utensils', 'retail'],
  stationery:       ['stationery', 'office supplies', 'school supplies', 'paper', 'retail'],
  books:            ['books', 'bookshop', 'bookstore', 'stationery', 'education', 'retail'],
  toys:             ['toys', 'games', 'children', 'kids', 'retail'],
  baby:             ['baby', 'infant', 'kids', 'children', 'toys', 'baby shop', 'retail'],
  gifts:            ['gifts', 'gift shop', 'souvenirs', 'presents', 'retail'],
  flowers:          ['flowers', 'florist', 'bouquet', 'floral', 'gifts', 'retail'],
  florist:          ['florist', 'flowers', 'bouquet', 'floral', 'gifts'],
  cosmetics:        ['cosmetics', 'makeup', 'beauty products', 'skincare', 'beauty', 'retail'],
  makeup:           ['makeup', 'cosmetics', 'beauty products', 'skincare', 'beauty', 'retail'],
  skincare:         ['skincare', 'cosmetics', 'beauty products', 'makeup', 'beauty', 'retail'],
  perfume:          ['perfume', 'fragrance', 'cologne', 'beauty', 'retail', 'boutique'],
  'hair products':  ['hair products', 'hair care', 'extensions', 'wigs', 'beauty', 'retail'],
  wigs:             ['wigs', 'hair extensions', 'hair products', 'beauty', 'retail'],
  extensions:       ['extensions', 'hair extensions', 'wigs', 'beauty', 'retail'],
  phone:            ['phone', 'smartphone', 'mobile', 'cell phone', 'electronics', 'retail', 'tech'],
  smartphone:       ['smartphone', 'phone', 'mobile', 'iphone', 'android', 'electronics', 'retail'],
  laptop:           ['laptop', 'computer', 'notebook', 'tech', 'electronics', 'retail'],
  tablet:           ['tablet', 'ipad', 'electronics', 'tech', 'retail'],

  // ─── Phone / Electronics Repair ──────────────────────────────────────────
  'phone repair':   ['phone repair', 'mobile repair', 'screen repair', 'tech repair', 'gadget repair', 'it'],
  'screen repair':  ['screen repair', 'phone repair', 'mobile repair', 'glass repair', 'tech repair'],
  'laptop repair':  ['laptop repair', 'computer repair', 'tech repair', 'it repair', 'it'],
  'computer repair': ['computer repair', 'laptop repair', 'tech repair', 'it repair', 'it'],
  'gadget repair':  ['gadget repair', 'phone repair', 'tech repair', 'electronics repair', 'it'],

  // ─── Food & Drink ─────────────────────────────────────────────────────────
  cake:             ['cake', 'bakery', 'bakeries', 'pastry', 'confectionery', 'patisserie', 'baked goods', 'sweets', 'cakes'],
  cakes:            ['cakes', 'cake', 'bakery', 'pastry', 'patisserie', 'confectionery'],
  cookies:          ['cookies', 'bakery', 'bakeries', 'biscuit', 'pastry', 'confectionery', 'baked'],
  bread:            ['bread', 'bakery', 'bakeries', 'boulangerie', 'baked', 'loaf'],
  pastry:           ['pastry', 'bakery', 'bakeries', 'cake', 'patisserie', 'confectionery'],
  bakery:           ['bakery', 'bakeries', 'patisserie', 'boulangerie', 'pastry', 'confectionery', 'cake shop', 'baked goods'],
  restaurant:       ['restaurant', 'eatery', 'cafe', 'diner', 'food', 'dining', 'bistro', 'canteen'],
  food:             ['food', 'restaurant', 'eatery', 'cafe', 'catering', 'takeaway', 'takeout', 'fast food'],
  catering:         ['catering', 'food', 'restaurant', 'events food', 'cook', 'caterer'],
  pizza:            ['pizza', 'pizzeria', 'restaurant', 'italian food', 'fast food'],
  coffee:           ['coffee', 'cafe', 'coffeehouse', 'espresso', 'barista', 'latte'],
  café:             ['café', 'cafe', 'coffee', 'coffeehouse', 'bistro'],
  cafe:             ['cafe', 'coffee', 'café', 'coffeehouse', 'bistro', 'restaurant'],
  burger:           ['burger', 'fast food', 'grill', 'restaurant', 'takeaway'],
  chicken:          ['chicken', 'fast food', 'grill', 'poultry', 'restaurant', 'takeaway'],
  'fast food':      ['fast food', 'takeaway', 'burger', 'chicken', 'restaurant', 'quick service'],
  takeaway:         ['takeaway', 'fast food', 'food', 'restaurant', 'delivery'],
  grill:            ['grill', 'bbq', 'barbecue', 'restaurant', 'food', 'steakhouse'],
  bbq:              ['bbq', 'barbecue', 'grill', 'restaurant', 'food'],
  suya:             ['suya', 'grill', 'bbq', 'food', 'restaurant', 'street food', 'nyama choma'],
  'nyama choma':    ['nyama choma', 'grill', 'bbq', 'suya', 'food', 'restaurant'],
  'ice cream':      ['ice cream', 'gelato', 'frozen yogurt', 'dessert', 'sweets', 'cafe'],
  dessert:          ['dessert', 'ice cream', 'cake', 'sweets', 'bakery', 'cafe'],
  juice:            ['juice', 'smoothie', 'drinks', 'beverages', 'cafe', 'restaurant'],
  smoothie:         ['smoothie', 'juice', 'drinks', 'healthy food', 'cafe'],
  drinks:           ['drinks', 'beverages', 'bar', 'water', 'juice', 'cafe', 'restaurant'],
  water:            ['water', 'bottled water', 'drinking water', 'pure water', 'drinks'],
  bar:              ['bar', 'pub', 'nightclub', 'drinks', 'lounge', 'restaurant'],
  pub:              ['pub', 'bar', 'drinks', 'restaurant', 'lounge'],
  nightclub:        ['nightclub', 'club', 'bar', 'lounge', 'entertainment'],

  // ─── Medical / Health ─────────────────────────────────────────────────────
  doctor:           ['doctor', 'physician', 'clinic', 'medical', 'health', 'hospital', 'gp', 'general practitioner'],
  hospital:         ['hospital', 'clinic', 'medical center', 'health center', 'doctor'],
  clinic:           ['clinic', 'hospital', 'medical', 'doctor', 'health center'],
  dentist:          ['dentist', 'dental', 'teeth', 'oral health', 'dental clinic'],
  optician:         ['optician', 'optometrist', 'glasses', 'eye care', 'eyewear', 'vision'],
  physiotherapy:    ['physiotherapy', 'physiotherapist', 'rehab', 'rehabilitation', 'massage', 'therapy'],
  ambulance:        ['ambulance', 'emergency', 'medical', 'health', 'hospital'],
  laboratory:       ['laboratory', 'lab', 'medical lab', 'blood test', 'diagnostic', 'health'],
  lab:              ['lab', 'laboratory', 'medical lab', 'blood test', 'diagnostic'],
  'blood test':     ['blood test', 'laboratory', 'lab', 'diagnostic', 'health'],
  diagnostic:       ['diagnostic', 'laboratory', 'lab', 'health', 'medical'],
  maternity:        ['maternity', 'midwife', 'obstetrics', 'hospital', 'clinic', 'health'],
  pediatric:        ['pediatric', 'children hospital', 'clinic', 'health', 'kids health'],
  'mental health':  ['mental health', 'psychiatrist', 'psychologist', 'counseling', 'therapy', 'health'],
  counseling:       ['counseling', 'therapy', 'mental health', 'psychologist', 'health'],
  veterinary:       ['veterinary', 'vet', 'animal hospital', 'pet care', 'animal health'],
  vet:              ['vet', 'veterinary', 'animal hospital', 'pet care'],

  // ─── Education ────────────────────────────────────────────────────────────
  school:           ['school', 'academy', 'college', 'education', 'learning', 'primary', 'secondary'],
  university:       ['university', 'college', 'institute', 'higher education', 'campus'],
  college:          ['college', 'university', 'institute', 'academy', 'education'],
  tutoring:         ['tutoring', 'tutor', 'coaching', 'lessons', 'teaching', 'education'],
  nursery:          ['nursery', 'kindergarten', 'preschool', 'daycare', 'school', 'education'],
  kindergarten:     ['kindergarten', 'nursery', 'preschool', 'daycare', 'school', 'education'],
  daycare:          ['daycare', 'nursery', 'kindergarten', 'childcare', 'school'],
  vocational:       ['vocational', 'trade school', 'skills training', 'technical', 'education'],
  training:         ['training', 'skills', 'coaching', 'tutoring', 'education', 'courses'],
  courses:          ['courses', 'training', 'skills', 'education', 'classes', 'workshops'],
  library:          ['library', 'books', 'reading', 'education', 'study'],

  // ─── Finance ──────────────────────────────────────────────────────────────
  bank:             ['bank', 'financial', 'finance', 'savings', 'credit', 'banking'],
  insurance:        ['insurance', 'assurance', 'cover', 'insurer', 'underwriter'],
  microfinance:     ['microfinance', 'sacco', 'savings', 'credit union', 'cooperative'],
  sacco:            ['sacco', 'microfinance', 'credit union', 'savings', 'cooperative'],
  forex:            ['forex', 'currency exchange', 'money exchange', 'bureau de change', 'finance'],
  'money transfer': ['money transfer', 'remittance', 'western union', 'moneygram', 'mobile money', 'finance'],
  'mobile money':   ['mobile money', 'mpesa', 'mtn money', 'orange money', 'money transfer', 'finance'],
  mpesa:            ['mpesa', 'mobile money', 'money transfer', 'finance'],
  atm:              ['atm', 'bank', 'cash machine', 'finance'],
  'accounting':     ['accounting', 'accountant', 'audit', 'tax', 'bookkeeping', 'finance'],
  accountant:       ['accountant', 'accounting', 'audit', 'tax', 'bookkeeping', 'finance'],
  tax:              ['tax', 'accountant', 'accounting', 'finance'],
  investment:       ['investment', 'investors', 'finance', 'capital', 'funding'],

  // ─── Technology ───────────────────────────────────────────────────────────
  it:               ['it', 'technology', 'software', 'computer', 'tech', 'digital'],
  tech:             ['tech', 'technology', 'it', 'software', 'computer', 'digital'],
  software:         ['software', 'tech', 'it', 'developer', 'computer', 'app', 'development'],
  computer:         ['computer', 'it', 'tech', 'software', 'laptop', 'repair'],
  internet:         ['internet', 'wifi', 'isp', 'broadband', 'connectivity'],
  printing:         ['printing', 'print', 'photocopying', 'photocopy', 'graphic design'],
  design:           ['design', 'graphic design', 'creative', 'printing', 'branding'],
  'graphic design': ['graphic design', 'design', 'branding', 'creative', 'printing'],
  photography:      ['photography', 'photographer', 'photos', 'studio', 'events'],
  videography:      ['videography', 'videographer', 'video', 'filming', 'production'],
  studio:           ['studio', 'photography', 'recording', 'creative', 'production'],
  cctv:             ['cctv', 'security camera', 'surveillance', 'security system', 'security'],
  solar:            ['solar', 'solar panel', 'renewable energy', 'power', 'electricity'],
  generator:        ['generator', 'power', 'electricity', 'inverter', 'energy'],
  inverter:         ['inverter', 'generator', 'power', 'solar', 'electricity'],

  // ─── Construction & Trades ────────────────────────────────────────────────
  builder:          ['builder', 'construction', 'contractor', 'architect', 'building'],
  construction:     ['construction', 'builder', 'contractor', 'building', 'civil'],
  plumber:          ['plumber', 'plumbing', 'pipe', 'water', 'sanitation'],
  plumbing:         ['plumbing', 'plumber', 'pipe', 'water'],
  electrician:      ['electrician', 'electrical', 'electric', 'wiring', 'power'],
  electrical:       ['electrical', 'electrician', 'wiring', 'power', 'electric'],
  carpenter:        ['carpenter', 'carpentry', 'furniture', 'wood', 'joinery'],
  welding:          ['welding', 'welder', 'metalwork', 'fabrication', 'steel'],
  welder:           ['welder', 'welding', 'metalwork', 'fabrication'],
  painting:         ['painting', 'painter', 'decorator', 'interior', 'wall'],
  painter:          ['painter', 'painting', 'decorator', 'wall', 'interior'],
  tiling:           ['tiling', 'tiles', 'floor', 'bathroom', 'construction'],
  roofing:          ['roofing', 'roof', 'construction', 'builder', 'contractor'],
  renovation:       ['renovation', 'remodeling', 'refurbishment', 'construction', 'builder'],
  architect:        ['architect', 'architecture', 'design', 'construction', 'builder'],
  interior:         ['interior', 'interior design', 'decorator', 'renovation', 'furniture'],
  landscaping:      ['landscaping', 'garden', 'lawn', 'gardener', 'outdoor'],
  garden:           ['garden', 'landscaping', 'lawn', 'nursery', 'plants'],
  glazing:          ['glazing', 'glass', 'windows', 'doors', 'construction'],
  windows:          ['windows', 'doors', 'glazing', 'construction', 'renovation'],

  // ─── Beauty / Wellness ────────────────────────────────────────────────────
  salon:            ['salon', 'hair', 'beauty', 'barbershop', 'hairdresser', 'stylist', 'hairdressing'],
  barber:           ['barber', 'barbershop', 'hair', 'salon', 'haircut', 'shave'],
  barbershop:       ['barbershop', 'barber', 'hair', 'salon', 'haircut'],
  hairdresser:      ['hairdresser', 'salon', 'hair', 'stylist', 'hairdressing'],
  spa:              ['spa', 'massage', 'wellness', 'beauty', 'relaxation', 'therapy'],
  massage:          ['massage', 'spa', 'wellness', 'therapy', 'physiotherapy', 'relaxation'],
  nails:            ['nails', 'manicure', 'pedicure', 'nail salon', 'beauty', 'nail art'],
  manicure:         ['manicure', 'nails', 'pedicure', 'nail salon', 'beauty'],
  pedicure:         ['pedicure', 'nails', 'manicure', 'nail salon', 'beauty'],
  gym:              ['gym', 'fitness', 'exercise', 'sport', 'workout', 'health club'],
  fitness:          ['fitness', 'gym', 'exercise', 'workout', 'health'],
  yoga:             ['yoga', 'fitness', 'wellness', 'exercise', 'gym'],
  threading:        ['threading', 'eyebrows', 'beauty', 'salon'],
  lashes:           ['lashes', 'eyelashes', 'extensions', 'beauty', 'salon'],
  waxing:           ['waxing', 'beauty', 'salon', 'hair removal'],

  // ─── Hospitality & Travel ─────────────────────────────────────────────────
  hotel:            ['hotel', 'lodge', 'accommodation', 'hostel', 'guesthouse', 'resort', 'motel'],
  lodge:            ['lodge', 'hotel', 'accommodation', 'resort', 'guesthouse', 'camp'],
  accommodation:    ['accommodation', 'hotel', 'lodge', 'hostel', 'guesthouse', 'airbnb', 'rental'],
  hostel:           ['hostel', 'hotel', 'accommodation', 'guesthouse', 'backpacker'],
  resort:           ['resort', 'hotel', 'lodge', 'spa', 'accommodation'],
  guesthouse:       ['guesthouse', 'guest house', 'hotel', 'accommodation', 'lodge', 'bed and breakfast'],
  'guest house':    ['guest house', 'guesthouse', 'hotel', 'accommodation', 'lodge'],
  airbnb:           ['airbnb', 'accommodation', 'rental', 'guesthouse', 'hotel'],
  camping:          ['camping', 'campsite', 'lodge', 'accommodation', 'outdoor'],
  tour:             ['tour', 'tourism', 'travel', 'sightseeing', 'safari', 'excursion'],
  safari:           ['safari', 'tour', 'wildlife', 'game drive', 'travel', 'tourism'],
  travel:           ['travel', 'tour', 'tourism', 'agency', 'flights', 'booking'],
  'travel agency':  ['travel agency', 'tour operator', 'travel', 'booking', 'flights'],
  visa:             ['visa', 'travel', 'passport', 'immigration', 'legal'],

  // ─── Legal ────────────────────────────────────────────────────────────────
  lawyer:           ['lawyer', 'attorney', 'advocate', 'solicitor', 'legal', 'law firm'],
  advocate:         ['advocate', 'lawyer', 'attorney', 'solicitor', 'legal'],
  legal:            ['legal', 'lawyer', 'attorney', 'advocate', 'law'],
  notary:           ['notary', 'notarial', 'legal', 'documentation'],
  'law firm':       ['law firm', 'lawyer', 'legal', 'advocate', 'attorney'],

  // ─── Transport & Logistics ────────────────────────────────────────────────
  taxi:             ['taxi', 'transport', 'cab', 'ride', 'driver', 'boda', 'okada', 'matatu', 'tuk tuk'],
  transport:        ['transport', 'logistics', 'delivery', 'courier', 'shipping', 'freight'],
  courier:          ['courier', 'delivery', 'logistics', 'shipping', 'transport', 'dispatch'],
  logistics:        ['logistics', 'transport', 'shipping', 'freight', 'courier', 'warehousing'],
  boda:             ['boda', 'boda boda', 'motorbike', 'okada', 'taxi'],
  okada:            ['okada', 'boda', 'motorbike', 'taxi'],
  matatu:           ['matatu', 'bus', 'taxi', 'transport', 'kombi'],
  bus:              ['bus', 'transport', 'matatu', 'coach', 'kombi'],
  moving:           ['moving', 'relocation', 'removal', 'movers', 'transport', 'logistics'],
  movers:           ['movers', 'moving', 'relocation', 'removal', 'transport'],
  warehouse:        ['warehouse', 'storage', 'logistics', 'warehousing', 'transport'],

  // ─── Security ─────────────────────────────────────────────────────────────
  security:         ['security', 'guard', 'protection', 'surveillance', 'guarding', 'cctv'],
  guard:            ['guard', 'security', 'protection', 'watchman', 'guarding'],

  // ─── Real Estate / Property ───────────────────────────────────────────────
  estate:           ['estate', 'real estate', 'property', 'housing', 'land', 'letting'],
  property:         ['property', 'real estate', 'estate', 'housing', 'land'],
  'real estate':    ['real estate', 'estate', 'property', 'housing', 'land'],
  rent:             ['rent', 'rental', 'lease', 'apartment', 'property', 'real estate'],
  apartment:        ['apartment', 'flat', 'rental', 'accommodation', 'property'],
  flat:             ['flat', 'apartment', 'rental', 'accommodation', 'property'],
  'land for sale':  ['land for sale', 'property', 'real estate', 'land', 'estate'],
  mortgage:         ['mortgage', 'property', 'real estate', 'finance', 'housing loan'],

  // ─── Agriculture ──────────────────────────────────────────────────────────
  farm:             ['farm', 'agriculture', 'farming', 'agro', 'crop', 'livestock'],
  agriculture:      ['agriculture', 'farm', 'farming', 'agro', 'crop'],
  livestock:        ['livestock', 'cattle', 'poultry', 'farm', 'agriculture'],
  seeds:            ['seeds', 'seedlings', 'farm', 'agriculture', 'agro input'],
  fertilizer:       ['fertilizer', 'agro input', 'farm', 'agriculture'],
  irrigation:       ['irrigation', 'water', 'farm', 'agriculture'],
  fishing:          ['fishing', 'fish', 'seafood', 'aquaculture', 'food'],
  fish:             ['fish', 'seafood', 'fishing', 'food', 'restaurant'],

  // ─── Cleaning ─────────────────────────────────────────────────────────────
  cleaning:         ['cleaning', 'cleaner', 'laundry', 'dry cleaning', 'housekeeping', 'maid'],
  laundry:          ['laundry', 'dry cleaning', 'cleaning', 'wash', 'ironing'],
  housekeeping:     ['housekeeping', 'cleaning', 'maid', 'domestic', 'home services'],
  maid:             ['maid', 'housekeeping', 'cleaning', 'domestic', 'home services'],
  pest:             ['pest control', 'fumigation', 'exterminator', 'insects', 'cleaning'],
  fumigation:       ['fumigation', 'pest control', 'exterminator', 'cleaning'],

  // ─── Telecom & Media ──────────────────────────────────────────────────────
  telecom:          ['telecom', 'mobile', 'airtime', 'mtn', 'airtel', 'safaricom', 'vodacom', 'glo'],
  mobile:           ['mobile', 'phone', 'smartphone', 'repair', 'accessories', 'telecom'],
  airtime:          ['airtime', 'mobile', 'telecom', 'credit', 'data'],
  media:            ['media', 'radio', 'tv', 'television', 'news', 'broadcasting', 'journalism'],
  radio:            ['radio', 'media', 'broadcasting', 'fm', 'station'],
  tv:               ['tv', 'television', 'media', 'broadcasting', 'cable', 'satellite'],
  printing2:        ['printing', 'press', 'media', 'newspaper', 'publishing'],

  // ─── Events & Entertainment ───────────────────────────────────────────────
  events:           ['events', 'event planning', 'party', 'wedding', 'conference', 'entertainment'],
  'event planning': ['event planning', 'events', 'party planner', 'wedding planner'],
  wedding:          ['wedding', 'events', 'wedding planning', 'bride', 'groom', 'reception'],
  catering2:        ['catering', 'food', 'events', 'party'],
  dj:               ['dj', 'music', 'events', 'entertainment', 'party'],
  music:            ['music', 'band', 'dj', 'events', 'entertainment'],
  entertainment:    ['entertainment', 'events', 'music', 'theatre', 'cinema'],
  cinema:           ['cinema', 'movies', 'film', 'entertainment'],
  decoration:       ['decoration', 'decor', 'events', 'wedding', 'interior'],
  sound:            ['sound', 'sound system', 'audio', 'music', 'events', 'dj'],
  'bouncy castle':  ['bouncy castle', 'inflatables', 'kids entertainment', 'events'],

  // ─── Church / NGO ─────────────────────────────────────────────────────────
  church:           ['church', 'chapel', 'cathedral', 'worship', 'religion', 'christian'],
  mosque:           ['mosque', 'masjid', 'worship', 'religion', 'muslim', 'islamic'],
  ngo:              ['ngo', 'nonprofit', 'non profit', 'charity', 'organisation', 'foundation'],
  charity:          ['charity', 'ngo', 'nonprofit', 'foundation', 'organization'],
  community:        ['community', 'social', 'ngo', 'organization', 'local'],
};

// ── Category inference (must match actual DB category column values) ─────────
// DB values: restaurant, health, education, retail, finance, transport,
//            hotel, tech, construction, agriculture, legal, beauty,
//            auto, church, ngo, government, other
const CATEGORY_HINTS: [string[], string][] = [
  // Automotive — keywords that strongly imply garages / auto shops
  [['mechanic', 'garagist', 'garage', 'auto repair', 'car repair', 'car wash', 'tyre', 'tire',
    'starter', 'start motor', 'alternator', 'car alarm', 'auto parts', 'car parts', 'spare parts',
    'spares', 'radiator', 'suspension', 'exhaust', 'brakes', 'panel beater', 'auto body',
    'windscreen', 'detailing', 'carwash', 'driving school', 'motor repair', 'workshop'], 'auto'],

  // Restaurant / Food
  [['restaurant', 'food', 'eatery', 'cafe', 'café', 'catering', 'pizza', 'diner', 'takeaway',
    'bistro', 'bakery', 'bakeries', 'cake', 'pastry', 'bread', 'burger', 'chicken', 'fast food',
    'grill', 'bbq', 'suya', 'nyama choma', 'bar', 'pub', 'juice', 'smoothie'], 'restaurant'],

  // Health
  [['doctor', 'hospital', 'clinic', 'medical', 'health center', 'pharmacy', 'chemist',
    'dentist', 'optician', 'physiotherapy', 'laboratory', 'lab', 'diagnostic', 'maternity',
    'ambulance', 'blood test', 'mental health', 'pediatric', 'veterinary', 'vet'], 'health'],

  // Beauty — checked before Education so 'gym/fitness' don't fire education
  [['salon', 'barber', 'barbershop', 'hairdresser', 'spa', 'massage', 'nails', 'manicure',
    'pedicure', 'beauty', 'gym', 'fitness', 'yoga', 'threading', 'lashes', 'waxing'], 'beauty'],

  // Retail / Shopping / Fashion
  [['shoes', 'footwear', 'boots', 'sneakers', 'clothing', 'clothes', 'fashion', 'boutique',
    'apparel', 'dress', 'jeans', 'shirt', 'tailor', 'fabric', 'ankara', 'wax print',
    'accessories', 'bag', 'bags', 'jewelry', 'jewellery', 'watch', 'sunglasses',
    'supermarket', 'grocery', 'market', 'electronics', 'appliances', 'furniture',
    'cosmetics', 'makeup', 'skincare', 'perfume', 'secondhand', 'thrift', 'hardware',
    'wigs', 'extensions', 'hair products', 'gifts', 'flowers', 'toys', 'baby', 'stationery',
    'phone', 'smartphone', 'laptop', 'tablet'], 'retail'],

  // Education
  [['school', 'academy', 'college', 'university', 'tutoring', 'nursery', 'kindergarten',
    'daycare', 'vocational', 'training', 'courses', 'library', 'education'], 'education'],

  // Finance
  [['bank', 'microfinance', 'sacco', 'insurance', 'finance', 'forex', 'money transfer',
    'mobile money', 'mpesa', 'accounting', 'accountant', 'tax', 'investment', 'atm'], 'finance'],

  // Hotel / Accommodation
  [['hotel', 'lodge', 'accommodation', 'hostel', 'guesthouse', 'guest house', 'resort',
    'airbnb', 'camping', 'motel'], 'hotel'],

  // Legal
  [['lawyer', 'advocate', 'legal', 'notary', 'law firm', 'attorney'], 'legal'],

  // Transport
  [['taxi', 'transport', 'logistics', 'courier', 'boda', 'okada', 'matatu', 'bus',
    'moving', 'movers', 'warehouse', 'delivery'], 'transport'],

  // Technology
  [['it', 'tech', 'software', 'computer', 'internet', 'printing', 'design',
    'graphic design', 'photography', 'videography', 'cctv', 'solar', 'generator',
    'phone repair', 'laptop repair', 'computer repair', 'screen repair', 'gadget repair'], 'tech'],

  // Construction
  [['builder', 'construction', 'contractor', 'plumber', 'electrician', 'carpenter',
    'welding', 'welder', 'painting', 'tiling', 'roofing', 'renovation', 'architect',
    'glazing', 'landscaping', 'interior'], 'construction'],

  // Agriculture
  [['farm', 'agriculture', 'farming', 'livestock', 'seeds', 'fertilizer', 'irrigation',
    'fishing', 'fish'], 'agriculture'],

  // Church
  [['church', 'chapel', 'cathedral', 'mosque', 'masjid', 'worship'], 'church'],

  // NGO
  [['ngo', 'nonprofit', 'non profit', 'charity', 'foundation', 'community'], 'ngo'],
];

// ── Main export ───────────────────────────────────────────────────────────────
export function expandQuery(raw: string): { terms: string[]; categoryHint: string | null } {
  const q = raw.toLowerCase().trim();
  const words = q.split(/\s+/);

  // Build term set starting with the original query itself
  const termSet = new Set<string>([q]);

  // 1. Exact-key synonym lookup for the full phrase
  const exactMatch = SYNONYMS[q];
  if (exactMatch) exactMatch.forEach(t => termSet.add(t));

  // 2. For each individual word, look up synonyms
  for (const word of words) {
    const synList = SYNONYMS[word];
    if (synList) synList.forEach(t => termSet.add(t));
  }

  // 3. Also do a prefix scan so "gara" catches "garage" / "garagist"
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (key.startsWith(q) || q.startsWith(key)) {
      syns.forEach(t => termSet.add(t));
    }
  }

  // 4. Infer category hint from expanded terms
  //    Use exact-token matching — loose substring matching causes false positives
  //    (e.g. 'workshop' ⊃ 'shop' would wrongly fire the auto hint for 'boutique')
  let categoryHint: string | null = null;
  const allTerms = Array.from(termSet);
  const termTokens = new Set(allTerms.flatMap(t => t.split(/\s+/)));
  outer: for (const [keywords, cat] of CATEGORY_HINTS) {
    for (const kw of keywords) {
      // Match if the exact keyword (or its first word) appears in our expanded terms
      if (allTerms.includes(kw) || termTokens.has(kw)) {
        categoryHint = cat;
        break outer;
      }
    }
  }

  return { terms: allTerms, categoryHint };
}
