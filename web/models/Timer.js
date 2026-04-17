import mongoose from "mongoose";
import {
  TIMER_TYPE_VALUES,
  TARGET_TYPE_VALUES,
  POSITION_VALUES,
  SIZE_VALUES,
  URGENCY_EFFECT_VALUES,
  LIMITS,
  STYLE_DEFAULTS,
  TIMER_TYPES,
} from "../constants/index.js";

const timerSchema = new mongoose.Schema(
  {
    shop: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: LIMITS.TITLE_MAX,
    },
    timerType: {
      type: String,
      enum: TIMER_TYPE_VALUES,
      required: true,
    },
    startDate: {
      type: Date,
      required: function () {
        return this.timerType === TIMER_TYPES.FIXED;
      },
    },
    endDate: {
      type: Date,
      required: function () {
        return this.timerType === TIMER_TYPES.FIXED;
      },
    },
    evergreenDuration: {
      type: Number,
      min: LIMITS.DURATION_MIN,
      max: LIMITS.DURATION_MAX,
      required: function () {
        return this.timerType === TIMER_TYPES.EVERGREEN;
      },
    },
    targetType: {
      type: String,
      enum: TARGET_TYPE_VALUES,
      default: "all",
    },
    targetProductIds: [{ type: String }],
    targetCollectionIds: [{ type: String }],
    description: {
      type: String,
      trim: true,
      maxlength: LIMITS.DESCRIPTION_MAX,
      default: "",
    },
    style: {
      backgroundColor: { type: String, default: STYLE_DEFAULTS.backgroundColor },
      textColor: { type: String, default: STYLE_DEFAULTS.textColor },
      accentColor: { type: String, default: STYLE_DEFAULTS.accentColor },
      position: {
        type: String,
        enum: POSITION_VALUES,
        default: STYLE_DEFAULTS.position,
      },
      size: {
        type: String,
        enum: SIZE_VALUES,
        default: STYLE_DEFAULTS.size,
      },
      urgencyEffect: {
        type: String,
        enum: URGENCY_EFFECT_VALUES,
        default: STYLE_DEFAULTS.urgencyEffect,
      },
      displayText: {
        type: String,
        default: STYLE_DEFAULTS.displayText,
        maxlength: LIMITS.DISPLAY_TEXT_MAX,
      },
      urgencyThresholdMinutes: {
        type: Number,
        default: STYLE_DEFAULTS.urgencyThresholdMinutes,
        min: LIMITS.URGENCY_THRESHOLD_MIN,
      },
      showLabels: { type: Boolean, default: STYLE_DEFAULTS.showLabels },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
timerSchema.index({ shop: 1, isActive: 1 });
timerSchema.index({ shop: 1, targetType: 1 });

// Virtual for computed status
timerSchema.virtual("status").get(function () {
  if (!this.isActive) return "inactive";
  if (this.timerType === TIMER_TYPES.EVERGREEN) return "active";

  const now = new Date();
  if (now < this.startDate) return "scheduled";
  if (now > this.endDate) return "expired";
  return "active";
});

timerSchema.set("toJSON", { virtuals: true });
timerSchema.set("toObject", { virtuals: true });

const Timer = mongoose.model("Timer", timerSchema);

export default Timer;
