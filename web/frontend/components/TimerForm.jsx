import { useCallback, useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  Spinner,
  Checkbox,
  Text,
  Stack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

const POSITION_OPTIONS = [
  { label: "Above title", value: "above_title" },
  { label: "Below title", value: "below_title" },
  { label: "Below price", value: "below_price" },
  { label: "Below Add to Cart", value: "below_add_to_cart" },
];

const SIZE_OPTIONS = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
];

const URGENCY_EFFECT_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Color pulse", value: "color_pulse" },
  { label: "Flash", value: "flash" },
  { label: "Shake", value: "shake" },
];

const TARGET_OPTIONS = [
  { label: "All products", value: "all" },
  { label: "Specific products", value: "specific_products" },
  { label: "Specific collections", value: "specific_collections" },
];

const TIMER_TYPE_OPTIONS = [
  { label: "Fixed (specific start/end dates)", value: "fixed" },
  { label: "Evergreen (per-visitor session timer)", value: "evergreen" },
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  timerType: "fixed",
  startDate: "",
  endDate: "",
  evergreenDuration: "60",
  targetType: "all",
  targetProductIds: [],
  targetCollectionIds: [],
  style: {
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    accentColor: "#FF6B35",
    position: "below_price",
    size: "medium",
    urgencyEffect: "color_pulse",
    displayText: "Sale ends in:",
    urgencyThresholdMinutes: "60",
    showLabels: true,
  },
  isActive: true,
};

const SIZE_SCALES = { small: 0.75, medium: 1, large: 1.3 };

