import { createDeliveryHandler } from "../../../../lib/email/handler";
import { readDeliveryConfig } from "../../../../lib/email/config";
import { sendResend, verifyTurnstile } from "../../../../lib/email/providers";

export const runtime = "nodejs";
export const maxDuration = 30;
export const POST = createDeliveryHandler("report", {
  config: readDeliveryConfig, verify: verifyTurnstile, send: sendResend,
  guide: async () => { throw new Error("Not used for reports"); },
});
