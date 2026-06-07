import { createHash } from "node:crypto";

export type MessageStatus = "pending" | "sent" | "failed" | "queued";

export function makeCustomerRef(pharmacyId: string, customerPhone: string): string {
  return createHash("sha256").update(`${pharmacyId}:${customerPhone}`).digest("hex").slice(0, 16);
}

function baserowBase() {
  return {
    url: (process.env.BASEROW_URL ?? "http://baserow:80").replace(/\/$/, ""),
    token: process.env.BASEROW_TOKEN ?? "",
    tableId: process.env.MESSAGES_TABLE_ID ?? "",
  };
}

export async function createMessageRecord(params: {
  message_id: string;
  pharmacy_id: string;
  customer_phone: string;
  content: string;
}): Promise<number | null> {
  const { url, token, tableId } = baserowBase();
  try {
    const resp = await fetch(
      `${url}/api/database/rows/table/${tableId}/?user_field_names=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({
          pharmacy_id: params.pharmacy_id,
          customer_ref: makeCustomerRef(params.pharmacy_id, params.customer_phone),
          message_id: params.message_id,
          type: "proactive",
          content: params.content,
          status: "pending",
          ts: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!resp.ok) {
      console.error("[messages-client] CREATE_FAILED", params.message_id, resp.status);
      return null;
    }
    const data = await resp.json();
    return (data as { id: number }).id;
  } catch (err) {
    console.error("[messages-client] CREATE_ERROR", params.message_id, err);
    return null;
  }
}

export async function updateMessageStatus(
  rowId: number,
  status: MessageStatus,
  errorText?: string
): Promise<void> {
  const { url, token, tableId } = baserowBase();
  try {
    await fetch(
      `${url}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({
          status,
          ...(errorText !== undefined ? { error: errorText } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
  } catch {
    console.error("[messages-client] UPDATE_FAILED", rowId, status);
  }
}

export async function queueDeadLetter(
  rowId: number | null,
  params: {
    message_id: string;
    pharmacy_id: string;
    customer_phone: string;
    content: string;
    error_text: string;
  }
): Promise<void> {
  console.error("[messages-client] DEAD_LETTER", params.message_id, params.error_text);
  if (rowId !== null) {
    await updateMessageStatus(rowId, "queued", params.error_text);
  } else {
    const newId = await createMessageRecord({
      message_id: params.message_id,
      pharmacy_id: params.pharmacy_id,
      customer_phone: params.customer_phone,
      content: params.content,
    });
    if (newId !== null) {
      await updateMessageStatus(newId, "queued", params.error_text);
    }
  }
}
