/**
 * คลังเซียมซีคืนวันเพ็ญ (16 คำทำนายร่วมสมัย) + ตัวสร้างภาพใบเซียมซี PNG (1080x1350)
 */

const THAI_NUMS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
export function toThaiDigits(num) {
  return String(num).replace(/\d/g, (d) => THAI_NUMS[Number(d)]);
}

export const FORTUNES = [
  {
    no: 1,
    grade: '🌟 ดวงเฮงระดับตำนาน',
    title: 'จันทร์เพ็ญส่องทรัพย์ ไหลมาไม่ขาดสาย',
    verse:
      'คืนเพ็ญนี้ดวงชะตาเปิดกว้างดั่งสายน้ำเจ้าพระยา สิ่งที่ลงแรงไว้กำลังผลิดอกออกผล งานใหญ่ที่รอคอยจะมีข่าวดีเข้ามาแบบไม่ทันตั้งตัว',
    career: 'พุ่งทะยาน ผู้ใหญ่เอ็นดู มีเกณฑ์ได้โบนัสหรือโอกาสใหม่',
    love: 'คนโสดมีคนแอบปลื้ม คนมีคู่เข้าใจกันอบอุ่นยิ่งขึ้น',
    luckyColor: 'ทองอำพัน · น้ำเงินคราม',
    luckyNum: '๑๙ · ๘๘',
    tip: 'ถ้าชูตกระทงลงห่วงก็อตซิลล่าในนัดเดียว โชคลาภคืนนี้จะทวีคูณ!',
  },
  {
    no: 2,
    grade: '💖 ดวงความรักเปล่งประกาย',
    title: 'กลีบบัวเคียงคู่ วาสนาพามาพบกัน',
    verse:
      'สายลมอ่อนคืนวันเพ็ญจะพัดพาคนจริงใจเข้ามาใกล้ตัว หากกำลังแอบชอบใคร ลองส่งการ์ดกระทงไปทักทาย มีสิทธิ์ใจตรงกันสูงมาก!',
    career: 'งานทีมเวิร์กราบรื่น เพื่อนร่วมงานคอยช่วยเหลือดี',
    love: 'หวานฉ่ำเกินต้าน คนคุยชัดเจน คนโสดเจอคนถูกใจจากเรื่องบังเอิญ',
    luckyColor: 'ชมพูกลีบบัว · ขาวมุก',
    luckyNum: '๒๔ · ๖๖',
    tip: 'ลองเปิดโหมด “ลอยกระทงคู่” คืนนี้แล้วส่งลิงก์ให้คนนั้นดูสิ!',
  },
  {
    no: 3,
    grade: '✨ ดวงกำลังขาขึ้น',
    title: 'แสงเทียนนำทาง พ้นเรื่องวุ่นวายใจ',
    verse:
      'ความเหนื่อยล้าและเรื่องจุกจิกตลอดปีกำลังลอยหายไปพร้อมสายน้ำ หลังจากคืนนี้สมองจะโล่ง ไอเดียใหม่ๆ จะแล่นฉิวเหมือนติดเทอร์โบ',
    career: 'ปลดล็อกปัญหาค้างคา มีโปรเจกต์สนุกๆ ให้ได้โชว์ฝีมือ',
    love: 'สบายใจ ไม่กดดัน ยิ่งเป็นตัวของตัวเองยิ่งมีเสน่ห์',
    luckyColor: 'เขียวมรกต · เหลืองนวล',
    luckyNum: '๐๗ · ๓๕',
    tip: 'ลองชาร์จปืนใหญ่พลุปลุกพญานาคแสงทอง 1 ครั้งเพื่อรับพลังมรกต!',
  },
  {
    no: 4,
    grade: '💰 ดวงการเงินโดดเด่น',
    title: 'เหรียญมงคลเรียกทรัพย์ กระเป๋าตุงรับสิ้นปี',
    verse:
      'ดวงโชคลาภและการเงินกำลังยิ้มให้คุณ เงินที่เคยค้างหรือรอคอยมีเกณฑ์ได้คืน แถมมีโอกาสได้รายได้เสริมจากความถนัดของตัวเอง',
    career: 'เจรจาค้าขายปิดดีลสวย ลูกค้าเอ็นดูและบอกต่อ',
    love: 'สายเปย์ดูแลกันดี ชวนกันไปหาของอร่อยกินแล้วแฮปปี้สุดๆ',
    luckyColor: 'เหลืองดาวเรือง · น้ำตาลคาราเมล',
    luckyNum: '๔๕ · ๙๐',
    tip: 'ระวังเด็กว่ายน้ำแอบมาขอเหรียญ 10 จากกระทงของคุณนะ!',
  },
  {
    no: 5,
    grade: '🌟 ดวงเฮงระดับตำนาน',
    title: 'พญานาคประทานพร สมหวังเกินคาดหมาย',
    verse:
      'คำอธิษฐานที่คุณตั้งใจไว้มีพลังมากเป็นพิเศษในคืนนี้ จังหวะชีวิตกำลังเข้าล็อกเหมือนชูตบาสลงห่วงแบบ SWISH ไม่ต้องลุ้น!',
    career: 'ก้าวกระโดดเกินเป้าหมาย มีคนชวนร่วมงานดีๆ ที่น่าจับตา',
    love: 'มั่นคงและให้เกียรติกัน เป็นคู่คิดคู่ใจที่พาชีวิตดีขึ้นทั้งคู่',
    luckyColor: 'เขียวหยก · ทองคำ',
    luckyNum: '๕๙ · ๙๙',
    tip: 'ส่งคำอวยพร “สาธุ” ให้กระทงของคนอื่น 3 ใบ เพื่อต่อยอดบุญคืนวันเพ็ญ',
  },
  {
    no: 6,
    grade: '😄 ดวงสายฮาแต่พาปัง',
    title: 'โคมลอยอาจหล่น แต่ดวงคุณไม่หล่นแน่นอน!',
    verse:
      'ช่วงนี้อาจมีเรื่องเซอร์ไพรส์ปนความวุ่นวายเล็กๆ เหมือนโคมตกใส่ริมฝั่ง แต่จะมี “รถดับเพลิง” หรือคนใจดีโผล่มาช่วยคลี่คลายทันเวลาเสมอ',
    career: 'แก้ปัญหาเฉพาะหน้าเก่งจนคนรอบข้างปรบมือให้',
    love: 'หัวเราะด้วยกันบ่อยขึ้น เสน่ห์ของคุณอยู่ที่อารมณ์ขันนี่แหละ!',
    luckyColor: 'แดงเพลิง · ฟ้าสดใส',
    luckyNum: '๑๖ · ๖๑',
    tip: 'อย่าลืมกดปุ่ม “ปล่อยโคม” เรียกรถดับเพลิงมาซ้อมรับมือความปัง!',
  },
  {
    no: 7,
    grade: '🌿 ดวงสงบเย็นเป็นสุข',
    title: 'น้ำใสใจเย็น สุขภาพแข็งแรงไร้กังวล',
    verse:
      'สิ่งที่ล้ำค่าที่สุดในช่วงนี้คือความสบายใจและสุขภาพที่แข็งแรง การพักผ่อนให้เพียงพอและอยู่ใกล้คนที่รักจะชาร์จพลังให้คุณเต็มร้อย',
    career: 'ทำงานได้สมดุล ไม่ต้องหักโหมจนดึก แต่ผลงานออกมาดีเยี่ยม',
    love: 'อบอุ่น เรียบง่าย สบายใจเหมือนนั่งชมพระจันทร์ริมแม่น้ำ',
    luckyColor: 'ฟ้าอ่อน · เขียวใบตอง',
    luckyNum: '๑๒ · ๗๗',
    tip: 'เปิดเสียงดนตรีไทยร่วมสมัยและโหมด Zen ชมสายน้ำสัก 1 นาที จะผ่อนคลายมาก',
  },
  {
    no: 8,
    grade: '🚀 ดวงสายลุยมีเซอร์ไพรส์',
    title: 'ยานแม่ส่งสัญญาณ โอกาสใหม่จากแดนไกล',
    verse:
      'เตรียมรับข่าวดีจากทางไกลหรือวงการใหม่ๆ ที่ไม่เคยคาดคิด เหมือนจานบิน UFO แวะมาทักทายคืนวันเพ็ญ ลองเปิดใจรับสิ่งใหม่แล้วจะรุ่ง!',
    career: 'เหมาะกับการเริ่มต้นโปรเจกต์ใหม่ เรียนรู้ทักษะใหม่ หรือเดินทาง',
    love: 'มีเกณฑ์ได้รู้จักคนต่างสายงานหรือต่างถิ่นที่คุยถูกคออย่างเหลือเชื่อ',
    luckyColor: 'ม่วงอวกาศ · ฟ้าไซแอน',
    luckyNum: '๐๘ · ๘๒',
    tip: 'ลองกด “จุดพลุ” ยิงทักทายเอเลี่ยนบนฟ้าดู คืนนี้อาจได้โชคจากจักรวาล!',
  },
  {
    no: 9,
    grade: '✨ ดวงกำลังขาขึ้น',
    title: 'กัลยาณมิตรหนุนนำ คำพูดเป็นเงินเป็นทอง',
    verse:
      'คำพูดและรอยยิ้มของคุณในช่วงนี้มีเสน่ห์ดึงดูดใจเป็นพิเศษ จะพูดคุยเสนอไอเดีย หรือเจรจาเรื่องสำคัญก็ผ่านฉลุยได้ง่ายดาย',
    career: 'พรีเซนต์งานผ่านฉลุย มีเพื่อนดีคอยซัพพอร์ตทุกด้าน',
    love: 'คำหวานนิดหน่อยช่วยเติมความสดใสให้หัวใจพองโตทั้งวัน',
    luckyColor: 'ส้มทอง · ครีมงาช้าง',
    luckyNum: '๐๙ · ๙๓',
    tip: 'เขียนคำอธิษฐานให้กำลังใจตัวเองลงในกระทงแล้วเก็บการ์ด E-Card ไว้ดูนะ',
  },
  {
    no: 10,
    grade: '💖 ดวงความรักเปล่งประกาย',
    title: 'เทียนคู่สว่างไสว ใจสองดวงเชื่อมถึงกัน',
    verse:
      'ความสัมพันธ์ที่เคยคลุมเครือจะเริ่มชัดเจนขึ้นในทางที่ดี ส่วนคนมีคู่จะมีโมเมนต์น่ารักๆ หรือทริปเล็กๆ ที่ทำให้ยิ้มไม่หุบ',
    career: 'มีคนช่วยแบ่งเบาภาระ ทำให้งานเสร็จไวกว่ากำหนด',
    love: 'โรแมนติกมาก! เหมาะกับการบอกความในใจหรือขอบคุณคนข้างกาย',
    luckyColor: 'โรสโกลด์ · แดงกุหลาบ',
    luckyNum: '๑๐ · ๒๒',
    tip: 'ตกแต่งกระทงด้วย “เทียนคู่แห่งรัก” และดอกกุหลาบจะช่วยเสริมดวงรักสุดๆ',
  },
  {
    no: 11,
    grade: '💰 ดวงการเงินโดดเด่น',
    title: 'ปลาตอดขนมปัง โชคเล็กๆ แต่มาถี่ไม่หยุด',
    verse:
      'อาจไม่ใช่แจ็กพอตก้อนเดียว แต่จะมีลาภลอยเล็กๆ น้อยๆ ของฝาก ของลดราคา หรือโอกาสดีๆ ตอดเข้ามาไม่ขาดสายจนยิ้มแก้มปริ',
    career: 'งานย่อยๆ ที่ตั้งใจทำจะกลายเป็นพอร์ตชิ้นโบแดงในอนาคต',
    love: 'ค่อยๆ พัฒนาความสัมพันธ์แบบน่ารัก สบายใจ ไม่รีบร้อน',
    luckyColor: 'น้ำตาลทอง · ส้มพีช',
    luckyNum: '๑๑ · ๕๑',
    tip: 'ลองลอยกระทง “ขนมปังรักษ์โลก” ดู เดี๋ยวฝูงปลาจะว่ายมาอวยพรให้!',
  },
  {
    no: 12,
    grade: '🌟 ดวงเฮงระดับตำนาน',
    title: 'คืนเพ็ญเดือนสิบสอง สมปองทุกประการ',
    verse:
      'ใบเซียมซีหมายเลขมงคลประจำวันลอยกระทง! ชะตากำลังเปลี่ยนผ่านสู่บทใหม่ที่สดใสกว่าเดิม อุปสรรคเก่าๆ จะคลี่คลายลงอย่างสง่างาม',
    career: 'ความพยายามที่ผ่านมาได้รับคำชื่นชมและผลตอบแทนที่คุ้มค่า',
    love: 'เจอความรักที่พอดีและเป็นพื้นที่ปลอดภัยให้กันและกัน',
    luckyColor: 'ทองสุโขทัย · น้ำเงินเข้ม',
    luckyNum: '๑๒ · ๒๔',
    tip: 'เซฟใบเซียมซีใบนี้เก็บไว้เป็นวอลเปเปอร์รับความเฮงตลอดปีได้เลย!',
  },
  {
    no: 13,
    grade: '✨ ดวงกำลังขาขึ้น',
    title: 'ดาวตกนำโชค ความฝันใกล้เป็นความจริง',
    verse:
      'สิ่งที่คุณเคยคิดว่าเป็นไปได้ยากกำลังขยับเข้ามาใกล้กว่าที่คิด เพียงแค่กล้าลงมือก้าวแรกในสัปดาห์นี้ ประตูโอกาสจะเปิดรับทันที',
    career: 'เหมาะกับการลงมือทำโปรเจกต์ในฝันที่เก็บไว้นานแล้ว',
    love: 'อย่ากลัวที่จะทักไปก่อน ผลลัพธ์จะน่ารักกว่าที่คิดไว้เยอะ',
    luckyColor: 'เงินประกาย · ม่วงลาเวนเดอร์',
    luckyNum: '๑๓ · ๓๘',
    tip: 'มองท้องฟ้าในฉากวัดอรุณฯ ให้ดี ถ้าเห็นดาวตกผ่านหน้ารีบอธิษฐานเลย!',
  },
  {
    no: 14,
    grade: '🌿 ดวงสงบเย็นเป็นสุข',
    title: 'ครอบครัวอบอุ่น บ้านคือพลังใจที่ยิ่งใหญ่',
    verse:
      'ความสุขในช่วงนี้ซ่อนอยู่ในเรื่องใกล้ตัว การได้ทานข้าวกับครอบครัว โทรหาคนทางบ้าน หรือกอดสัตว์เลี้ยง จะช่วยเติมพลังโชคดีให้ล้นเหลือ',
    career: 'มั่นคง ค่อยเป็นค่อยไป แต่เติบโตอย่างยั่งยืน',
    love: 'คนรอบข้างและครอบครัวไฟเขียว อบอุ่นใจสุดๆ',
    luckyColor: 'ขาวมะลิ · เขียวพาสเทล',
    luckyNum: '๑๔ · ๔๔',
    tip: 'ส่งลิงก์เว็บนี้ชวนคนที่บ้านมาลอยกระทงออนไลน์ด้วยกันสิ!',
  },
  {
    no: 15,
    grade: '😄 ดวงสายฮาแต่พาปัง',
    title: 'ก็อตซิลล่าเป็นพยาน ปีนี้ไม่มีใครต้านคุณอยู่!',
    verse:
      'พลังใจของคุณช่วงนี้แกร่งระดับไคจู! เจอปัญหาใหญ่แค่ไหนก็ปัดตกได้หมด ยิ่งมั่นใจในตัวเองมากเท่าไหร่ ยิ่งดึงดูดเรื่องดีๆ เข้ามาเท่านั้น',
    career: 'โดดเด่นในสายตาทุกคน กล้าคิดกล้าทำแล้วจะชนะขาด',
    love: 'มีเสน่ห์ดึงดูดแบบคนเท่ๆ มั่นใจ ใครอยู่ใกล้ก็รู้สึกปลอดภัย',
    luckyColor: 'ฟ้าไฟฟ้า · ทองเมทัลลิก',
    luckyNum: '๑๕ · ๕๕',
    tip: 'คืนนี้เปิดเสียงลำโพงฟังก็อตซิลล่าคำรามฉลองตอนชูตกระทงลงห่วงนะ!',
  },
  {
    no: 16,
    grade: '💰 ดวงการเงินโดดเด่น',
    title: 'โคมยี่เป็งนับร้อย โชคลาภลอยสูงลิ่ว',
    verse:
      'กราฟชีวิตช่วงปลายปีพุ่งขึ้นเหมือนโคมยี่เป็งลอยเต็มฟ้าเชียงใหม่ สิ่งดีๆ ที่เคยหว่านเมล็ดไว้จะกลับมาตอบแทนทั้งชื่อเสียงและทรัพย์สิน',
    career: 'ได้ขยับขยายหน้าที่หรือมีช่องทางทำเงินใหม่ๆ เข้ามา',
    love: 'สดใสราบรื่น มีเรื่องให้ยิ้มและตื่นเต้นด้วยกันอยู่เสมอ',
    luckyColor: 'ส้มอำพัน · ทองกุหลาบ',
    luckyNum: '๑๖ · ๖๘',
    tip: 'ลองเปลี่ยนฉากไปลอยกระทงที่ “ยี่เป็งเชียงใหม่” รับบรรยากาศโคมทองดูครับ!',
  },
];

