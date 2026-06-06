# PRD Quality Review — MeCare

## Overall verdict

Đây là một PRD chain-top mạnh một cách bất thường so với mức stakes go-live: có thesis rõ ("nhà thuốc gần như không chăm khách sau bán"), 16 FR gần như tất cả đều kèm Consequences (testable), Non-Goals tường minh, Risk Register thẳng thắn về rủi ro nền tảng lớn nhất (khóa Zalo), và sự trung thực đáng khen khi tự gắn nhãn KPI marketing là "tham vọng, KHÔNG cam kết đo lường". Điểm yếu thực sự không nằm ở chất lượng viết mà ở **các con số nền móng chưa chốt** — bảng token/dung lượng gói (Open Q1) và ngưỡng hành vi Zalo (Open Q2) — cả hai trực tiếp chi phối pricing 399k/trần 1.000 tin và chiến lược chống khóa, tức là chi phối chính cái phí setup 3 triệu mà nhà thuốc đang trả. Với một PRD feeding UX→architecture→stories thì downstream usability tốt; rủi ro lớn nhất với "tính hữu dụng" là ai đó đọc xong tưởng đã sẵn sàng build trong khi hai biến số định giá/sống còn vẫn để ngỏ.

## Decision-readiness — strong

Người ra quyết định hành động được trên tài liệu này. Các quyết định được phát biểu như quyết định, không giấu dưới dạng "cân nhắc": mô hình relay "AI-mediated relay (Tinsu chốt 2026-06-06), KHÔNG phải takeover trực tiếp" (addendum §2) là một quyết định kiến trúc-sản phẩm có chủ ngày tháng; "v1 một gói duy nhất" (§6.2); "không dùng Zalo OA ở v1 — chạy trên Zalo Cá Nhân để giữ cảm giác nhà thuốc quen" (§5) nêu rõ cái được chọn VÀ cái đánh đổi (chấp nhận rủi ro ToS thay vì lấy kênh chính thức an toàn hơn).

Trade-off được đặt tên kèm cái phải bỏ: §5 và Risk R1 thừa nhận thẳng "Tự động hóa Zalo Cá Nhân vi phạm ToS → khóa tài khoản, mất toàn bộ kênh khách | Cao nhất". Đây chính là chỗ một PRD yếu sẽ làm mượt thành neutral; PRD này không né.

Open Questions ở §8 đa số là câu hỏi thật, không phải tu từ có sẵn đáp án — Q1 (bảng token) và Q2 (ngưỡng Zalo) thừa nhận thiếu dữ liệu gốc chứ không tự trả lời. Các `[NOTE FOR PM]` đặt đúng chỗ căng thật: Nhóm 5 cắt ngang "đổi nhóm hay gắn cờ trạng thái" (FR-2 Notes), data governance dữ liệu sức khỏe trên Baserow (§11.2), lộ trình dự phòng đa tài khoản/Zalo OA (FR-13 Notes) — đều là tension thực, không phải checkpoint an toàn.

### Findings
- **medium** Quyết định pricing đặt trên dữ liệu chưa có (§Addendum 3, §8 Q1) — Giá 399k/trần 1.000 tin/setup 3 triệu được trình bày như đã chốt ở addendum nhưng phương pháp lại ghi "tính token tiêu thụ mỗi tin → biên lợi nhuận → định gói" trong khi "[CẦN TINSU XÁC NHẬN] Bảng token/tin chính xác... không lưu được". Người ra quyết định về giá đang đứng trên một suy luận chưa có số gốc. *Fix:* Đánh dấu rõ pricing v1 là "tạm chốt để bán pilot, chờ S25 reconcile" hoặc lấy lại số gốc trước khi mở rộng quá Trúc Tâm.

## Substance over theater — strong

Hầu như không có furniture. JTBD (§2.1) gọn ba persona thật (chủ nhà thuốc, dược sĩ chuyên môn, nhân viên quầy) — dưới ngưỡng 4 persona, và mỗi persona **thực sự lái FR**: nhân viên quầy → FR-1 ("≤20 giây"), dược sĩ chuyên môn → FR-8/FR-9 relay, chủ nhà thuốc → FR-14/FR-15. Không có persona trang trí.

Vision (§1) không thể swap sang PRD khác: "trải nghiệm với khách vẫn là nhắn tin với nhà thuốc quen qua Zalo: không app mới, không đăng ký. Phần AI và CRM ẩn phía sau" là một insight sản phẩm cụ thể (giấu công nghệ sau persona quen thuộc), không phải vision theater.

