import timerService from "../services/timerService.js";
import { HTTP } from "../constants/index.js";

export async function listTimers(req, res, next) {
  try {
    const shop = res.locals.shopify.session.shop;
    const timers = await timerService.listByShop(shop);
    res.json({ success: true, timers });
  } catch (err) {
    next(err);
  }
}

export async function getTimer(req, res, next) {
  try {
    const shop = res.locals.shopify.session.shop;
    const timer = await timerService.getById(req.params.id, shop);
    res.json({ success: true, timer });
  } catch (err) {
    next(err);
  }
}

export async function createTimer(req, res, next) {
  try {
    const shop = res.locals.shopify.session.shop;
    const timer = await timerService.create(shop, req.body);
    res.status(HTTP.CREATED).json({ success: true, timer });
  } catch (err) {
    next(err);
  }
}

export async function updateTimer(req, res, next) {
  try {
    const shop = res.locals.shopify.session.shop;
    const timer = await timerService.update(req.params.id, shop, req.body);
    res.json({ success: true, timer });
  } catch (err) {
    next(err);
  }
}

export async function deleteTimer(req, res, next) {
  try {
    const shop = res.locals.shopify.session.shop;
    await timerService.delete(req.params.id, shop);
    res.json({ success: true, message: "Timer deleted" });
  } catch (err) {
    next(err);
  }
}

export async function toggleTimer(req, res, next) {
  try {
    const shop = res.locals.shopify.session.shop;
    const timer = await timerService.toggle(req.params.id, shop);
    res.json({ success: true, timer });
  } catch (err) {
    next(err);
  }
}