export function drawRandomFortune(excludeNo = null) {
  const pool = excludeNo ? FORTUNES.filter((f) => f.no !== excludeNo) : FORTUNES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Renders a crisp 1080x1350 downloadable PNG Siem-Si Fortune Card for social sharing.
 */
export async function renderFortuneCardPng(canvas, fortune) {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. Rich Modern Thai Crimson-Indigo Night Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#12081e');
  bg.addColorStop(0.45, '#2b0f28');
  bg.addColorStop(1, '#0b0a1c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Warm ambient moon halo at top
  const halo = ctx.createRadialGradient(W / 2, 270, 20, W / 2, 270, 380);
  halo.addColorStop(0, 'rgba(250, 204, 21, 0.24)');
  halo.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, 680);

  // Subtle decorative stars
  for (let i = 0; i < 45; i++) {
    const sx = ((i * 197 + 73) % (W - 120)) + 60;
    const sy = ((i * 131 + 59) % 420) + 60;
    ctx.fillStyle = `rgba(255, 244, 204, ${0.22 + (i % 5) * 0.14})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Ornamental Gold Double Border Frame
  ctx.strokeStyle = 'rgba(247, 214, 138, 0.45)';
  ctx.lineWidth = 2.5;
  roundRect(ctx, 42, 42, W - 84, H - 84, 28);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(247, 214, 138, 0.18)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 58, 58, W - 116, H - 116, 20);
  ctx.stroke();

  // 3. Header & Glowing Fortune Number Emblem
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7d68a';
  ctx.font = '500 24px Prompt, sans-serif';
  ctx.fillText('แสงคงคา · เซียมซีคืนเพ็ญเดือน ๑๒', W / 2, 126);

  // Golden circular fortune seal
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, 266, 96, 0, Math.PI * 2);
  const seal = ctx.createRadialGradient(W / 2 - 20, 246, 12, W / 2, 266, 98);
  seal.addColorStop(0, '#fff7cc');
  seal.addColorStop(0.55, '#eab308');
  seal.addColorStop(1, '#92400e');
  ctx.fillStyle = seal;
  ctx.fill();
  ctx.strokeStyle = '#fffbeb';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#291504';
  ctx.font = '600 24px Prompt, sans-serif';
  ctx.fillText('ใบที่', W / 2, 232);
  ctx.font = '700 72px "Noto Serif Thai", Georgia, serif';
  ctx.fillText(toThaiDigits(fortune.no), W / 2, 314);

  // Grade badge pill
  ctx.fillStyle = 'rgba(247, 214, 138, 0.16)';
  roundRect(ctx, W / 2 - 210, 396, 420, 50, 25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(247, 214, 138, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.font = '600 26px Prompt, sans-serif';
  ctx.fillText(fortune.grade, W / 2, 430);

  // Title
  ctx.fillStyle = '#fffaf0';
  ctx.font = '700 40px "Noto Serif Thai", Georgia, serif';
  const titleLines = wrapThaiText(ctx, fortune.title, W - 180, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, 514 + idx * 54);
  });

  // 4. Main Prophecy Panel
  const boxY = 612;
  const boxH = 276;
  ctx.fillStyle = 'rgba(10, 12, 28, 0.72)';
  roundRect(ctx, 96, boxY, W - 192, boxH, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(247, 214, 138, 0.3)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = '#fff5dc';
  ctx.font = '500 30px "Noto Serif Thai", Georgia, serif';
  const verseLines = wrapThaiText(ctx, `“${fortune.verse}”`, W - 260, 4);
  const startVerseY = boxY + 80 + ((4 - verseLines.length) * 48) / 2.5;
  verseLines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, startVerseY + idx * 50);
  });

  // 5. Career, Love & Lucky Info Grid
  const drawRowCard = (y, label, val, accent) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    roundRect(ctx, 96, y, W - 192, 86, 18);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = '600 22px Prompt, sans-serif';
    ctx.fillText(label, 126, y + 34);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 24px Prompt, sans-serif';
    const trimmed = wrapThaiText(ctx, val, W - 252, 1)[0];
    ctx.fillText(trimmed, 126, y + 68);
    ctx.textAlign = 'center';
  };

  drawRowCard(916, '💼 การงาน & การเงิน', fortune.career, '#fde047');
  drawRowCard(1018, '♥ ความรัก & ความสัมพันธ์', fortune.love, '#f9a8d4');
  drawRowCard(1120, `✨ สีมงคล & เลขนำโชค`, `${fortune.luckyColor}  ·  เลขเด็ด ${fortune.luckyNum}`, '#6ee7b7');

  // Footer Tip
  ctx.fillStyle = 'rgba(247, 214, 138, 0.85)';
  ctx.font = '500 22px Prompt, sans-serif';
  ctx.fillText(`💡 เคล็ดลับคืนวันเพ็ญ: ${fortune.tip}`, W / 2, 1264);
}

function wrapThaiText(ctx, text, maxWidth, maxLines = 4) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [''];
  let segments;
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    segments = Array.from(seg.segment(clean), (s) => s.segment);
  } else {
    segments = Array.from(clean);
  }

  const lines = [];
  let current = '';
  for (const token of segments) {
    const candidate = current + token;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current.trim()) {
        lines.push(current.trim());
        if (lines.length >= maxLines) {
          let last = lines[maxLines - 1].replace(/[…]+$/, '');
          while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
            last = last.slice(0, -1);
          }
          lines[maxLines - 1] = last + '…';
          return lines;
        }
      }
      current = token.trimStart();
    }
  }
  if (current.trim() && lines.length < maxLines) lines.push(current.trim());
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