NFR có ngưỡng sản phẩm-cụ thể chứ không phải boilerplate "phải scalable/secure": FR-5 "≤1.000 tin/tháng", FR-1 "≤20 giây", FR-12 "jitter + trần/ngày + chỉ giờ hành chính", SLA FR-10 "ngoài giờ — phản hồi đầu giờ sáng hôm sau". Đặc biệt §7 chống NFR/metric theater một cách chủ động: tự hạ KPI hoành tráng (45%→80%) xuống "tham vọng marketing, KHÔNG cam kết đo lường" (SM-6) — đây là dấu hiệu của tác giả trung thực, hiếm gặp.

Không có innovation theater: §2.3 §4.3 thừa nhận lợi thế "nằm ở tốc độ thực thi + hiểu nghiệp vụ dược, không phải công nghệ độc quyền" (Assumptions Index §9), và Open Q4 còn để ngỏ "moat dài hạn nằm ở đâu" — không bịa novelty.

## Strategic coherence — strong

PRD có thesis rõ và features phục vụ một arc thống nhất, không phải backlog có heading. Thesis: nhà thuốc lẻ mất doanh thu vì không chăm khách sau bán, và rào cản không phải ý chí mà là thời gian/nhân sự/công cụ (§1). Mọi feature đều quy về đó: thu thập tại quầy (4.1) → chăm chủ động theo nhịp (4.2) → leo thang an toàn (4.3) → lớp Zalo sống sót (4.4) → CRM để chủ nhìn thấy (4.5) → onboarding tận tay (4.6). Thứ tự ưu tiên theo thesis, không theo "cái gì dễ trước".

Success Metrics validate thesis chứ không đo activity rỗng: SM-1 giữ chân pilot, SM-2 đạt 10 nhà thuốc trả phí, SM-3 "Zalo không bị khóa" — cái cuối là metric sống-còn đúng với rủi ro R1. Đáng khen là **Counter-metrics có thật và sắc**: SM-C1 "Số tin gửi/khách — KHÔNG tối ưu tăng. Nhắn nhiều hơn ≠ chăm tốt hơn" và SM-C2 "Tỉ lệ AI tự trả lời ca lẽ ra phải leo thang — KHÔNG tối ưu... Thà leo thang thừa còn hơn bỏ sót ca y tế". Hai counter-metric này trực tiếp chống lại cám dỗ tối ưu sai trong một sản phẩm y tế — đây là dấu hiệu coherence thật.

MVP scope kind nhất quán: problem-solving (giải bài toán chăm sóc sau bán) với scope logic khớp — đẩy self-serve/đa kênh/chuỗi sang sau đúng vì v1 chỉ cần chứng minh vòng lặp chăm sóc + sống sót trên Zalo.

### Findings
- **low** SM-2 "10 nhà thuốc trả phí trong 1–3 tháng" chồng lấn ngưỡng năng lực solo (§7, R3, Open Q5) — Mục tiêu doanh thu (10 nhà thuốc) trùng đúng trần mô hình thủ công solo (~10), nghĩa là đạt SM-2 cũng là lúc chạm giới hạn scale của R3. Tài liệu không nói rõ điều này tạo căng thẳng. *Fix:* Một câu ở §7 hoặc R3 ghi nhận "đạt SM-2 = trigger phải giải quyết Open Q5/tự động hóa onboarding".

## Done-ness clarity — strong

Đây thường là chỗ PRD sụp, nhưng MeCare giữ được. **15/16 FR có khối "Consequences (testable)"** với điều kiện kiểm chứng được: FR-1 "≤20 giây", "SĐT trùng được cảnh báo"; FR-4 "nhắc refill gửi trước 5 ngày; tái khám trước 3 ngày"; FR-5 "chạm trần gói → dừng gửi tin chủ động (không chặn Nhóm 5)"; FR-8 liệt kê trigger leo thang cụ thể kèm ngưỡng lâm sàng ("huyết áp <130/80, đường huyết đói 4.4–7.2"); FR-9 "Khách nhận tin chờ ngay khi leo thang". Engineer đọc xong biết "done" trông như thế nào.

Adjective mơ hồ gần như không có. Vài chỗ "gần như tức thì" (FR-7) / "nhanh" (4.1) nhưng đều được bound ở chỗ khác (FR-1 đã định lượng "≤20 giây"; SLA FR-10 định lượng "trong ngày", "đầu giờ sáng hôm sau"). Out of Scope per-FR (FR-3, FR-8) cũng giúp khoanh "không-done".

