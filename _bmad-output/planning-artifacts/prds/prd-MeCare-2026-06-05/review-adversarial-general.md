---
title: "Review Đối Kháng (Adversarial) — PRD MeCare"
reviewer: "Adversarial reviewer (kỹ sư hoài nghi + dược sĩ-khách e ngại rủi ro + đội trust & safety Zalo)"
target: "prd-MeCare-2026-06-05/prd.md + addendum.md"
date: 2026-06-06
verdict: "KHÔNG sẵn sàng go-live như đang viết. Hai lỗ hổng critical (relay y tế + khóa Zalo) đủ giết sản phẩm hoặc gây hại khách thật."
---

# Review Đối Kháng — PRD MeCare

Tôi không ở đây để vuốt ve tài liệu. Tôi ở đây để tìm chỗ nó giết khách hàng, làm khóa tài khoản, hoặc bị copy trong 2 tuần. PRD này viết đẹp, có glossary, có risk register — nhưng phần lớn rủi ro thật bị "đẩy" sang addendum hoặc gắn `[ASSUMPTION]` rồi coi như xong. Gắn tag không phải là giảm thiểu. Dưới đây là các đòn mạnh nhất.

---

## VERDICT

**KHÔNG sẵn sàng.** Sản phẩm này đứng trên hai cái chân gãy: (1) một luồng relay y tế có thể im lặng để khách nguy hiểm chờ vô thời hạn, và (2) một chiến lược chống khóa Zalo dựa hoàn toàn trên các con số chưa ai kiểm chứng. Cả hai đều được PRD *thừa nhận* là rủi ro cao nhất nhưng *không* được giải quyết ở mức yêu cầu chức năng. Risk register liệt kê rủi ro rồi xem như đã xử lý — đó là thói quen nguy hiểm nhất trong tài liệu này.

---

## TOP FINDINGS

### F1 — [CRITICAL] Relay FR-9 không có timeout / fallback khi dược sĩ thật không trả lời. Khách nguy hiểm bị treo im lặng.

**Đòn:** FR-9 mô tả luồng đẹp đẽ: AI nhắn "để em hỏi dược sĩ rồi báo lại ngay ạ" → báo sang Zalo dược sĩ thật → dược sĩ gõ phương án → AI nhắn lại khách. Toàn bộ luồng này **giả định dược sĩ thật sẽ trả lời.** Nhưng:

- Pilot là **Hải — một người, vừa chủ vừa dược sĩ, "vận hành gần như một mình, đang đông khách"** (chính UJ-3 nói vậy). Người này đang bán hàng, đi vệ sinh, ngủ, hoặc đơn giản là bỏ lỡ thông báo.
- UJ-1 climax: Cô Lan báo đường huyết **13.5 mmol/L** (vượt ngưỡng FR-8). AI đã nói "để em hỏi dược sĩ rồi báo lại ngay". Rồi Hải **không thấy tin** (đang đông khách — đúng như UJ-3 mô tả). Chuyện gì xảy ra với cô Lan sau 1 giờ? 3 giờ? Qua đêm?
- SLA NFR (§4.3) ghi "ngoài giờ — phản hồi đầu giờ sáng hôm sau". Tức là một khách báo chỉ số nguy hiểm lúc 20h **có thể chính thức phải chờ tới 8h sáng hôm sau** — và trong suốt thời gian đó AI đã hứa "báo lại ngay". Đây không phải edge case hiếm; Nhóm 1 (mãn tính) nhắc thuốc *buổi tối*, nghĩa là tương tác cao điểm rơi đúng ngoài giờ.

PRD tách "cấp cứu → 115" ra (tốt), nhưng vùng nguy hiểm thật là vùng **xám**: chỉ số vượt ngưỡng nhưng chưa phải cấp cứu rõ ràng (13.5 mmol/L không gây khó thở). Vùng này rơi nguyên vào relay — và relay không có đáy.

