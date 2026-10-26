import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDeliveryHandler } from "../../../../lib/email/handler";
import { readDeliveryConfig } from "../../../../lib/email/config";
import { sendResend, verifyTurnstile } from "../../../../lib/email/providers";

export const runtime = "nodejs";
export const maxDuration = 30;
export const POST = createDeliveryHandler("guide", {
  config: readDeliveryConfig, verify: verifyTurnstile, send: sendResend,
  guide: () => readFile(join(process.cwd(), "output/pdf/etf-od-nuly.pdf")),
});