### Findings
- **medium** FR-16 (setup tận tay) thiếu tiêu chí "done" định lượng cho bước sống-còn (§4.6) — Consequences ghi "Một nhà thuốc mới hoàn tất setup và gửi được tin chăm sóc thật" và "warm-up" nhưng không có thời lượng warm-up, số tin/ngày khởi điểm, hay tiêu chí "phiên ổn định" đo được. Vì warm-up sai là đường ngắn nhất tới khóa tài khoản (R1), đây là FR cần bound nhất nhưng lại mỏng nhất — và nó phụ thuộc Open Q2 chưa giải. *Fix:* Thêm checklist warm-up đo được (vd "N ngày, tăng dần X→Y tin/ngày") khi Q2 có dữ liệu.
- **low** FR-13 "gửi thất bại liên tiếp → cảnh báo" chưa định nghĩa ngưỡng "liên tiếp" (§4.4) — Bao nhiêu lần liên tiếp/trong bao lâu thì cảnh báo? Để ngỏ thì story creation phải tự đoán. *Fix:* Cho một con số gợi ý (vd "≥3 tin lỗi liên tiếp hoặc mất phiên >X phút").

## Scope honesty — strong

Omission là tường minh, không bắt người đọc tự suy. §5 Non-Goals làm việc thật (9 gạch đầu dòng: không app khách, không Zalo OA v1, không đa kênh, không chuỗi, không POS, không billing tự động, không self-serve, AI không chẩn đoán, không tự đổi liều) và §6.2 lặp lại kèm **lý do** ("Self-serve — chưa cần khi ≤10 nhà thuốc"). De-scoping được làm công khai, không âm thầm.

`[ASSUMPTION]` được gắn đúng chỗ inference chưa xác nhận (FR-2 Notes Nhóm 5, FR-12 ngưỡng Zalo, FR-15 chỉ số hiệu quả, §7 SM-6) và **index lại đầy đủ ở §9** — roundtrip sạch. `[NOTE FOR PM]` đặt tại deferred decision thật (data governance §11.2, lộ trình dự phòng FR-13).

Mật độ open-items hợp lý so với stakes: 6 Open Questions + ~5 ASSUMPTION + ~4 NOTE FOR PM. Với một PRD go-live thì con số này không thấp, nhưng phần lớn là "cần xác nhận số/handoff" chứ không phải "chưa biết build gì" — nên không phải blocker. Ngoại lệ là Q1/Q2 (xem dưới): chúng không chỉ là open question mà là biến số chặn quyết định pricing/sống-còn.

### Findings
- **high** Hai Open Question nền móng (token + ngưỡng Zalo) bị trình bày ngang hàng với câu hỏi định hướng (§8 Q1, Q2 vs Q4) — Q1 (số token/dung lượng gói) và Q2 (ngưỡng hành vi Zalo) chặn trực tiếp pricing đang-thu-tiền và chiến lược chống-khóa (R1, rủi ro cao nhất), trong khi Q4 (moat) chỉ ảnh hưởng định hướng sau-v1. Liệt kê phẳng khiến người đọc có thể không thấy rằng hai cái đầu là điều kiện-tiên-quyết-trước-scale, không phải "để sau". *Fix:* Tách §8 thành "Blocker trước khi mở rộng quá pilot" (Q1, Q2) vs "Định hướng" (còn lại); hoặc nâng Q1/Q2 vào Risk Register với điều kiện chặn rõ.

## Downstream usability — strong

Là chain-top (feeds UX→architecture→stories), dimension này quan trọng và PRD đáp ứng tốt. Glossary §3 đầy đủ và phân biệt các noun dễ lẫn một cách rất cẩn thận: "Tài khoản Zalo chăm sóc" (kênh AI) vs "Zalo dược sĩ thật" (nhận leo thang) vs "Dược Sĩ Hải" (persona) vs "Dược sĩ (thật)" (con người) — bốn khái niệm sát nhau được tách bạch, dùng nhất quán xuyên FR-8/FR-9/§4.3/UJ-3. Đây là phần dễ gây sập downstream nhất và tác giả xử lý kỹ.

FR ID liền mạch FR-1..FR-16, không gap/trùng. UJ-1..UJ-4 mỗi cái có protagonist tên riêng (Cô Lan, Anh Tú, Dược Sĩ Hải, Nhân viên quầy) mang context inline — không có UJ trôi nổi. Cross-ref "Realizes UJ-X" / "Validates FR-Y" resolve được: ví dụ FR-3 realizes UJ-1/UJ-2, SM-3 validates FR-5/11/12/13 — đều tồn tại. Phân tách prd.md (what) / addendum.md (how) sạch, addendum chỉ rõ nguồn-sự-thật ("Baserow — nguồn sự thật cho FR-10, FR-14, FR-15").

