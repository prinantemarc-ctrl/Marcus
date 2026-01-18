/**
 * Color generation utilities for zones
 */

// Predefined color palette for zones
const ZONE_COLORS = [
  { primary: "#667eea", secondary: "#764ba2", light: "#667eea20", border: "#667eea50" },
  { primary: "#f093fb", secondary: "#f5576c", light: "#f093fb20", border: "#f093fb50" },
  { primary: "#4facfe", secondary: "#00f2fe", light: "#4facfe20", border: "#4facfe50" },
  { primary: "#43e97b", secondary: "#38f9d7", light: "#43e97b20", border: "#43e97b50" },
  { primary: "#fa709a", secondary: "#fee140", light: "#fa709a20", border: "#fa709a50" },
  { primary: "#30cfd0", secondary: "#330867", light: "#30cfd020", border: "#30cfd050" },
  { primary: "#a8edea", secondary: "#fed6e3", light: "#a8edea20", border: "#a8edea50" },
  { primary: "#ff9a9e", secondary: "#fecfef", light: "#ff9a9e20", border: "#ff9a9e50" },
  { primary: "#ffecd2", secondary: "#fcb69f", light: "#ffecd220", border: "#ffecd250" },
  { primary: "#a1c4fd", secondary: "#c2e9fb", light: "#a1c4fd20", border: "#a1c4fd50" },
];

/**
 * Generate a consistent color for a zone based on its ID
 */
export function getZoneColor(zoneId: string): {
  primary: string;
  secondary: string;
  light: string;
  border: string;
} {
  // Simple hash function to get consistent color for zone ID
  let hash = 0;
  for (let i = 0; i < zoneId.length; i++) {
    hash = zoneId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % ZONE_COLORS.length;
  return ZONE_COLORS[index];
}

/**
 * Get gradient style for a zone
 */
export function getZoneGradient(zoneId: string): string {
  const color = getZoneColor(zoneId);
  return `linear-gradient(135deg, ${color.primary} 0%, ${color.secondary} 100%)`;
}
