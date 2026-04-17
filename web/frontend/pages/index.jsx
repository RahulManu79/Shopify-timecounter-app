import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Page,
  Layout,
  Card,
  Badge,
  Button,
  IndexTable,
  Text,
  EmptyState,
  Banner,
  Spinner,
  ButtonGroup,
  Filters,
  ChoiceList,
  Tabs,
  Stack,
  ProgressBar,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

export default function DashboardPage() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [timers, setTimers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { id: "timers", content: "Timers", panelID: "timers-panel" },
    { id: "analytics", content: "Analytics", panelID: "analytics-panel" },
  ];

  const analytics = useMemo(() => {
    if (!timers.length) return null;

    const totalImpressions = timers.reduce((sum, t) => sum + (t.impressions || 0), 0);
    const activeTimers = timers.filter((t) => t.status === "active");
    const scheduledTimers = timers.filter((t) => t.status === "scheduled");
    const expiredTimers = timers.filter((t) => t.status === "expired");

    const sorted = [...timers].sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    const topTimer = sorted[0];
    const maxImpressions = topTimer?.impressions || 1;

    return {
      totalImpressions,
      totalTimers: timers.length,
      activeCount: activeTimers.length,
      scheduledCount: scheduledTimers.length,
      expiredCount: expiredTimers.length,
      topTimer,
      maxImpressions,
      sorted,
    };
  }, [timers]);

  const loadTimers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/timers");
      const data = await response.json();
      if (data.success) {
        setTimers(data.timers);
      } else {
        setError("Failed to load timers");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  useEffect(() => {
    loadTimers();
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!confirm("Are you sure you want to delete this timer?")) return;
      try {
        const response = await fetch(`/api/timers/${id}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.success) {
          setTimers((prev) => prev.filter((t) => t._id !== id));
        }
      } catch (err) {
        setError("Failed to delete timer");
      }
    },
    [fetch]
  );

  const handleToggle = useCallback(
    async (id) => {
      try {
        const response = await fetch(`/api/timers/${id}/toggle`, {
          method: "POST",
        });
        const data = await response.json();
        if (data.success) {
          setTimers((prev) =>
            prev.map((t) => (t._id === id ? data.timer : t))
          );
        }
      } catch (err) {
        setError("Failed to toggle timer");
      }
    },
    [fetch]
  );

  const getStatusBadge = (timer) => {
    const status = timer.status;
    const map = {
      active: { status: "success", label: "Active" },
      scheduled: { status: "info", label: "Scheduled" },
      expired: { status: "warning", label: "Expired" },
      inactive: { status: undefined, label: "Inactive" },
    };
    const badge = map[status] || map.inactive;
    return <Badge status={badge.status}>{badge.label}</Badge>;
  };

  const getTimerTypeLabel = (type) => {
    return type === "fixed" ? "Fixed" : "Evergreen";
  };

  const getTargetLabel = (timer) => {
    if (timer.targetType === "all") return "All products";
    if (timer.targetType === "specific_products")
      return `${timer.targetProductIds.length} product(s)`;
    if (timer.targetType === "specific_collections")
      return `${timer.targetCollectionIds.length} collection(s)`;
    return "\u2014";
  };

  const formatDate = (date) => {
    if (!date) return "\u2014";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredTimers = timers.filter((timer) => {
    const matchesSearch =
      !searchValue ||
      timer.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      (timer.description || "").toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus =
      statusFilter.length === 0 || statusFilter.includes(timer.status);
    return matchesSearch && matchesStatus;
  });

  const rowMarkup = filteredTimers.map((timer, index) => (
    <IndexTable.Row id={timer._id} key={timer._id} position={index}>
      <IndexTable.Cell>
        <div>
          <Text variant="bodyMd" fontWeight="bold">
            {timer.title}
          </Text>
          {timer.description && (
            <Text variant="bodySm" color="subdued">
              {timer.description}
            </Text>
          )}
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>{getStatusBadge(timer)}</IndexTable.Cell>
      <IndexTable.Cell>{getTimerTypeLabel(timer.timerType)}</IndexTable.Cell>
      <IndexTable.Cell>{getTargetLabel(timer)}</IndexTable.Cell>
      <IndexTable.Cell>
        {timer.timerType === "fixed"
          ? formatDate(timer.endDate)
          : `${timer.evergreenDuration} min`}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd">{timer.impressions || 0}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button size="slim" onClick={() => navigate(`/timers/${timer._id}`)}>
            Edit
          </Button>
          <Button size="slim" onClick={() => handleToggle(timer._id)}>
            {timer.isActive ? "Pause" : "Resume"}
          </Button>
          <Button
            size="slim"
            tone="critical"
            onClick={() => handleDelete(timer._id)}
          >
            Delete
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Expired", value: "expired" },
            { label: "Inactive", value: "inactive" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = statusFilter.length > 0
    ? [
        {
          key: "status",
          label: `Status: ${statusFilter.join(", ")}`,
          onRemove: () => setStatusFilter([]),
        },
      ]
    : [];

  // ── Analytics Tab ──
  const renderAnalyticsTab = () => {
    if (!analytics) {
      return (
        <Card>
          <EmptyState
            heading="No analytics yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Create timers and they will start collecting impression data.</p>
          </EmptyState>
        </Card>
      );
    }

    const statCards = [
      {
        label: "Total Impressions",
        value: analytics.totalImpressions.toLocaleString(),
        accent: "#2C6ECB",
      },
      {
        label: "Active",
        value: analytics.activeCount,
        sub: `of ${analytics.totalTimers} timers`,
        accent: "#23A26D",
      },
      {
        label: "Scheduled",
        value: analytics.scheduledCount,
        accent: "#6D7175",
      },
      {
        label: "Expired",
        value: analytics.expiredCount,
        accent: "#D97706",
      },
    ];

    return (
      <div>
        {/* Stat Cards Row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}>
          {statCards.map((card) => (
            <Card key={card.label} sectioned>
              <div style={{
                borderLeft: `3px solid ${card.accent}`,
                paddingLeft: "12px",
              }}>
                <Text variant="bodySm" color="subdued">{card.label}</Text>
                <div style={{ marginTop: "4px" }}>
                  <span style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    letterSpacing: "-0.5px",
                    color: "var(--p-color-text)",
                  }}>
                    {card.value}
                  </span>
                </div>
                {card.sub && (
                  <Text variant="bodySm" color="subdued">{card.sub}</Text>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Impressions Breakdown */}
        <Card sectioned>
          <div style={{ marginBottom: "16px" }}>
            <Text variant="headingSm" as="h3">Impressions by timer</Text>
          </div>

          {analytics.sorted.length === 0 ? (
            <Text variant="bodySm" color="subdued">No timer data available.</Text>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {analytics.sorted.map((timer, i) => {
                const pct = analytics.maxImpressions > 0
                  ? Math.round(((timer.impressions || 0) / analytics.maxImpressions) * 100)
                  : 0;
                const impressionCount = timer.impressions || 0;
                const isTop = i === 0 && impressionCount > 0;

                return (
                  <div key={timer._id} style={{
                    padding: isTop ? "12px" : "0",
                    background: isTop ? "rgba(44,110,203,0.04)" : "transparent",
                    borderRadius: isTop ? "8px" : "0",
                    borderBottom: !isTop && i < analytics.sorted.length - 1
                      ? "1px solid var(--p-color-border-subdued, #E1E3E5)"
                      : "none",
                    paddingBottom: !isTop ? "14px" : "12px",
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          width: "20px",
                          color: "#8C9196",
                          fontSize: "12px",
                          textAlign: "right",
                          flexShrink: 0,
                        }}>
                          {i + 1}.
                        </span>
                        <Text variant="bodyMd" fontWeight={isTop ? "bold" : "semibold"}>
                          {timer.title}
                        </Text>
                        {getStatusBadge(timer)}
                        {isTop && <Badge status="info">Top</Badge>}
                      </div>
                      <span style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "var(--p-color-text)",
                        marginLeft: "12px",
                        flexShrink: 0,
                      }}>
                        {impressionCount.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ paddingLeft: "28px" }}>
                      <ProgressBar progress={pct} size="small" />
                    </div>
                    <div style={{
                      paddingLeft: "28px",
                      marginTop: "4px",
                      display: "flex",
                      gap: "12px",
                    }}>
                      <Text variant="bodySm" color="subdued">
                        {timer.timerType === "fixed" ? "Fixed" : "Evergreen"}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        {getTargetLabel(timer)}
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ── Page Render ──
  return (
    <Page
      title="Countdown Timers"
      subtitle="Manage timers and track performance"
      primaryAction={{
        content: "Create timer",
        onAction: () => navigate("/timers/new"),
      }}
    >
      <TitleBar title="Countdown Timers">
        <button variant="primary" onClick={() => navigate("/timers/new")}>
          Create timer
        </button>
      </TitleBar>
      <Layout>
        {error && (
          <Layout.Section>
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          {loading ? (
            <Card sectioned>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px",
                }}
              >
                <Spinner size="large" />
              </div>
            </Card>
          ) : timers.length === 0 ? (
            <Card sectioned>
              <EmptyState
                heading="Create your first countdown timer"
                action={{
                  content: "Create Timer",
                  onAction: () => navigate("/timers/new"),
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Add countdown timers to your product pages to create urgency
                  and boost sales.
                </p>
              </EmptyState>
            </Card>
          ) : (
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ paddingTop: "16px" }}>
                {selectedTab === 0 ? (
                  <Card>
                    <div style={{ padding: "16px" }}>
                      <Filters
                        queryValue={searchValue}
                        queryPlaceholder="Search timers..."
                        onQueryChange={setSearchValue}
                        onQueryClear={() => setSearchValue("")}
                        filters={filters}
                        appliedFilters={appliedFilters}
                        onClearAll={() => {
                          setSearchValue("");
                          setStatusFilter([]);
                        }}
                      />
                    </div>
                    <IndexTable
                      itemCount={filteredTimers.length}
                      headings={[
                        { title: "Title" },
                        { title: "Status" },
                        { title: "Type" },
                        { title: "Target" },
                        { title: "End / Duration" },
                        { title: "Impressions" },
                        { title: "Actions" },
                      ]}
                      selectable={false}
                    >
                      {rowMarkup}
                    </IndexTable>
                  </Card>
                ) : (
                  renderAnalyticsTab()
                )}
              </div>
            </Tabs>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