**Vì sao critical:** "AI luôn là người nói chuyện với khách" (addendum §2) nghĩa là khách **không biết** mình đang chờ một con người có thể không bao giờ tới. Trải nghiệm "được theo dõi thật" (UJ-1 resolution) là **lời hứa giả** nếu không có ai bên kia. Đây là rủi ro pháp lý *và* đạo đức.

**Fix bắt buộc (nâng thành FR mới, có Consequence testable):**
- Timeout relay rõ ràng: nếu dược sĩ không phản hồi trong X phút (giờ làm việc) → escalate cấp 2 (nhắc lại dược sĩ / kênh dự phòng) và nếu vẫn quá Y phút → AI gửi tin an toàn mặc định ("anh/chị nên tới khám / gọi hotline …", KHÔNG bịa phương án).
- Định nghĩa hành vi ngoài giờ tường minh **cho khách**: tin chờ ban đầu phải nói đúng kỳ vọng ("dược sĩ sẽ phản hồi sáng mai") thay vì "báo lại ngay ạ" — câu hiện tại là lời hứa không giữ được.
- Vùng xám giữa "vượt ngưỡng" và "cấp cứu": với chỉ số vượt *xa* ngưỡng, AI nên chủ động khuyên đi khám/gọi y tế *song song* relay, giống cơ chế 115 — không chờ.
- Test case bắt buộc: "dược sĩ không bao giờ trả lời" phải là một kịch bản kiểm thử trước go-live, không phải tình huống chưa định nghĩa.

---

### F2 — [CRITICAL] Race condition & ai-là-nguồn-sự-thật trong relay. AI có thể tự trả lời đè lên ca đang chờ dược sĩ.

**Đòn:** Luồng relay là bất đồng bộ qua **Zalo cá nhân** (một kênh không có callback đáng tin). Vài race chưa được xử lý:

- Khách nhắn tiếp trong lúc chờ ("alo có ai không?", hoặc gửi thêm triệu chứng mới). AI đang ở trạng thái nào? Nó có tự trả lời tin mới (vi phạm "đã dừng tự trả lời" của FR-8) không? Tin mới có thể là cấp cứu — AI có còn quét trigger khi đang "chờ relay" không? Không có FR nào nói trạng thái hội thoại bị khóa thế nào.
- Dược sĩ gửi phương án về **bằng văn bản tự do** qua Zalo. Làm sao MeCare biết tin nào của dược sĩ là "phương án cho ca X"? Nếu Hải đang xử lý 3 ca leo thang cùng lúc và gõ 3 câu trả lời, hệ thống map sai phương án vào sai khách → **đưa lời khuyên y tế của người A cho người B.** PRD nói "kèm định danh khách" khi báo *sang* dược sĩ, nhưng không nói cơ chế *gắn ngược* phương án về đúng ca.
- "AI chuyển lại khách nguyên ý" (FR-9) — nhưng AI là LLM. "Nguyên ý" không phải tính chất đảm bảo được của một mô hình diễn đạt lại. Nếu dược sĩ viết "uống 1 viên", AI "diễn đạt lại giọng persona" thành "uống 1-2 viên" thì đó là sai liều do hệ thống tạo ra, không phải do dược sĩ.

**Vì sao critical:** Đây là chính cơ chế được PRD gọi là "kiểm soát rủi ro y tế cốt lõi". Nếu nó map sai ca hoặc paraphrase sai liều, nó *khuếch đại* rủi ro thay vì kiểm soát.

**Fix bắt buộc:**
- FR-9 phải chỉ định: mỗi ca leo thang có **ID/handle** mà dược sĩ reply theo (vd reply-to một tin cụ thể, hoặc cú pháp `#caID`), để map phương án về đúng khách — và phải có Consequence testable cho việc map sai bị chặn.
- Khóa trạng thái hội thoại khi đang chờ relay: AI **không paraphrase tự do** nội dung y tế của dược sĩ; với liều/thuốc/chỉ số, phải **gửi nguyên văn** (chỉ thêm câu mở "Dạ, dược sĩ Hải dặn…"), không "diễn đạt lại". Tách rõ phần được phép đổi giọng (xã giao) và phần cấm đổi (nội dung lâm sàng).
- Định nghĩa AI vẫn quét trigger cấp cứu (115) ngay cả khi đang ở trạng thái chờ relay.

