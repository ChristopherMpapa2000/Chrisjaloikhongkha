export const LOCATIONS = {
  'wat-arun': {
    id: 'wat-arun',
    shortName: 'วัดอรุณฯ',
    fullName: 'แม่น้ำเจ้าพระยา · วัดอรุณราชวราราม',
    province: 'กรุงเทพมหานคร',
    subtitle: 'แสงประทีปสะท้อนพระปรางค์ริมฝั่งเจ้าพระยา',
    skyStops: ['#050818', '#0d1738', '#1d264d', '#3e2d3f'],
    waterStops: ['#1e1b33', '#0e1733', '#060c1f'],
    horizonGlow: 'rgba(246, 186, 98, 0.34)',
    moonX: 0.78,
    moonY: 0.17,
    lanternDensity: 7,
    riverSpeed: 1.0,
  },
  'chiang-mai': {
    id: 'chiang-mai',
    shortName: 'ยี่เป็งเชียงใหม่',
    fullName: 'คูเมืองเชียงใหม่ · ประเพณียี่เป็ง',
    province: 'เชียงใหม่',
    subtitle: 'โคมยี่เป็งนับร้อยลอยสว่างเหนือประตูท่าแพ',
    skyStops: ['#0b0718', '#1d122d', '#3a1f31', '#653526'],
    waterStops: ['#2f1b2b', '#19132b', '#0b091a'],
    horizonGlow: 'rgba(255, 166, 76, 0.42)',
    moonX: 0.22,
    moonY: 0.16,
    lanternDensity: 20,
    riverSpeed: 0.82,
  },
  sukhothai: {
    id: 'sukhothai',
    shortName: 'สุโขทัย',
    fullName: 'อุทยานประวัติศาสตร์สุโขทัย · เผาเทียนเล่นไฟ',
    province: 'สุโขทัย',
    subtitle: 'ตระพังน้ำใสสะท้อนเงาเจดีย์ทรงพุ่มข้าวบิณฑ์',
    skyStops: ['#040d18', '#0a1f30', '#143347', '#2b4752'],
    waterStops: ['#163040', '#0b1e2e', '#050e19'],
    horizonGlow: 'rgba(245, 211, 134, 0.3)',
    moonX: 0.72,
    moonY: 0.16,
    lanternDensity: 9,
    riverSpeed: 0.68,
  },
  'khlong-ong-ang': {
    id: 'khlong-ong-ang',
    shortName: 'คลองโอ่งอ่าง',
    fullName: 'คลองโอ่งอ่าง · ถนนคนเดินคืนวันเพ็ญ',
    province: 'กรุงเทพมหานคร',
    subtitle: 'ไฟประดับอบอุ่นพาดผ่านสายคลองใจกลางพระนคร',
    skyStops: ['#070a1d', '#15183b', '#2b2049', '#522947'],
    waterStops: ['#2a1a3d', '#151536', '#090b21'],
    horizonGlow: 'rgba(242, 132, 130, 0.36)',
    moonX: 0.5,
    moonY: 0.15,
    lanternDensity: 8,
    riverSpeed: 0.92,
  },
};

export const LOCATION_ORDER = ['wat-arun', 'chiang-mai', 'sukhothai', 'khlong-ong-ang'];

