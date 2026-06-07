#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <pharmacy_slug>" >&2
  echo "  Prints warm-up plan and suggested env vars for a new Zalo account." >&2
  echo "  Does NOT send any messages — actual sending via POST /send." >&2
  exit 1
fi

SLUG="$1"
NOW=$(date +%s)

echo "=== Warm-up plan for pharmacy: ${SLUG} ==="
echo ""
printf "%-12s | %-10s | %s\n" "Giai đoạn" "Tin/ngày" "Thời gian"
printf "%-12s-+-%-10s-+-%s\n" "------------" "----------" "----------"
printf "%-12s | %-10s | %s\n" "Tuần 1"     "5"         "Ngày 1–7"
printf "%-12s | %-10s | %s\n" "Tuần 2"     "15"        "Ngày 8–14"
printf "%-12s | %-10s | %s\n" "Tuần 3"     "30"        "Ngày 15–21"
printf "%-12s | %-10s | %s\n" "Tuần 4+"    "50"        "Ngày 22+"
echo ""
echo "=== Env vars gợi ý ==="
echo ""

W1_END_MS=$(( (NOW + 7  * 86400) * 1000 ))
W2_END_MS=$(( (NOW + 14 * 86400) * 1000 ))
W3_END_MS=$(( (NOW + 21 * 86400) * 1000 ))

echo "# Giai đoạn 1 — Tuần 1 (5 tin/ngày, hết hạn sau 7 ngày):"
echo "WARMUP_DAILY_CAP=5"
echo "WARMUP_UNTIL_EPOCH_MS=${W1_END_MS}"
echo ""
echo "# Giai đoạn 2 — Tuần 2 (15 tin/ngày, hết hạn sau 14 ngày):"
echo "WARMUP_DAILY_CAP=15"
echo "WARMUP_UNTIL_EPOCH_MS=${W2_END_MS}"
echo ""
echo "# Giai đoạn 3 — Tuần 3 (30 tin/ngày, hết hạn sau 21 ngày):"
echo "WARMUP_DAILY_CAP=30"
echo "WARMUP_UNTIL_EPOCH_MS=${W3_END_MS}"
echo ""
echo "# Giai đoạn đầy đủ — Tuần 4+ (50 tin/ngày, tắt warm-up):"
echo "# Xoá hoặc unset WARMUP_UNTIL_EPOCH_MS để dùng trần đầy đủ"
echo "DAILY_SEND_CAP=50"
echo ""
echo "NOTE: Script này CHỈ in kế hoạch và env vars. KHÔNG tự gửi tin."
echo "      Gửi thật: POST /send qua zalo-bridge."
