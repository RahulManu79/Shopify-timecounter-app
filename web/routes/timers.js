import { Router } from "express";
import {
  validateBody,
  validateObjectId,
  createTimerSchema,
  updateTimerSchema,
} from "../middleware/validate.js";
import {
  listTimers,
  getTimer,
  createTimer,
  updateTimer,
  deleteTimer,
  toggleTimer,
} from "../controllers/timerController.js";

const router = Router();

router.get("/", listTimers);
router.get("/:id", validateObjectId, getTimer);
router.post("/", validateBody(createTimerSchema), createTimer);
router.put("/:id", validateObjectId, validateBody(updateTimerSchema), updateTimer);
router.delete("/:id", validateObjectId, deleteTimer);
router.post("/:id/toggle", validateObjectId, toggleTimer);

export default router;