---

### F3 — [CRITICAL] Chiến lược chống khóa Zalo (R1/FR-12) hoàn toàn hand-wavy. Số quan trọng nhất bị gắn `[ASSUMPTION]` rồi đi tiếp.

**Đòn:** R1 được gọi là rủi ro "Cao nhất" — khóa tài khoản = mất toàn bộ kênh khách của nhà thuốc, tức là sản phẩm chết tức thì với khách đó. Giảm thiểu liệt kê: opt-in, throttle, trần gói, warm-up, giám sát phiên, dự phòng. Nghe có vẻ đầy đủ. Nhưng:

- **Ngưỡng thật của Zalo "chưa kiểm chứng"** (Open Q2, `[ASSUMPTION]` ở FR-12). Toàn bộ throttle dựa trên những con số *không ai biết*. "Trần 1.000 tin/tháng giữ dưới ngưỡng rủi ro" — ngưỡng nào? Không có số. Đây là an toàn dựa trên niềm tin.
- **Tín hiệu khóa của Zalo không chỉ là tần suất gửi.** Zalo trust&safety nhìn vào: tỉ lệ tin một chiều (broadcast-like) vs hội thoại hai chiều, tỉ lệ bị khách report/block, tin có nội dung gần giống nhau gửi nhiều người (template detection), thiết bị/IP bất thường, đăng nhập web tự động hóa, một tài khoản kết bạn tăng đột biến tại một địa điểm. **FR-12 chỉ giải quyết jitter thời gian + giờ hành chính + trần/ngày.** Nó không đụng tới: template similarity, report rate, fingerprint thiết bị, mật độ kết bạn (opt-in tại quầy = nhiều kết bạn mới *cùng một điểm* trong thời gian ngắn — chính là tín hiệu spam điển hình).
- **Opt-in không cứu khỏi block.** Khách đồng ý kết bạn ở quầy không có nghĩa họ không bực và block/report khi bị nhắc thuốc 3 lần/ngày (Nhóm 1, rate limit cho phép 3 tin/ngày). Vài report là đủ để Zalo gắn cờ tài khoản, bất kể opt-in.
- **"Lộ trình dự phòng: đa tài khoản hoặc Zalo OA" là non-goal v1** (FR-13 Notes). Nghĩa là khi rủi ro cao nhất xảy ra, kế hoạch B *không tồn tại trong sản phẩm*. "Kiến trúc không chặn đường" không phải là kế hoạch dự phòng — đó là lời hứa sẽ-làm-sau.

**Vì sao critical:** SM-3 ("không bị khóa") là một trong ba success metric chính, nhưng cách đạt nó chỉ là tập hợp giả định chưa kiểm chứng. Nếu giả định sai, mất nhà thuốc và *mất uy tín* (nhà thuốc mất kênh khách của họ vì lỗi của bạn).

**Fix bắt buộc:**
- Trước go-live diện rộng: chạy **thử nghiệm warm-up có đo lường trên tài khoản throwaway** để tìm ngưỡng thật (Open Q2 phải đóng *trước* SM-2, không phải sau).
- FR-12 phải mở rộng để xử lý: (a) đa dạng hóa nội dung tin (chống template-similarity detection), (b) theo dõi & phản ứng với report/block rate (nếu một tài khoản bị block N lần → tự hạ tải/cảnh báo), (c) giới hạn mật độ kết bạn mới/ngày, không chỉ tin/ngày.
- Kế hoạch dự phòng (đa tài khoản / OA migration) phải có **trigger kích hoạt rõ ràng** (vd: tỉ lệ khóa quan sát được > ngưỡng → kích hoạt) chứ không phải "để dành làm sau".

