import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import TimerForm from "../components/TimerForm";

// ── Mocks ──

// Mock useAppBridge
vi.mock("@shopify/app-bridge-react", () => ({
  useAppBridge: () => ({
    resourcePicker: vi.fn().mockResolvedValue([]),
  }),
  TitleBar: ({ children }) => <div data-testid="title-bar">{children}</div>,
}));

// Mock useAuthenticatedFetch
const mockFetch = vi.fn();
vi.mock("../hooks/useAuthenticatedFetch", () => ({
  useAuthenticatedFetch: () => mockFetch,
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderForm(props = {}) {
  return render(
    <AppProvider i18n={enTranslations}>
      <BrowserRouter>
        <TimerForm {...props} />
      </BrowserRouter>
    </AppProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────
//  Rendering
// ──────────────────────────────────────

describe("TimerForm rendering", () => {
  it("renders create mode by default", () => {
    renderForm();
    expect(screen.getByText("Timer Details")).toBeTruthy();
    expect(screen.getByText("Create timer")).toBeTruthy();
  });

  it("renders all form sections", () => {
    renderForm();
    expect(screen.getByText("Timer Details")).toBeTruthy();
    expect(screen.getByText("Targeting")).toBeTruthy();
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Preview")).toBeTruthy();
  });

  it("shows date fields for fixed timer type", () => {
    renderForm();
    expect(screen.getByLabelText("Start date")).toBeTruthy();
    expect(screen.getByLabelText("End date")).toBeTruthy();
  });

  it("shows preview with default display text", () => {
    renderForm();
    // The preview section renders "Sale ends in:" as default display text
    const matches = screen.getAllByText("Sale ends in:");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

// ──────────────────────────────────────
//  Validation
// ──────────────────────────────────────

describe("TimerForm validation", () => {
  it("shows error when title is empty on submit", async () => {
    renderForm();

    const createButton = screen.getByText("Create timer");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeTruthy();
    });

    // Should NOT call fetch
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error when end date is before start date", async () => {
    renderForm();

    // Fill title
    const titleInput = screen.getByLabelText("Timer name *");
    fireEvent.change(titleInput, { target: { value: "Test Timer" } });

    // Set dates (end before start)
    const startInput = screen.getByLabelText("Start date");
    const endInput = screen.getByLabelText("End date");
    fireEvent.change(startInput, { target: { value: "2030-01-02T00:00" } });
    fireEvent.change(endInput, { target: { value: "2030-01-01T00:00" } });

    fireEvent.click(screen.getByText("Create timer"));

    await waitFor(() => {
      expect(
        screen.getByText("End date must be after start date")
      ).toBeTruthy();
    });
  });
});

// ──────────────────────────────────────
//  Form submission
// ──────────────────────────────────────

describe("TimerForm submission", () => {
  it("calls API and navigates on successful create", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({ success: true, timer: { _id: "123" } }),
    });

    renderForm();

    // Fill required fields
    const titleInput = screen.getByLabelText("Timer name *");
    fireEvent.change(titleInput, { target: { value: "Test Timer" } });

    const startInput = screen.getByLabelText("Start date");
    const endInput = screen.getByLabelText("End date");
    fireEvent.change(startInput, { target: { value: "2030-01-01T00:00" } });
    fireEvent.change(endInput, { target: { value: "2030-01-02T00:00" } });

    fireEvent.click(screen.getByText("Create timer"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("displays server-side validation errors", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: false,
          errors: [{ field: "title", message: "Title already exists" }],
        }),
    });

    renderForm();

    const titleInput = screen.getByLabelText("Timer name *");
    fireEvent.change(titleInput, { target: { value: "Dup" } });

    const startInput = screen.getByLabelText("Start date");
    const endInput = screen.getByLabelText("End date");
    fireEvent.change(startInput, { target: { value: "2030-01-01T00:00" } });
    fireEvent.change(endInput, { target: { value: "2030-01-02T00:00" } });

    fireEvent.click(screen.getByText("Create timer"));

    await waitFor(() => {
      expect(screen.getByText("Title already exists")).toBeTruthy();
    });
  });
});

// ──────────────────────────────────────
//  Edit mode
// ──────────────────────────────────────

describe("TimerForm edit mode", () => {
  it("fetches timer data and shows Save Changes button", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          timer: {
            _id: "abc123",
            title: "Existing Timer",
            description: "",
            timerType: "fixed",
            startDate: "2030-01-01T00:00:00Z",
            endDate: "2030-01-02T00:00:00Z",
            targetType: "all",
            targetProductIds: [],
            targetCollectionIds: [],
            style: {},
            isActive: true,
          },
        }),
    });

    renderForm({ timerId: "abc123" });

    await waitFor(() => {
      expect(screen.getByText("Save Changes")).toBeTruthy();
      expect(screen.getByDisplayValue("Existing Timer")).toBeTruthy();
    });
  });
});
