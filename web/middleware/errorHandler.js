import { HTTP } from "../constants/index.js";

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, HTTP.NOT_FOUND);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP.BAD_REQUEST);
    this.errors = errors;
  }
}

// Centralized error handler — mount as last middleware
export function errorHandler(err, _req, res, _next) {
  // Mongoose validation error
  if (err.name === "ValidationError" && err.errors && !err.isOperational) {
    const errors = Object.entries(err.errors).map(([field, e]) => ({
      field,
      message: e.message,
    }));
    return res
      .status(HTTP.BAD_REQUEST)
      .json({ success: false, errors });
  }

  // Mongoose CastError (bad ObjectId in query)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res
      .status(HTTP.BAD_REQUEST)
      .json({ success: false, error: "Invalid ID format" });
  }

  // Our custom AppError
  if (err.isOperational) {
    const response = { success: false, error: err.message };
    if (err.errors) response.errors = err.errors;
    return res.status(err.statusCode).json(response);
  }

  // Unexpected errors — log and return generic message
  console.error("Unhandled error:", err);
  res
    .status(HTTP.INTERNAL_SERVER_ERROR)
    .json({ success: false, error: "Internal server error" });
}
