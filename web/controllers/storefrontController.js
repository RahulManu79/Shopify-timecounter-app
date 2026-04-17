import timerService from "../services/timerService.js";
import { CACHE } from "../constants/index.js";

export async function getTimers(req, res, next) {
  try {
    const { shop, productId, collectionIds: rawCollectionIds } = req.query;
    const collectionIds = rawCollectionIds ? rawCollectionIds.split(",") : [];

    const timers = await timerService.getActiveTimersForStorefront(
      shop,
      productId,
      collectionIds
    );

    res.set(
      "Cache-Control",
      `public, max-age=${CACHE.STOREFRONT_MAX_AGE}, s-maxage=${CACHE.STOREFRONT_MAX_AGE}`
    );
    res.json({ success: true, timers });
  } catch (err) {
    next(err);
  }
}

export async function trackImpression(req, res, next) {
  try {
    const { timerId, shop } = req.body;
    await timerService.trackImpression(timerId, shop);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
