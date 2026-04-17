import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "../middleware/errorHandler.js";

describe("Custom Error Classes", () => {
  it("AppError should have statusCode and isOperational", () => {
    const err = new AppError("Something went wrong", 400);
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("NotFoundError should default to 404", () => {
    const err = new NotFoundError("Timer");
    expect(err.message).toBe("Timer not found");
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  it("NotFoundError should use default resource name", () => {
    const err = new NotFoundError();
    expect(err.message).toBe("Resource not found");
  });

  it("ValidationError should be 400 with errors array", () => {
    const errors = [{ field: "title", message: "Required" }];
    const err = new ValidationError("Validation failed", errors);
    expect(err.statusCode).toBe(400);
    expect(err.errors).toEqual(errors);
    expect(err.isOperational).toBe(true);
  });
});