### Findings
- **medium** Kịch bản nguồn — nền tảng của FR-3/FR-4/FR-7 — còn drift persona chưa sửa (§8 Q3, Addendum §5) — `kichban-chamsoc-khachhang.md` (746 dòng) còn 27 dòng persona cũ "Ngọc" và nhiều chỗ "kết nối dược sĩ" viết theo mô hình 2-vai cũ, trái với mô hình relay đã chốt. Vì FR-3/FR-7 source-extract trực tiếp từ file này, story/dev kéo nội dung ra sẽ kéo cả nhãn sai nếu chưa sửa. PRD có flag (Q3) nhưng việc sửa là tiền-đề go-live thật. *Fix:* Hoàn tất handoff sửa kịch bản trước khi sinh stories từ 4.2/4.3.
- **low** UJ-4 protagonist là vai trò chứ không phải tên ("Nhân viên quầy") (§2.3) — Ba UJ kia có tên người (Lan, Tú, Hải); UJ-4 chỉ "Nhân viên bán thuốc". Không gây sai nhưng kém nhất quán so với chuẩn protagonist-có-tên. *Fix:* Đặt một tên (vd "Bạn Mai, nhân viên quầy").

## Shape fit — strong

PRD được đóng đúng hình. Đây là SaaS B2B đa-stakeholder có UX y tế ý nghĩa (chủ nhà thuốc mua, dược sĩ xử lý leo thang, khách cuối nhận chăm sóc, nhân viên nhập liệu) → UJs với protagonist có tên là load-bearing, và PRD có đúng 4 UJ phủ các stakeholder chính, mỗi UJ có Climax/Resolution/Edge case thật (UJ-1 edge case "khó thở → 115 không chờ dược sĩ" là edge case y tế thực, không trang trí).

Không over-formalized (4 UJ là vừa đủ, không nhồi UJ cho mỗi FR) cũng không under-formalized (không phải capability spec trần trụi cho một sản phẩm có khách cuối). Khía cạnh "regulatory-ish" của y tế được xử lý đúng trọng lượng: §11 Guardrails + FR-8 trigger với ngưỡng lâm sàng + counter-metric SM-C2 — constraint traceability có mặt ở mức một sản phẩm y-tế-nhẹ cần, không bị thổi thành compliance doc. Brownfield-ish (đã có website, kịch bản, pilot Trúc Tâm) được tài sản hóa rõ ở Addendum §6 và phân biệt cái-đã-có với cái-phải-sửa.

## Mechanical notes

- **Glossary drift:** Sạch. "Nhóm chăm sóc / Nhóm 1–6", "Tin chăm sóc", "Trần gói", "Leo thang" dùng nhất quán xuyên suốt. Không thấy drift case/số nhiều/đồng nghĩa đáng kể.
- **ID continuity:** FR-1..FR-16 liền mạch, không gap/trùng. UJ-1..UJ-4, SM-1..SM-6 + SM-C1/C2, R1..R5 đều liên tục. Cross-ref "Realizes/Validates/Counterbalances" kiểm tra mẫu đều resolve.
- **Assumptions Index roundtrip:** §9 chứa các mục khớp với `[ASSUMPTION]` inline (FR-2 Nhóm 5, FR-12 ngưỡng Zalo, FR-15 chỉ số, SM-6 KPI, §6.2 gói 2, §4.6 ngưỡng 10). Một mục §9 ("§4.3 — lợi thế nằm ở tốc độ thực thi...") không có tag `[ASSUMPTION]` inline tương ứng rõ ràng ở §4.3 — drift nhẹ một chiều, low.
- **UJ protagonist naming:** UJ-1/2/3 có tên người; UJ-4 dùng vai trò (xem finding Downstream).
- **Required sections:** Đủ cho stakes go-live + loại sản phẩm: Vision, JTBD/Personas, Glossary, FRs với Consequences, Non-Goals, MVP scope, Success Metrics + Counter-metrics, Open Questions, Assumptions Index, Aesthetic/Tone, Constraints/Guardrails, Risk Register, Why Now. Tách prd/addendum hợp lý.
- **Cross-doc:** prd.md tham chiếu addendum.md và addendum tham chiếu ngược FR cụ thể (FR-9, FR-10, FR-12, FR-13) — liên kết hai chiều resolve được.