export const KRATHONG_PARTS = {
  base: [
    {
      id: 'banana-leaf',
      name: 'ใบตองกลีบผกา',
      desc: 'ใบตองพับจีบประณีตแบบไทยแท้',
      icon: '🌿',
      swatchBg: 'linear-gradient(135deg, #2d6a4f, #52b788)',
    },
    {
      id: 'lotus',
      name: 'ดอกบัวหลวง',
      desc: 'กลีบบัวชมพูขาวซ้อนชั้นละมุน',
      icon: '🌸',
      swatchBg: 'linear-gradient(135deg, #d87093, #f8c8dc)',
    },
    {
      id: 'coconut',
      name: 'กะลามะพร้าวแกะลาย',
      desc: 'กะลาธรรมชาติขัดเงา ขอบลายไทย',
      icon: '🥥',
      swatchBg: 'linear-gradient(135deg, #5c3a21, #9c6644)',
    },
    {
      id: 'bread',
      name: 'ขนมปังรักษ์โลก',
      desc: 'กระทงขนมปังโทนอุ่น เป็นมิตรต่อปลา',
      icon: '🥐',
      swatchBg: 'linear-gradient(135deg, #b87333, #e6b873)',
    },
    {
      id: 'royal-gold',
      name: 'กระทงทองสุโขทัย',
      desc: 'กระทงสีทองร่วมสมัยหรูหราสง่างาม',
      icon: '👑',
      swatchBg: 'linear-gradient(135deg, #b68322, #f7d68a)',
    },
  ],
  flower: [
    {
      id: 'marigold',
      name: 'ดาวเรืองทอง',
      desc: 'เสริมความรุ่งเรือง มั่งคั่งสดใส',
      icon: '🌼',
      swatchBg: 'linear-gradient(135deg, #e07a00, #ffd166)',
    },
    {
      id: 'orchid',
      name: 'กล้วยไม้ม่วง',
      desc: 'งดงามอ่อนช้อย สไตล์ไทยร่วมสมัย',
      icon: '🌺',
      swatchBg: 'linear-gradient(135deg, #6d28d9, #d8b4fe)',
    },
    {
      id: 'pink-lotus',
      name: 'กลีบบัวชมพู',
      desc: 'สงบเย็น ร่มเย็นเป็นสุข',
      icon: '🌸',
      swatchBg: 'linear-gradient(135deg, #db6b8a, #fbcfe8)',
    },
    {
      id: 'jasmine',
      name: 'มะลิหอมบริสุทธิ์',
      desc: 'สีขาวละมุน สื่อถึงความกตัญญู',
      icon: '🤍',
      swatchBg: 'linear-gradient(135deg, #94a3b8, #f8fafc)',
    },
    {
      id: 'rose',
      name: 'กุหลาบแดง-ทอง',
      desc: 'เติมเต็มความรักและเสน่หา',
      icon: '🌹',
      swatchBg: 'linear-gradient(135deg, #9f1239, #fb7185)',
    },
  ],
  candle: [
    {
      id: 'classic-gold',
      name: 'เทียนขี้ผึ้ง + ธูป ๓ ดอก',
      desc: 'สว่างไสวพร้อมควันธูปบางเบา',
      icon: '🕯️',
      swatchBg: 'linear-gradient(135deg, #c27803, #fde68a)',
    },
    {
      id: 'lotus-candle',
      name: 'เทียนดอกบัวสีชมพู',
      desc: 'เทียนปั้นทรงบัว แสงนุ่มอบอุ่น',
      icon: '🌷',
      swatchBg: 'linear-gradient(135deg, #be185d, #f9a8d4)',
    },
    {
      id: 'twin-candle',
      name: 'เทียนคู่แห่งรัก',
      desc: 'เปลวเทียนคู่เคียงข้างกัน',
      icon: '💞',
      swatchBg: 'linear-gradient(135deg, #ea580c, #fdba74)',
    },
    {
      id: 'lantern-mini',
      name: 'โคมเทียนแก้วร่วมสมัย',
      desc: 'โคมแก้วเรืองแสงสไตล์โมเดิร์น',
      icon: '🏮',
      swatchBg: 'linear-gradient(135deg, #92400e, #fcd34d)',
    },
  ],
  ornament: [
    {
      id: 'coins',
      name: 'เหรียญมงคล ๙ เหรียญ',
      desc: 'เรียกทรัพย์ โชคลาภไหลมาเทมา',
      icon: '💰',
      swatchBg: 'linear-gradient(135deg, #a16207, #facc15)',
    },
    {
      id: 'gold-leaf',
      name: 'ใบเงินใบทอง',
      desc: 'เสริมสิริมงคลและความเจริญก้าวหน้า',
      icon: '✨',
      swatchBg: 'linear-gradient(135deg, #64748b, #f6d365)',
    },
    {
      id: 'swan',
      name: 'หงส์ใบตอง',
      desc: 'งานประดิษฐ์ใบตองรูปหงส์อ่อนช้อย',
      icon: '🦢',
      swatchBg: 'linear-gradient(135deg, #15803d, #bbf7d0)',
    },
    {
      id: 'garland',
      name: 'พวงมาลัยจิ๋ว',
      desc: 'มาลัยข้อพระกรประดับริบบิ้นทอง',
      icon: '🎀',
      swatchBg: 'linear-gradient(135deg, #be123c, #fda4af)',
    },
    {
      id: 'butterfly',
      name: 'หิ่งห้อย & ผีเสื้อแสงทอง',
      desc: 'ละอองแสงหิ่งห้อยบินวนรอบเปลวเทียน',
      icon: '🦋',
      swatchBg: 'linear-gradient(135deg, #0369a1, #fde047)',
    },
  ],
};

