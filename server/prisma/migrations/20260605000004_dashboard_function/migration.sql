CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total            INTEGER;
  v_open             INTEGER;
  v_ai_resolved      INTEGER;
  v_ai_resolved_pct  NUMERIC;
  v_avg_ms           NUMERIC;
  v_per_day          JSONB;
BEGIN
  SELECT COUNT(*) INTO v_total FROM "Ticket";

  SELECT COUNT(*) INTO v_open
  FROM "Ticket"
  WHERE status = 'open';

  SELECT COUNT(*) INTO v_ai_resolved
  FROM "Ticket" t
  WHERE t.status = 'resolved'
    AND EXISTS (
      SELECT 1 FROM "Message" m
      WHERE m."ticketId" = t.id
        AND m."senderType" = 'agent'
        AND m."agentId" IS NULL
    );

  v_ai_resolved_pct := CASE
    WHEN v_total > 0 THEN ROUND((v_ai_resolved::NUMERIC / v_total) * 1000) / 10
    ELSE 0
  END;

  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) * 1000),
    0
  ) INTO v_avg_ms
  FROM "Ticket" t
  WHERE t.status = 'resolved'
    AND EXISTS (
      SELECT 1 FROM "Message" m
      WHERE m."ticketId" = t.id
        AND m."senderType" = 'agent'
        AND m."agentId" IS NULL
    );

  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT('date', day::DATE::TEXT, 'count', cnt)
    ORDER BY day
  ) INTO v_per_day
  FROM (
    SELECT
      d.day,
      COUNT(t.id) AS cnt
    FROM GENERATE_SERIES(
      CURRENT_DATE - INTERVAL '29 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS d(day)
    LEFT JOIN "Ticket" t ON t."createdAt"::DATE = d.day
    GROUP BY d.day
  ) sub;

  RETURN JSONB_BUILD_OBJECT(
    'totalTickets',        v_total,
    'openTickets',         v_open,
    'aiResolvedTickets',   v_ai_resolved,
    'aiResolvedPercentage', v_ai_resolved_pct,
    'avgResolutionMs',     ROUND(v_avg_ms),
    'ticketsPerDay',       COALESCE(v_per_day, '[]'::JSONB)
  );
END;
$$;
