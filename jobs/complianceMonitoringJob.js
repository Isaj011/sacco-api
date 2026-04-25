const ComplianceProfile = require('../models/ComplianceProfile');
const complianceService = require('../services/complianceService');
const platformEventService = require('../services/platformEventService');

/**
 * complianceMonitoringJob
 *
 * Nightly job that recalculates compliance scores for all entities
 * (vehicles + drivers) across all domains.
 *
 * Run via:
 *  - POST /api/v1/monitoring/compliance/run  (manual admin trigger)
 *  - Cron schedule: every night at 02:00 EAT (23:00 UTC previous day)
 *
 * Processing is domain-aware and isolated — a failure on one profile
 * never aborts the entire batch.
 */

/**
 * Run the full compliance check.
 *
 * @param {object} [opts]
 * @param {string} [opts.domain]      — restrict to one domain
 * @param {boolean} [opts.dueOnly]    — true = only profiles where nextCheckDue <= now
 * @returns {Promise<{ checked: number, updated: number, errors: string[] }>}
 */
exports.run = async (opts = {}) => {
  const { domain, dueOnly = true } = opts;
  const result = { checked: 0, updated: 0, errors: [] };

  // ── Build query ──────────────────────────────────────────────────
  const query = {};
  if (domain) query.domain = domain;
  if (dueOnly) query.nextCheckDue = { $lte: new Date() };

  // Process in batches of 50 to avoid memory pressure
  const BATCH_SIZE = 50;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const profiles = await ComplianceProfile
      .find(query)
      .skip(skip)
      .limit(BATCH_SIZE);

    if (profiles.length < BATCH_SIZE) hasMore = false;
    skip += BATCH_SIZE;

    for (const profile of profiles) {
      result.checked++;
      try {
        await complianceService.recalculate(profile);
        result.updated++;
      } catch (err) {
        result.errors.push(
          `${profile.domain}/${profile.entityType}/${profile.entityId}: ${err.message}`
        );
      }
    }
  }

  // ── Write system health event ────────────────────────────────────
  await platformEventService.write({
    domain:     'platform',
    eventType:  'SYSTEM_HEALTH',
    entityType: 'system',
    entityId:   require('mongoose').Types.ObjectId.createFromHexString('000000000000000000000001'),
    source:     'background_job',
    payload:    {
      job:     'complianceMonitoringJob',
      checked: result.checked,
      updated: result.updated,
      errors:  result.errors.length,
      domain:  domain || 'all',
      ranAt:   new Date().toISOString()
    }
  });

  return result;
};

/**
 * Reset monthly speed violation counters.
 * Call on the 1st of each month (separate cron or add to monthly job).
 */
exports.resetMonthlyCounters = async () => {
  await ComplianceProfile.updateMany(
    { entityType: 'driver' },
    { $set: { 'behaviourMetrics.speedViolationsMonth': 0 } }
  );
};