export const CURATED_WISHES = {
  khongkha: [
    'ขอขมาพระแม่คงคาที่ลูกได้ล่วงเกินทั้งกาย วาจา ใจ ขอให้ความทุกข์โศกและสิ่งไม่ดีลอยไปกับสายน้ำ',
    'ขอน้อมบูชาพระแม่คงคาในคืนเพ็ญเดือน ๑๒ ขอให้สายน้ำไทยอุดมสมบูรณ์ และชีวิตลูกสงบเย็นเป็นสุข',
    'ปล่อยความกังวลและเรื่องเหนื่อยล้าลอยไปตามสายน้ำ เปิดรับแสงสว่างและสิ่งดีงามเข้ามาในชีวิต',
  ],
  career: [
    'ขอให้การงานราบรื่นก้าวหน้า ไอเดียบรรเจิด มีผู้ใหญ่เมตตา และเงินทองไหลมาเทมาไม่ขาดสาย',
    'ขอให้ทุกความตั้งใจและโปรเจกต์ที่ลงมือทำประสบความสำเร็จงดงาม มั่งคั่งมั่นคงตลอดปี',
    'ขอให้ปีหน้าเป็นปีแห่งโอกาสดีๆ งานปัง เงินปัง พบเจอเพื่อนร่วมงานและกัลยาณมิตรที่น่ารัก',
  ],
  love: [
    'ขอให้ความรักของเรามั่นคงอบอุ่น เข้าใจกันในทุกวัน และจับมือกันไปทุกเทศกาลลอยกระทง',
    'ขอให้คืนวันเพ็ญนำพาคนดีๆ ที่จริงใจและเข้าใจเราเข้ามาเติมเต็มรอยยิ้มในชีวิต',
    'ขอให้คนที่เรารักและคิดถึงมีความสุข สบายใจ และมีแต่เรื่องดีๆ เกิดขึ้นในทุกวัน',
  ],
  health: [
    'ขอให้คุณพ่อคุณแม่และคนในครอบครัวสุขภาพแข็งแรง ปราศจากโรคภัยไข้เจ็บ อยู่เป็นร่มโพธิ์ร่มไทรนานๆ',
    'ขอให้กายใจแข็งแรง หลับสบาย ไม่เจ็บไม่ไข้ มีพลังบวกและรอยยิ้มสดใสในทุกเช้า',
    'ขอให้ครอบครัวอบอุ่น ร่มเย็นเป็นสุข เดินทางไปไหนแคล้วคลาดปลอดภัยตลอดปี',
  ],
};

export const REACTIONS = {
  sathu: { label: 'สาธุ', emoji: '🙏' },
  wish: { label: 'สมหวังนะ', emoji: '✨' },
  health: { label: 'แข็งแรง', emoji: '🌿' },
  love: { label: 'ส่งใจ', emoji: '💛' },
};

export function findPart(category, id) {
  const list = KRATHONG_PARTS[category] || [];
  return list.find((p) => p.id === id) || list[0];
}

export function formatRelativeThaiTime(isoString) {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (diffSec < 30) return 'เมื่อสักครู่';
  if (diffSec < 60) return `${diffSec} วินาทีที่แล้ว`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} วันที่แล้ว`;
}
