# Data Governance — MeCare (NFR-5)

Tài liệu cơ chế **mã hóa at-rest** và **PII-min** cho schema Baserow nguồn sự thật (Story 1.2).

## 1. Mã hóa at-rest (NFR-5)

**Baserow KHÔNG có mã hóa per-field.** Toàn bộ dữ liệu (gồm PII sức khỏe: tên, SĐT,
thuốc, ghi chú tình trạng) nằm trong Postgres dùng chung. Vì vậy mã hóa at-rest enforce ở
**tầng hạ tầng self-host**, KHÔNG ở định nghĩa field Baserow.

> Anti-pattern: tạo field "encrypted" giả trong schema Baserow → sai. Schema 1.2 KHÔNG làm.

### Cơ chế hợp lệ (vận hành VPS — ngoài code repo)

| Lớp | Cơ chế | Ghi chú |
|---|---|---|
| Disk/volume host | **LUKS / dm-crypt** mã hóa full-disk hoặc volume chứa `pg_data` + `baserow_data` | Khuyến nghị tối thiểu cho VPS self-host |
| Postgres | TDE-equivalent (vd `pgcrypto` cho cột nhạy cảm) hoặc filesystem-level encryption của volume | Tùy chọn nâng cao |
| Backup | Backup `pg_data` phải mã hóa trước khi rời host (GPG/age) | Backup là đường rò PII phổ biến |

Docker volume liên quan (xem `docker-compose.yml`): `baserow_data`, `pg_data`.
Mã hóa volume là **việc cấu hình host** (LUKS khi provision VPS) — không dựng trong code repo.

### Checklist vận hành (chủ host làm khi deploy)
- [ ] Full-disk/volume encryption (LUKS) bật trên VPS trước khi `docker compose up`.
- [ ] Backup Postgres mã hóa at-rest + at-transit.
- [ ] Không expose Postgres ra public (đã enforce: compose chỉ network nội bộ `mecare`).

## 2. PII-min — ranh giới rò rỉ (NFR-5)

PII thật (tên/SĐT/thuốc/tình trạng) **chỉ sống trong Baserow self-host**. Ranh giới:

- **Ra-cloud-bound** (LLM OpenRouter, log ngoài): chỉ dùng `customer_ref` — token ẩn danh.
  Bảng `Messages` dùng `customer_ref`, **KHÔNG** `phone`/`full_name`.
- De-anonymize (`customer_ref` → khách thật) chỉ xảy ra ở `zalo-bridge` self-host.
- Schema **KHÔNG khai báo webhook/field export** đẩy PII ra ngoài Baserow self-host.

### Bảng & mức nhạy cảm
| Bảng | PII | Ra cloud? |
|---|---|---|
| `Customers` | tên, SĐT (cao) | KHÔNG |
| `Purchases` | thuốc khách (cao) | KHÔNG |
| `EscalationCases` | nội dung khách (cao) | KHÔNG (relay nội bộ qua mã ca) |
| `Messages` | `customer_ref` ẩn danh | CHỈ `customer_ref` |
| `MessageTemplates`/`FaqEntries` | kịch bản (không PII cá nhân) | nội dung approved |

## 3. Tenant isolation (NFR-6)
Mọi bảng nghiệp vụ (trừ `Pharmacies`) có FK `pharmacy_id`. Truy vấn/seed lọc theo
`pharmacy_id`. Tenant đầu tiên: Trúc Tâm (`pharmacy_slug=tructam`).

## References
- architecture.md#Authentication-Security-Data-Governance — NFR-5
- architecture.md#Format-Patterns — `customer_ref` ẩn danh, ISO-8601
- architecture.md#Multi-tenancy — `pharmacy_id` isolation NFR-6
- Story 1.2 — schema nguồn sự thật