---

### F4 — [HIGH] Một tài khoản AI "Dược Sĩ Hải" cho mọi khách của Trúc Tâm vẫn ổn — nhưng mô hình persona vỡ ngay khi nhân rộng 10 nhà thuốc + vẫn lừa khách.

**Đòn:** Phần này có hai vấn đề tách biệt.

*4a. Lừa dối khách (deception):* Glossary nói thẳng: "Dược Sĩ Hải" là "danh nghĩa do AI vận hành; **khách không biết đây là hệ thống**." Khách tin họ đang nhắn với dược sĩ-con-người tên Hải. Họ kể triệu chứng, tâm sự bệnh tật cho một LLM mà nghĩ là người. Đây là rủi ro trust&safety *và* pháp lý y tế (mạo danh tư vấn của chuyên gia y tế?). Khi khách phát hiện "Hải" trả lời lúc 2h sáng trong 0.5 giây, hoặc trả lời sai, niềm tin sụp đổ và nhà thuốc lãnh đủ — vì đó là *tên thật của chủ nhà thuốc*.

*4b. Persona ở quy mô:* PRD nói "mỗi nhà thuốc có thể có tên persona riêng" — tốt, nên 6 nhóm × 1 tài khoản/nhà thuốc không phải vấn đề kỹ thuật về số nhóm. Vấn đề thật ở quy mô là **vận hành**: một solo founder (Tinsu) giám sát relay/throttle/phiên web cho 10 nhà thuốc × ~300-500 khách mỗi = vài nghìn hội thoại sống. R3 ("solo không scale") chỉ nói về *onboarding*, không nói về *vận hành liên tục* (giám sát phiên FR-13, xử lý ca relay treo F1, xử lý cảnh báo khóa F3). Đây là tải vận hành ẩn lớn hơn onboarding nhiều.

**Vì sao high:** 4a là quả bom danh tiếng/pháp lý đang đợi nổ; 4b làm SM-2 (10 nhà thuốc) bất khả thi với một người ngay cả khi onboarding được chuẩn hóa.

**Fix:**
- Quyết định chính sách disclosure rõ ràng: hoặc persona là tên *thương hiệu nhà thuốc* không phải tên người ("Nhà Thuốc Trúc Tâm" thay vì "Dược Sĩ Hải"), hoặc có disclosure tối thiểu rằng tin nhắn tự động được hỗ trợ bởi nhà thuốc. Nói thẳng rủi ro mạo danh chuyên gia y tế trong §11/R2.
- R3 phải tách "tải vận hành liên tục" khỏi "tải onboarding" và đặt ngưỡng nhà thuốc dựa trên *tải vận hành* (số ca relay/ngày Tinsu xử lý nổi), không chỉ số lần setup.

---

### F5 — [HIGH] Nhiều FR untestable như đang viết. "Consequences (testable)" có chữ testable nhưng nội dung thì không.

**Đòn:** Một Consequence "testable" phải có ngưỡng đo được và điều kiện pass/fail. Những cái sau thì không:

- **FR-7:** "trả lời trong giờ làm việc **gần như tức thì**" — "gần như tức thì" là bao nhiêu giây? Không đo được.
- **FR-9:** "Phương án dược sĩ gửi về được AI chuyển lại khách **nguyên ý, đúng giọng persona**" — "nguyên ý" không có định nghĩa kiểm thử. Làm sao QA fail được một paraphrase? (xem F2).
- **FR-8:** "**Bất kỳ tình huống nào AI không chắc chắn** (catch-all)" — "không chắc chắn" của một LLM không phải đại lượng quan sát được trừ khi định nghĩa cụ thể (ngưỡng confidence? intent không khớp kịch bản?). Catch-all này vừa là guardrail an toàn quan trọng nhất *vừa* là FR mơ hồ nhất. Không test được = không tin được.
- **FR-12:** "trần gửi/ngày dưới **ngưỡng rủi ro Zalo**" — ngưỡng chưa biết (F3) ⇒ không có giá trị để test.
- **SLA §4.3:** "khiếu nại chất lượng — **xử lý trong ngày**", "ngoài giờ — phản hồi **đầu giờ sáng hôm sau**" — ai đo? Không có FR nào đo SLA compliance, dù SM-4 tuyên bố validate nó.
- **FR-1:** "≤ 20 giây" — *đây* mới là testable đúng nghĩa. Dùng nó làm chuẩn cho các FR khác.

