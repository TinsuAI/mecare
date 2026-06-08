# Spike Report: Multi-Tenant Zalo ↔ OpenClaw (G6)

## Kết Luận

**✅ GO**

| Metric | Giá trị |
|--------|---------|
| `isolation_rate` | 1.00 |
| `cross_tenant_bleed_count` | 0 |
| Checks passed | 11/11 |
| Run mode | stub |
| Commit | `72cbd62` |

GO condition: `isolation_rate === 1.0` VÀ `cross_tenant_bleed_count === 0`

## Kết Luận openzca Session Model

**openzca hỗ trợ multi-session trong 1 process: NO**

- Phiên bản kiểm tra: zca-js@3.x (underlying library của openzca)
- zca-js tạo đối tượng `Zalo` — mỗi instance = 1 session (1 số điện thoại)
- openzca CLI = 1 process = 1 session by design
- Kỹ thuật: N instances zca-js CÓ THỂ chạy trong 1 Node.js process nhưng không có isolation thật (shared memory, 1 crash = cả process)
- **Giới hạn spike này**: test in-memory `Map<pharmacy_id, …>` isolation; KHÔNG test per-process openzca isolation thật (Epic 2+)

## Kiến Trúc Đề Xuất (Epic 2+)

```
OpenClaw (1 instance)
  └── openzalo channel plugin
        └── zalo-bridge supervisor
              ├── openzca process → tenants/pharmacy_001/ (session state)
              ├── openzca process → pharmacy_002/ (session state)
              └── openzca process → tenants/<slug>/ (1 per tenant)
```

- 1 openzca process per tenant, state dir riêng `zalo-bridge/tenants/<slug>/`
- 1 process crash → supervisor restart chỉ process đó; tenant khác KHÔNG ảnh hưởng (NFR-6)
- OpenClaw route message theo `pharmacy_id` → đúng openzca process endpoint (AR-3)
- Mỗi `pharmacy_id` là routing key bất biến (AR-3: phân vùng mọi bảng + mọi message)

## Chi Tiết Kịch Bản

### Kịch bản 1 — Message Routing Isolation (AC1)

| | Check |
|--|-------|
| ✅ | pharmacy_001 nhận MSG_A_001 |
| ✅ | pharmacy_001 KHÔNG nhận MSG_B_002 (no cross-tenant bleed) |
| ✅ | pharmacy_002 nhận MSG_B_002 |
| ✅ | pharmacy_002 KHÔNG nhận MSG_A_001 (no cross-tenant bleed) |
| ✅ | session_id pharmacy_001 = 'pharmacy_001' (định danh riêng) |
| ✅ | session_id pharmacy_002 = 'pharmacy_002' (định danh riêng) |

### Kịch bản 2 — Session Fault Isolation / NFR-6 (AC2)

| | Check |
|--|-------|
| ✅ | pharmacy_001 status = 'crashed' sau crash() |
| ✅ | pharmacy_002 vẫn 'active' sau crash pharmacy_001 (NFR-6) |
| ✅ | pharmacy_002 nhận/gửi tin bình thường sau crash |
| ✅ | event session.lost emit với pharmacy_id pharmacy_001 (AR-8) |
| ✅ | payload session.lost có pharmacy_id + session_id + ts_iso (AR-8) |
