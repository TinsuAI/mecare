import type { Msg, Scenario } from "./ZaloChat";

const LAN_HEADER = {
  name: "Nguyễn Thị Lan",
  sub: "Zalo",
  avatar: "L",
  avatarBg: "#8e44ad",
  avatarFontSize: 30,
  placeholder: "Nhắn tin...",
};

const MINH_HEADER = {
  name: "Nguyễn Văn Minh",
  sub: "Zalo",
  avatar: "M",
  avatarBg: "#1565c0",
  avatarFontSize: 30,
  placeholder: "Nhắn tin...",
};

const HOA_HEADER = {
  name: "Trần Thị Hoa",
  sub: "Zalo",
  avatar: "H",
  avatarBg: "#c0392b",
  avatarFontSize: 30,
  placeholder: "Nhắn tin...",
};

function preload(msgs: Msg[]): Msg[] {
  return msgs.map((m) => ({ ...m, preloaded: true }));
}

// ─── Nội dung từng ngày ───────────────────────────────────────────────────────

const UC01_MSGS: Msg[] = [
  { type: "divider", text: "── 31 tháng 05 ──" },
  { type: "sent", text: "Dạ chào chị Lan! Cảm ơn chị đã mua thuốc tại Nhà Thuốc Trúc Tâm hôm nay ạ 💊\nBên em có thể nhắc chị uống thuốc và mua lại đúng lịch qua Zalo này, hoàn toàn miễn phí ạ.\nChị có muốn đăng ký nhận nhắc nhở không ạ?", time: "10:35" },
  { type: "recv", text: "ừ tiện vậy thì nhắc giúp mình với", time: "10:38", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ tuyệt vời ạ! Em xác nhận:\nChị Lan - Losartan 50mg - mua ngày 31/05\nEm sẽ nhắc chị uống đúng giờ và tái mua sau 28 ngày ạ ✅", time: "10:39" },
  { type: "recv", text: "ok cảm ơn em 🙂", time: "10:39", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ chúc chị sức khoẻ ạ 🙏", time: "10:40" },
];

const UC02_MSGS: Msg[] = [
  { type: "divider", text: "── 01 tháng 06 ──" },
  { type: "sent", text: "🌅 Chào buổi sáng chị Lan! Đã đến giờ uống thuốc sáng rồi ạ.\nLosartan 50mg - 1 viên sau bữa sáng nhé chị, nhớ uống sau khi ăn ạ 💊", time: "08:00" },
  { type: "recv", text: "uống rồi em 👍", time: "08:12", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ tốt quá ạ! Nếu chị quên một liều thì đừng uống bù, cứ uống liều tiếp theo bình thường nhé ạ.", time: "08:13" },
  { type: "sent", text: "🌙 Nhắc chị uống thuốc tối ạ!\nLosartan 50mg - 1 viên sau bữa tối nhé chị 💊", time: "19:00" },
  { type: "recv", text: "ok em cảm ơn", time: "19:07", avatar: "L", avatarBg: "#8e44ad" },
  { type: "divider", text: "── 03 tháng 06 ──" },
  { type: "sent", text: "Dạ chào chị Lan! Chị uống thuốc được 3 ngày rồi ạ.\nChị cảm thấy thế nào? Còn chóng mặt hay đau đầu không ạ?", time: "08:00" },
  { type: "recv", text: "ờ uống đều rồi, hơi đỡ hơn nhưng vẫn còn chóng mặt nhẹ buổi sáng", time: "08:22", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ thuốc huyết áp thường cần 1-2 tuần mới thấy rõ hiệu quả ạ, chị đừng lo.\nChị tiếp tục uống đúng giờ nhé. Nếu chóng mặt nặng hơn hoặc thấy mệt bất thường thì báo em ngay ạ 🏥", time: "08:23" },
];

// UC-04 bao gồm luôn phản hồi sau khi nhận máy (cùng ngày 05/06)
const UC04_MSGS: Msg[] = [
  { type: "divider", text: "── 05 tháng 06 ──" },
  { type: "sent", text: "Chào chị Lan! Em nhắn thăm chị ạ. Dạo này chị uống thuốc huyết áp đều không? Sáng nay chị đo được bao nhiêu, có thấy đau đầu hay chóng mặt không ạ?", time: "09:15" },
  { type: "recv", text: "ừ vẫn uống đều, mà cô chưa có máy đo nên không biết huyết áp bao nhiêu, chỉ thấy hơi chóng mặt buổi sáng thôi", time: "09:18", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ ghi nhận ạ. Chóng mặt buổi sáng mà chưa đo được huyết áp thì khó biết thuốc có hiệu quả không ạ. Theo dõi số huyết áp hàng ngày giúp điều chỉnh thuốc đúng hơn nhiều ạ.", time: "09:19" },
  { type: "sent", text: "Bên em đang có ưu đãi máy đo huyết áp Omron HEM-7121 dành cho khách quen ạ:\nGiá: 890.000đ (thị trường 1.1-1.2 triệu)\nBảo hành 3 năm, tự động 1 nút, lưu 60 lần đo.\nChị có muốn đặt không ạ?", time: "09:20" },
  { type: "recv", text: "ừ nghe tiện đó, vậy đặt cho mình 1 cái đi", time: "09:22", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ em xác nhận:\nMáy đo huyết áp Omron HEM-7121 x 1 - 890.000đ\nGiao đến: 225 Nguyễn Văn Cừ, Long Biên, Hà Nội\nThanh toán khi nhận hàng, shipper liên hệ trước ạ 🛵\nSau khi có máy chị đo buổi sáng rồi báo em kết quả nhé ạ!", time: "09:22" },
  { type: "recv", text: "máy về rồi em, dễ dùng lắm 😊 đo sáng nay được 132/84 rồi", time: "16:10", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ tuyệt vời ạ! Huyết áp 132/84 đang ổn hơn rồi ạ 👍\nChị tiếp tục đo đều mỗi sáng trước khi uống thuốc nhé, em theo dõi cùng chị ạ!", time: "16:15" },
];

const UC05_MSGS: Msg[] = [
  { type: "divider", text: "── 27 tháng 06 ──" },
  { type: "sent", text: "Chào buổi sáng chị Lan!\nThuốc Losartan 50mg chị mua cách đây 27 ngày - sắp hết rồi ạ.\nChị có muốn đặt thêm không ạ? 💊", time: "08:00" },
  { type: "recv", text: "ừ đặt cho mình 2 hộp nha, giao về địa chỉ cũ", time: "08:04", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ em xác nhận:\nLosartan 50mg x 2 hộp - 96.000đ\nGiao đến: 225 Nguyễn Văn Cừ, Long Biên, Hà Nội\nThanh toán khi nhận hàng ạ.", time: "08:05" },
  { type: "recv", text: "ok cảm ơn em nhắc nha 👍", time: "08:05", avatar: "L", avatarBg: "#8e44ad" },
  { type: "sent", text: "Dạ em cảm ơn chị ạ!\nShipper giao trong 1-2 giờ.\nLịch nhắc lần sau: sau 28 ngày nữa ✅", time: "08:06" },
];

// ─── Scenarios ────────────────────────────────────────────────────────────────

export const scenarios: Scenario[] = [
  // UC-01: Lần đầu liên hệ
  {
    id: "uc01-chao-sau-mua-tai-quay",
    title: "Chào Khách Sau\nMua Tại Quầy",
    statusTime: "10:35",
    header: LAN_HEADER,
    messages: UC01_MSGS,
  },

  // UC-02: Nhắc uống thuốc + hỏi thăm — kế thừa toàn bộ UC-01
  {
    id: "uc02-nhac-uong-thuoc-hoi-tham",
    title: "Nhắc Uống Thuốc\nVà Hỏi Thăm Lại",
    statusTime: "08:00",
    header: LAN_HEADER,
    messages: [
      ...preload(UC01_MSGS),
      ...UC02_MSGS,
    ],
  },

  // UC-03: Khách MỚI — Anh Minh, không có lịch sử
  {
    id: "uc03-tu-van-dem-khuya",
    title: "Khách Hỏi Thuốc\n11 Giờ Đêm",
    statusTime: "22:47",
    header: MINH_HEADER,
    messages: [
      { type: "divider", text: "── 31 tháng 05 ──" },
      { type: "recv", text: "cho hỏi bên mình có thuốc huyết áp không ạ", time: "22:47", avatar: "M", avatarBg: "#1565c0" },
      { type: "recv", text: "cần Amlodipine 5mg, hết thuốc rồi 😅", time: "22:48", avatar: "M", avatarBg: "#1565c0" },
      { type: "sent", text: "Dạ chào anh! Bên em có Amlodipine 5mg đầy đủ ạ - 35.000đ/hộp 28 viên.\nAnh đang dùng theo đơn bác sĩ không ạ?", time: "22:48" },
      { type: "recv", text: "ừ theo đơn, ngày 1 viên thôi", time: "22:49", avatar: "M", avatarBg: "#1565c0" },
      { type: "sent", text: "Dạ anh cho em tên và SĐT để lưu thông tin, em nhắc tái mua đúng lịch giúp anh nhé ạ?", time: "22:49" },
      { type: "recv", text: "Minh nha, 0903 123 456", time: "22:50", avatar: "M", avatarBg: "#1565c0" },
      { type: "sent", text: "Dạ em lưu rồi ạ!\nAnh Minh - 0903 123 456\nHuyết áp cao - Amlodipine 5mg - 1 hộp/tháng\nEm sẽ nhắc anh tái mua sau 28 ngày ạ 📅", time: "22:50" },
    ],
  },

  // UC-04: Hỏi thăm + upsell — kế thừa UC-01 + UC-02
  {
    id: "uc04-hoi-tham-upsell",
    title: "Hỏi Thăm Sức Khoẻ\nVà Upsell Tự Nhiên",
    statusTime: "09:15",
    header: LAN_HEADER,
    messages: [
      ...preload(UC01_MSGS),
      ...preload(UC02_MSGS),
      ...UC04_MSGS,
    ],
  },

  // UC-05: Nhắc tái mua — kế thừa UC-01 + UC-02 + UC-04
  {
    id: "uc05-nhac-tai-mua-tu-dong",
    title: "Nhắc Tái Mua Hàng\nTự Động",
    statusTime: "08:00",
    header: LAN_HEADER,
    messages: [
      ...preload(UC01_MSGS),
      ...preload(UC02_MSGS),
      ...preload(UC04_MSGS),
      ...UC05_MSGS,
    ],
  },

  // UC-06: Chiến dịch — Cô Hoa, khách MỚI
  {
    id: "uc06-chien-dich-quang-cao",
    title: "Chiến Dịch\nQuảng Cáo Sản Phẩm",
    statusTime: "14:00",
    header: HOA_HEADER,
    messages: [
      { type: "divider", text: "── 05 tháng 06 ──" },
      { type: "sent", text: "Cháu chào cô Hoa ạ! Cháu thấy cô đang mua thuốc điều trị huyết áp tại nhà thuốc mình.\nBên cháu đang có chương trình khuyến mãi máy đo huyết áp tại nhà dành cho khách hàng thân thiết ạ.\nCô đã có máy đo huyết áp chưa ạ?", time: "14:00" },
      { type: "recv", text: "cô chưa có đó, mua ở đây có bảo hành không con", time: "14:05", avatar: "H", avatarBg: "#c0392b" },
      { type: "sent", text: "Dạ có ạ! Bên cháu bán máy Omron HEM-7121 - thương hiệu Nhật, được nhiều bác sĩ khuyên dùng ạ.\nBảo hành 3 năm chính hãng, đo cánh tay, tự động 1 nút - cô dùng rất dễ ạ.", time: "14:06" },
      { type: "sent", text: "Giá ưu đãi khách quen: 890.000đ (thị trường 1.1-1.2 triệu)\nCô đặt qua Zalo này, cháu giao tận nhà ạ 🚚", time: "14:07" },
      { type: "recv", text: "vậy thì tiện quá, đặt cho cô 1 cái đi con", time: "14:09", avatar: "H", avatarBg: "#c0392b" },
      { type: "sent", text: "Dạ tuyệt vời ạ! Cô cho cháu địa chỉ giao hàng với ạ?", time: "14:09" },
      { type: "recv", text: "15 Lê Duẩn, Đống Đa, Hà Nội nha con", time: "14:10", avatar: "H", avatarBg: "#c0392b" },
      { type: "sent", text: "Dạ cháu xác nhận:\nMáy đo huyết áp Omron HEM-7121 x 1 - 890.000đ\nGiao đến: 15 Lê Duẩn, Đống Đa, Hà Nội\nThanh toán khi nhận hàng ạ. Shipper liên hệ trước khi giao 🛵\nCảm ơn cô ạ!", time: "14:11" },
    ],
  },
];