**Fix:** Mỗi Consequence gắn nhãn (testable) phải có số hoặc điều kiện boolean. "Gần như tức thì" → "≤ 5s p95 trong giờ". "Không chắc chắn" → liệt kê tín hiệu cụ thể (intent ngoài whitelist kịch bản → leo thang). "Nguyên ý" → quy tắc cứng: nội dung lâm sàng gửi nguyên văn (F2).

---

### F6 — [HIGH] Không có moat, và PRD tự thú nhận điều đó rồi đi tiếp.

**Đòn:** Open Q4 hỏi thẳng "Moat dài hạn nằm ở đâu?" và §9 assumptions ghi "Lợi thế cạnh tranh nằm ở tốc độ thực thi + hiểu nghiệp vụ dược, không phải công nghệ độc quyền". Dịch ra: **không có moat kỹ thuật.** Toàn bộ stack (n8n + LLM + Baserow + plugin openzalo công khai trên GitHub) ai cũng ráp được. Kịch bản 6 nhóm là tài sản giá trị nhất nhưng nó là một file markdown 746 dòng — copy trong một buổi chiều.

Tệ hơn: chính việc dựa trên **automation Zalo cá nhân không chính thức** vừa là rủi ro chết người (F3) *vừa* là lý do khiến đối thủ nghiêm túc (hoặc chính Zalo qua OA chính thức) dễ vượt mặt — họ làm hợp pháp/ổn định hơn. "Tốc độ thực thi" là moat của người đến trước trong thị trường *không ai thèm*, không phải của người dẫn đầu thị trường lớn.

**Vì sao high:** Không phải lỗi tài liệu — là lỗi chiến lược mà tài liệu *biết* nhưng để ngỏ. Nếu vào sớm chỉ để chứng minh thị trường rồi bị copy, thì 10 nhà thuốc (SM-2) là đỉnh chứ không phải khởi đầu.

**Fix:** Trả lời Q4 thành chiến lược cụ thể trước khi scale: (a) hiệu ứng dữ liệu — kịch bản tự cải thiện theo kết quả thật (compliance/retention) tạo lợi thế tích lũy; (b) khóa quan hệ/phân phối — hợp đồng với chuỗi/hiệp hội nhà thuốc; (c) chuyển sang kênh chính thức (OA/đối tác Zalo) sớm để biến điểm yếu pháp lý thành rào cản gia nhập. "Hiểu nghiệp vụ dược" một mình không phải moat.

---

### F7 — [MED] Pricing & dung lượng gói xây trên số gốc "không lưu được". Toàn bộ kinh tế đơn vị là phỏng đoán.

**Đòn:** Addendum §3 thừa nhận bảng token/tin chính xác (session S25) **không truy xuất được** và cần Tinsu cung cấp lại. Hệ quả: 399k/tháng cho ≤1.000 tin được "neo theo chi phí token thực" nhưng *không ai có chi phí token thực*. Biên độ dung lượng dao động **10 lần** (~30-50 khách nếu nhiều mãn tính, ~300-500 nếu nhẹ). Một nhà thuốc Trúc Tâm với nhiều khách Nhóm 1 (mãn tính, 3 tin/ngày = ~90 tin/khách/tháng — addendum nói ~20-30 nhưng rate limit cho phép tới 90) chạm trần 1.000 tin với chỉ **~11 khách**. Gói "phục vụ 300-500 khách" sụp xuống còn hai chữ số khi gặp đúng tập khách mà sản phẩm hứa phục vụ tốt nhất (mãn tính).

