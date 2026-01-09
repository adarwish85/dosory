"use strict";
/**
 * Analytics Types for Dosory SaaS
 *
 * Firestore Path: analytics/{orgId}/monthly/{YYYY-MM}
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Example: How to query analytics
 *
 * ```typescript
 * // Get current month stats
 * const currentPeriod = "2026-01";
 * const statsRef = db.collection("analytics")
 *     .doc(orgId)
 *     .collection("monthly")
 *     .doc(currentPeriod);
 *
 * // Get last 12 months for chart
 * const seriesSnap = await db.collection("analytics")
 *     .doc(orgId)
 *     .collection("monthly")
 *     .orderBy("period", "desc")
 *     .limit(12)
 *     .get();
 * ```
 */
//# sourceMappingURL=analytics.js.map