import { Router } from "express";
import { verifyAppProxyHmac } from "../middleware/hmac.js";
import {
  validateQuery,
  validateBody,
  validateObjectId,
  storefrontQuerySchema,
  impressionSchema,
} from "../middleware/validate.js";
import {
  getTimers,
  trackImpression,
} from "../controllers/storefrontController.js";

const router = Router();

// HMAC verification for App Proxy security
router.use(verifyAppProxyHmac);

router.get("/timers", validateQuery(storefrontQuerySchema), getTimers);
router.post("/impression", validateBody(impressionSchema), trackImpression);

export default router;