**Vì sao med (sát high):** Không giết khách như F1-F3, nhưng giết mô hình kinh doanh âm thầm: hoặc lỗ token, hoặc nhà thuốc mãn tính chạm trần trong 2 tuần và thấy sản phẩm "hết tin" → churn (chống lại SM-1).

**Fix:** Đóng Q1 *trước* khi báo giá cho nhà thuốc thứ hai. Mô hình hóa worst-case Nhóm 1 (dùng rate limit thật, không dùng ước lượng lạc quan). Cân nhắc giá theo số khách thay vì trần tin, vì trần tin trừng phạt đúng nhóm khách giá trị nhất.

---

### F8 — [MED] FR-13 (giám sát phiên) + phụ thuộc DOM web Zalo là điểm chết đơn lẻ không có dự phòng vận hành.

**Đòn:** Addendum §1 thừa nhận automation chạy trên **DOM/giao diện web Zalo qua plugin GitHub bên thứ ba** — "Zalo đổi UI có thể làm hỏng automation" (R4, mức Trung bình-cao). FR-13 chỉ *phát hiện và cảnh báo*. Nó không tự phục hồi. Khi Zalo đẩy update UI (có thể bất cứ lúc nào, không báo trước), **mọi nhà thuốc cùng chết cùng lúc** (đều dùng cùng plugin) cho tới khi Tinsu vá tay. Trong thời gian đó: tin Nhóm 1 không gửi (khách mãn tính lỡ nhắc thuốc), ca relay không tới dược sĩ (F1 trở nên tệ hơn). "Không mất tin âm thầm" tốt, nhưng tin xếp hàng trong lúc khách đang cần real-time thì cũng như mất.

**Fix:** Định nghĩa MTTR mục tiêu cho lỗi automation và một runbook khôi phục. Cân nhắc pin phiên bản plugin + canary một tài khoản test để bắt UI break *trước* khi nó chạm khách thật. Đẩy nhanh lộ trình kênh chính thức (OA) cho ít nhất luồng quan trọng (relay/cảnh báo) thay vì để toàn bộ trên kênh giòn.

---

## TÓM TẮT MỨC ĐỘ

| # | Finding | Mức |
|---|---------|-----|
| F1 | Relay FR-9 không timeout/fallback — khách nguy hiểm treo im lặng | CRITICAL |
| F2 | Race condition relay + map sai phương án + paraphrase sai liều | CRITICAL |
| F3 | Chống khóa Zalo dựa trên ngưỡng chưa kiểm chứng; thiếu report/template/fingerprint; không có kế hoạch B trong v1 | CRITICAL |
| F4 | Lừa dối khách (persona = tên người thật) + tải vận hành liên tục không scale | HIGH |
| F5 | Nhiều FR untestable ("gần như tức thì", "nguyên ý", "không chắc chắn") | HIGH |
| F6 | Không có moat — PRD tự thú nhận rồi để ngỏ | HIGH |
| F7 | Pricing/dung lượng xây trên số gốc đã mất; worst-case Nhóm 1 sụp gói | MED |
| F8 | Phụ thuộc DOM web Zalo = single point of failure, FR-13 chỉ cảnh báo không tự phục hồi | MED |

**Chốt:** Đóng F1, F2, F3 trước bất kỳ go-live nào có khách thật. F4-F6 phải có câu trả lời trước khi scale qua nhà thuốc thứ hai. Risk register hiện tại liệt kê đúng rủi ro nhưng nhầm "đã liệt kê" với "đã giảm thiểu" — đó là lỗ hổng tư duy nguy hiểm nhất xuyên suốt tài liệu.