function toLocalDatetime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TimerForm({ timerId }) {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const shopify = useAppBridge();
  const isEditing = Boolean(timerId);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);

  // Load existing timer for editing
  useEffect(() => {
    if (!isEditing) return;
    setLoading(true);
    fetch(`/api/timers/${timerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const t = data.timer;
          setForm({
            title: t.title,
            description: t.description || "",
            timerType: t.timerType,
            startDate: toLocalDatetime(t.startDate),
            endDate: toLocalDatetime(t.endDate),
            evergreenDuration: String(t.evergreenDuration || 60),
            targetType: t.targetType,
            targetProductIds: t.targetProductIds || [],
            targetCollectionIds: t.targetCollectionIds || [],
            style: {
              backgroundColor: t.style?.backgroundColor || "#000000",
              textColor: t.style?.textColor || "#FFFFFF",
              accentColor: t.style?.accentColor || "#FF6B35",
              position: t.style?.position || "below_price",
              size: t.style?.size || "medium",
              urgencyEffect: t.style?.urgencyEffect || "color_pulse",
              displayText: t.style?.displayText || "Sale ends in:",
              urgencyThresholdMinutes: String(
                t.style?.urgencyThresholdMinutes || 60
              ),
              showLabels:
                t.style?.showLabels !== undefined ? t.style.showLabels : true,
            },
            isActive: t.isActive,
          });
        } else {
          setError("Timer not found");
        }
      })
      .catch(() => setError("Failed to load timer"))
      .finally(() => setLoading(false));
  }, [timerId]);

  const updateForm = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const updateStyle = useCallback((field, value) => {
    setForm((prev) => ({
      ...prev,
      style: { ...prev.style, [field]: value },
    }));
  }, []);

  const openProductPicker = useCallback(async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
      });
      if (selected && selected.length > 0) {
        const ids = selected.map((p) => p.id);
        setForm((prev) => ({ ...prev, targetProductIds: ids }));
        setSelectedProducts(selected.map((p) => ({ id: p.id, title: p.title })));
      }
    } catch (err) {
      // User cancelled — do nothing
    }
  }, [shopify]);

  const openCollectionPicker = useCallback(async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "collection",
        multiple: true,
        action: "select",
      });
      if (selected && selected.length > 0) {
        const ids = selected.map((c) => c.id);
        setForm((prev) => ({ ...prev, targetCollectionIds: ids }));
        setSelectedCollections(selected.map((c) => ({ id: c.id, title: c.title })));
      }
    } catch (err) {
      // User cancelled — do nothing
    }
  }, [shopify]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setFieldErrors({});

    const errors = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (form.timerType === "fixed") {
      if (!form.startDate) errors.startDate = "Start date is required";
      if (!form.endDate) errors.endDate = "End date is required";
      if (
        form.startDate &&
        form.endDate &&
        new Date(form.endDate) <= new Date(form.startDate)
      ) {
        errors.endDate = "End date must be after start date";
      }
    }
    if (form.timerType === "evergreen") {
      const dur = parseInt(form.evergreenDuration);
      if (!dur || dur < 1 || dur > 10080)
        errors.evergreenDuration = "Duration must be 1–10080 minutes";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        startDate:
          form.timerType === "fixed"
            ? new Date(form.startDate).toISOString()
            : undefined,
        endDate:
          form.timerType === "fixed"
            ? new Date(form.endDate).toISOString()
            : undefined,
        evergreenDuration:
          form.timerType === "evergreen"
            ? parseInt(form.evergreenDuration)
            : undefined,
        style: {
          ...form.style,
          urgencyThresholdMinutes: parseInt(form.style.urgencyThresholdMinutes),
        },
      };

      const url = isEditing ? `/api/timers/${timerId}` : "/api/timers";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        navigate("/");
      } else if (data.errors) {
        const errs = {};
        data.errors.forEach((e) => {
          errs[e.field] = e.message;
        });
        setFieldErrors(errs);
      } else {
        setError(data.error || "Failed to save timer");
      }
    } catch (err) {
      setError("Failed to save timer");
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, timerId, fetch, navigate]);

  if (loading) {
    return (
      <Page>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  const scale = SIZE_SCALES[form.style.size] || 1;

  return (
    <Page
      title={isEditing ? "Edit Timer" : "Create New Timer"}
      backAction={{ onAction: () => navigate("/") }}
    >
      <TitleBar title={isEditing ? "Edit Timer" : "Create New Timer"} />

      <Layout>
        {error && (
          <Layout.Section>
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </Layout.Section>
        )}

        {/* Basic Settings */}
        <Layout.Section>
          <Card>
            <Stack vertical spacing="loose">
              <Text variant="headingMd" as="h2">
                Timer Details
              </Text>
              <FormLayout>
                <TextField
                  label="Timer name *"
                  value={form.title}
                  onChange={(v) => updateForm("title", v)}
                  error={fieldErrors.title}
                  placeholder="Enter timer name"
                  autoComplete="off"
                />
                <Select
                  label="Timer Type"
                  options={TIMER_TYPE_OPTIONS}
                  value={form.timerType}
                  onChange={(v) => updateForm("timerType", v)}
                />
                {form.timerType === "fixed" && (
                  <FormLayout.Group>
                    <TextField
                      label="Start date"
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(v) => updateForm("startDate", v)}
                      error={fieldErrors.startDate}
                      autoComplete="off"
                    />
                    <TextField
                      label="End date"
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(v) => updateForm("endDate", v)}
                      error={fieldErrors.endDate}
                      autoComplete="off"
                    />
                  </FormLayout.Group>
                )}
                {form.timerType === "evergreen" && (
                  <TextField
                    label="Duration (minutes)"
                    type="number"
                    value={form.evergreenDuration}
                    onChange={(v) => updateForm("evergreenDuration", v)}
                    error={fieldErrors.evergreenDuration}
                    helpText="Timer resets for each new visitor. Max 10080 (7 days)."
                    autoComplete="off"
                  />
                )}
                <TextField
                  label="Promotion description"
                  value={form.description}
                  onChange={(v) => updateForm("description", v)}
                  placeholder="Enter promotion details"
                  multiline={3}
                  autoComplete="off"
                  maxLength={500}
                />
              </FormLayout>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Targeting */}
        <Layout.Section>
          <Card>
            <Stack vertical spacing="loose">
              <Text variant="headingMd" as="h2">
                Targeting
              </Text>
              <FormLayout>
                <Select
                  label="Apply timer to"
                  options={TARGET_OPTIONS}
                  value={form.targetType}
                  onChange={(v) => updateForm("targetType", v)}
                />
                {form.targetType === "specific_products" && (
                  <Stack vertical spacing="tight">
                    <Button onClick={() => openProductPicker()}>
                      Select Products
                    </Button>
                    {selectedProducts.length > 0 && (
                      <Text as="p" variant="bodySm" color="subdued">
                        Selected:{" "}
                        {selectedProducts.map((p) => p.title).join(", ")}
                      </Text>
                    )}
                    {form.targetProductIds.length > 0 &&
                      selectedProducts.length === 0 && (
                        <Text as="p" variant="bodySm" color="subdued">
                          {form.targetProductIds.length} product(s) selected
                        </Text>
                      )}
                  </Stack>
                )}
                {form.targetType === "specific_collections" && (
                  <Stack vertical spacing="tight">
                    <Button onClick={() => openCollectionPicker()}>
                      Select Collections
                    </Button>
                    {selectedCollections.length > 0 && (
                      <Text as="p" variant="bodySm" color="subdued">
                        Selected:{" "}
                        {selectedCollections.map((c) => c.title).join(", ")}
                      </Text>
                    )}
                    {form.targetCollectionIds.length > 0 &&
                      selectedCollections.length === 0 && (
                        <Text as="p" variant="bodySm" color="subdued">
                          {form.targetCollectionIds.length} collection(s)
                          selected
                        </Text>
                      )}
                  </Stack>
                )}
              </FormLayout>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Appearance */}
        <Layout.Section>
          <Card>
            <Stack vertical spacing="loose">
              <Text variant="headingMd" as="h2">
                Appearance
              </Text>
              <FormLayout>
                <FormLayout.Group>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={form.style.backgroundColor}
                      onChange={(e) =>
                        updateStyle("backgroundColor", e.target.value)
                      }
                      style={{
                        width: "60px",
                        height: "36px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={form.style.textColor}
                      onChange={(e) =>
                        updateStyle("textColor", e.target.value)
                      }
                      style={{
                        width: "60px",
                        height: "36px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Accent Color
                    </label>
                    <input
                      type="color"
                      value={form.style.accentColor}
                      onChange={(e) =>
                        updateStyle("accentColor", e.target.value)
                      }
                      style={{
                        width: "60px",
                        height: "36px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                </FormLayout.Group>
                <FormLayout.Group>
                  <Select
                    label="Timer size"
                    options={SIZE_OPTIONS}
                    value={form.style.size}
                    onChange={(v) => updateStyle("size", v)}
                  />
                  <Select
                    label="Timer position"
                    options={POSITION_OPTIONS}
                    value={form.style.position}
                    onChange={(v) => updateStyle("position", v)}
                  />
                </FormLayout.Group>
                <Select
                  label="Urgency notification"
                  options={URGENCY_EFFECT_OPTIONS}
                  value={form.style.urgencyEffect}
                  onChange={(v) => updateStyle("urgencyEffect", v)}
                />
                <TextField
                  label="Display Text"
                  value={form.style.displayText}
                  onChange={(v) => updateStyle("displayText", v)}
                  placeholder="Sale ends in:"
                  autoComplete="off"
                />
                <TextField
                  label="Urgency Threshold (minutes)"
                  type="number"
                  value={form.style.urgencyThresholdMinutes}
                  onChange={(v) => updateStyle("urgencyThresholdMinutes", v)}
                  helpText="Show urgency effect when this many minutes remain"
                  autoComplete="off"
                />
                <Checkbox
                  label="Show time unit labels (Days, Hours, Minutes, Seconds)"
                  checked={form.style.showLabels}
                  onChange={(v) => updateStyle("showLabels", v)}
                />
              </FormLayout>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Timer Preview */}
        <Layout.Section>
          <Card>
            <Stack vertical spacing="loose">
              <Text variant="headingMd" as="h2">
                Preview
              </Text>
              <div
                style={{
                  backgroundColor: form.style.backgroundColor,
                  color: form.style.textColor,
                  padding: `${16 * scale}px`,
                  borderRadius: "8px",
                  textAlign: "center",
                  fontFamily: "monospace",
                }}
              >
                <div
                  style={{
                    marginBottom: `${8 * scale}px`,
                    fontSize: `${14 * scale}px`,
                  }}
                >
                  {form.style.displayText}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: `${12 * scale}px`,
                    fontSize: `${28 * scale}px`,
                    fontWeight: "bold",
                  }}
                >
                  {["02", "14", "35", "48"].map((val, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          backgroundColor: form.style.accentColor,
                          color: form.style.textColor,
                          padding: `${8 * scale}px ${12 * scale}px`,
                          borderRadius: "6px",
                          minWidth: `${50 * scale}px`,
                        }}
                      >
                        {val}
                      </div>
                      {form.style.showLabels && (
                        <div
                          style={{
                            fontSize: `${10 * scale}px`,
                            marginTop: "4px",
                          }}
                        >
                          {["Days", "Hours", "Mins", "Secs"][i]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {form.style.urgencyEffect !== "none" && (
                  <div
                    style={{
                      marginTop: `${10 * scale}px`,
                      fontSize: `${13 * scale}px`,
                      fontWeight: 600,
                      color: form.style.accentColor,
                      animation:
                        form.style.urgencyEffect === "color_pulse"
                          ? "helixo-pulse 1.5s ease-in-out infinite"
                          : form.style.urgencyEffect === "flash"
                            ? "helixo-flash 0.8s ease-in-out infinite"
                            : form.style.urgencyEffect === "shake"
                              ? "helixo-shake 0.5s ease-in-out infinite"
                              : "none",
                    }}
                  >
                    Hurry! Almost over!
                  </div>
                )}
              </div>
              <style>{`
                @keyframes helixo-pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.4; }
                }
                @keyframes helixo-flash {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0; }
                }
                @keyframes helixo-shake {
                  0%, 100% { transform: translateX(0); }
                  25% { transform: translateX(-3px); }
                  75% { transform: translateX(3px); }
                }
              `}</style>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Active Toggle + Save */}
        <Layout.Section>
          <Stack distribution="trailing" spacing="tight">
            <Checkbox
              label="Timer is active"
              checked={form.isActive}
              onChange={(v) => updateForm("isActive", v)}
            />
            <Button onClick={() => navigate("/")}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={saving}>
              {isEditing ? "Save Changes" : "Create timer"}
            </Button>
          </Stack>
        </Layout.Section>
      </Layout>

    </Page>
  );
}
