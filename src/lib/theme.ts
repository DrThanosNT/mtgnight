export const colors = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  surface2: "var(--color-surface-2)",
  border: "var(--color-border)",
  text: "var(--color-text)",
  textDim: "var(--color-text-dim)",
  gold: "var(--color-gold)",
  goldHover: "var(--color-gold-hover)",
  violet: "var(--color-violet)",
  danger: "var(--color-danger)",
};

export const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 15,
  width: "100%",
  boxSizing: "border-box",
};

export const primaryBtnStyle: React.CSSProperties = {
  padding: "13px 20px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  background: "var(--color-gold)",
  color: "#1a1206",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

export const ghostBtnStyle: React.CSSProperties = {
  padding: "13px 20px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  fontSize: 15,
  cursor: "pointer",
};

export const dangerBtnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-danger)",
  background: "transparent",
  color: "#e08c85",
  fontSize: 13,
  cursor: "pointer",
};

export const cardStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "var(--radius-md)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
};

export const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  boxSizing: "border-box",
  padding: "24px 20px",
  maxWidth: 480,
  margin: "0 auto",
  color: "var(--color-text)",
};
