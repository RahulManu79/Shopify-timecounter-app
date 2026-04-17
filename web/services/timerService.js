import Timer from "../models/Timer.js";
import {
  UPDATABLE_FIELDS,
  PATTERNS,
  TIMER_TYPES,
  TARGET_TYPES,
} from "../constants/index.js";
import { NotFoundError } from "../middleware/errorHandler.js";

/**
 * Extract numeric ID from a Shopify GID string.
 * "gid://shopify/Product/123" -> "123"
 */
function extractNumericId(gid) {
  if (!gid) return "";
  const match = String(gid).match(PATTERNS.NUMERIC_SUFFIX);
  return match ? match[1] : String(gid);
}

class TimerService {
  // ── Admin CRUD ──

  async listByShop(shop) {
    return Timer.find({ shop }).sort({ createdAt: -1 });
  }

  async getById(id, shop) {
    const timer = await Timer.findOne({ _id: id, shop });
    if (!timer) throw new NotFoundError("Timer");
    return timer;
  }

  async create(shop, data) {
    const timer = new Timer({ ...data, shop });
    await timer.save();
    return timer;
  }

  async update(id, shop, data) {
    const timer = await Timer.findOne({ _id: id, shop });
    if (!timer) throw new NotFoundError("Timer");

    for (const field of UPDATABLE_FIELDS) {
      if (data[field] !== undefined) {
        timer[field] = data[field];
      }
    }

    await timer.save();
    return timer;
  }

  async delete(id, shop) {
    const timer = await Timer.findOneAndDelete({ _id: id, shop });
    if (!timer) throw new NotFoundError("Timer");
    return timer;
  }

  async toggle(id, shop) {
    const timer = await Timer.findOne({ _id: id, shop });
    if (!timer) throw new NotFoundError("Timer");

    timer.isActive = !timer.isActive;
    await timer.save();
    return timer;
  }

  async deleteAllByShop(shop) {
    return Timer.deleteMany({ shop });
  }

  // ── Storefront ──

  async getActiveTimersForStorefront(shop, productId, collectionIds) {
    const now = new Date();

    // Build targeting conditions for DB-level filtering
    const targetingConditions = [{ targetType: TARGET_TYPES.ALL }];

    if (productId) {
      const numericId = extractNumericId(productId);
      targetingConditions.push({
        targetType: TARGET_TYPES.SPECIFIC_PRODUCTS,
        $or: [
          { targetProductIds: productId },
          { targetProductIds: `gid://shopify/Product/${numericId}` },
        ],
      });
    }

    if (collectionIds.length > 0) {
      const normalizedIds = collectionIds.flatMap((id) => {
        const numericId = extractNumericId(id);
        return [id, `gid://shopify/Collection/${numericId}`];
      });
      targetingConditions.push({
        targetType: TARGET_TYPES.SPECIFIC_COLLECTIONS,
        targetCollectionIds: { $in: normalizedIds },
      });
    }

    const timers = await Timer.find({
      shop,
      isActive: true,
      $and: [
        {
          $or: [
            {
              timerType: TIMER_TYPES.FIXED,
              startDate: { $lte: now },
              endDate: { $gt: now },
            },
            { timerType: TIMER_TYPES.EVERGREEN },
          ],
        },
        { $or: targetingConditions },
      ],
    })
      .select("timerType endDate evergreenDuration style")
      .lean();

    // Shape response for widget — minimal payload
    return timers.map((t) => ({
      id: t._id,
      type: t.timerType,
      endDate: t.timerType === TIMER_TYPES.FIXED ? t.endDate : null,
      duration: t.timerType === TIMER_TYPES.EVERGREEN ? t.evergreenDuration : null,
      style: t.style,
    }));
  }

  async trackImpression(timerId, shop) {
    await Timer.findOneAndUpdate(
      { _id: timerId, shop },
      { $inc: { impressions: 1 } }
    );
  }
}

// Export singleton
export default new TimerService();
