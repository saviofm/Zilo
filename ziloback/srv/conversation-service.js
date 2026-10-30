import cds from '@sap/cds';
import { createOrchestrationClient } from './providers/aicore-orchestration.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('conversation-service');

export default class ConversationService extends cds.ApplicationService {

  async init() {
    const db = await cds.connect.to('db');
    const {
      Conversations, Messages,
      OrchestrationConfig, CostPolicy, PolicyOrchestrations,
      JobRole, UserProfile, UserPolicyOverride,
      TokenLedger,
    } = db.entities('zilo');

    // ── Helpers ──────────────────────────────────────────────────────────────

    const _uid = (req) => req.user?.id ?? req.user?.attr?.userUuid ?? 'anonymous';

    // Resolve active policy for a user (override > role default)
    async function _resolvePolicy(userId) {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Active override
      const override = await SELECT.one(UserPolicyOverride)
        .where({ user_userId: userId, isActive: true })
        .and(`validFrom <= '${today}' AND (validTo IS NULL OR validTo >= '${today}')`);

      if (override?.policy_id) {
        return SELECT.one(CostPolicy).where({ id: override.policy_id });
      }

      // 2. Role default
      const profile = await SELECT.one(UserProfile)
        .columns('role_id')
        .where({ userId });

      if (!profile?.role_id) return null;

      const role = await SELECT.one(JobRole)
        .columns('policy_id')
        .where({ id: profile.role_id });

      return role?.policy_id
        ? SELECT.one(CostPolicy).where({ id: role.policy_id })
        : null;
    }

    // Sum CU used in current calendar month for a user
    async function _usedCUThisMonth(userId) {
      const yearMonth = new Date().toISOString().slice(0, 7); // "2026-10"
      const rows = await SELECT.from(TokenLedger)
        .columns('SUM(totalCU) as used')
        .where({ userId })
        .and(`timestamp LIKE '${yearMonth}%'`);
      return Number(rows[0]?.used ?? 0);
    }

    // Check whether orchestration is allowed for this user's policy
    async function _orchestrationAllowed(policyId, orchestrationId) {
      if (!policyId) return false;
      const row = await SELECT.one(PolicyOrchestrations).where({
        policy_id: policyId,
        orchestration_id: orchestrationId,
      });
      return !!row;
    }

    // ── Conversations: ownership enforcement ─────────────────────────────────

    this.before('READ', 'Conversations', async req => {
      const uid = _uid(req);
      const key = req.params?.[0];
      if (key) {
        const id = typeof key === 'object' ? key.id : key;
        const row = await SELECT.one(Conversations).where({ id, userId: uid });
        if (!row) return req.error(404, 'Not found');
      } else {
        const owned = await SELECT.from(Conversations)
          .columns('id').where({ userId: uid }).orderBy('updatedAt desc');
        const ids = owned.map(r => r.id);
        req.query.where(ids.length ? { id: { in: ids } } : '1 = 2');
      }
    });

    this.before('CREATE', 'Conversations', async req => {
      const uid = _uid(req);
      const orchId = req.data.orchestration_id;
      if (!orchId) return req.error(400, 'orchestration_id is required');

      const policy = await _resolvePolicy(uid);
      if (!policy) return req.error(403, 'No active cost policy for this user');

      const allowed = await _orchestrationAllowed(policy.id, orchId);
      if (!allowed) return req.error(403, 'Orchestration not allowed for your profile');

      req.data.userId    = uid;
      req.data.createdAt = new Date().toISOString();
      req.data.updatedAt = new Date().toISOString();
    });

    this.before('UPDATE', 'Conversations', async req => {
      const id = req.data.id ?? req.params?.[0]?.id ?? req.params?.[0];
      const row = await SELECT.one(Conversations).where({ id, userId: _uid(req) });
      if (!row) return req.error(403, 'Forbidden');
      req.data.updatedAt = new Date().toISOString();
    });

    this.before('DELETE', 'Conversations', async req => {
      const id = req.params?.[0]?.id ?? req.params?.[0];
      const row = await SELECT.one(Conversations).where({ id, userId: _uid(req) });
      if (!row) return req.error(403, 'Forbidden');
    });

    this.on('rename', 'Conversations', async req => {
      const id = req.params?.[0]?.id ?? req.params?.[0];
      const row = await SELECT.one(Conversations).where({ id, userId: _uid(req) });
      if (!row) return req.error(403, 'Forbidden');
      await UPDATE(Conversations, id).with({ title: req.data.title, updatedAt: new Date().toISOString() });
      return SELECT.one(this.entities.Conversations, id);
    });

    // ── Messages: guard via conversation ownership ────────────────────────────

    this.before('READ', 'Messages', async req => {
      const convId = req.query?.SELECT?.where?.find?.(w => w.ref?.[0] === 'conversation_id')?.val
        ?? req.params?.[0]?.conversation_id;
      if (convId) {
        const conv = await SELECT.one(Conversations).where({ id: convId, userId: _uid(req) });
        if (!conv) return req.error(403, 'Forbidden');
      }
    });

    this.before('CREATE', 'Messages', async req => {
      const convId = req.data.conversation_id;
      const conv   = await SELECT.one(Conversations).where({ id: convId, userId: _uid(req) });
      if (!conv) return req.error(403, 'Forbidden');
      req.data.createdAt = new Date().toISOString();
    });

    // ── Function: myOrchestrations ────────────────────────────────────────────

    this.on('myOrchestrations', async req => {
      const uid = _uid(req);
      const policy = await _resolvePolicy(uid);
      if (!policy) return [];

      const allowed = await SELECT.from(PolicyOrchestrations)
        .columns('orchestration_id')
        .where({ policy_id: policy.id });

      const ids = allowed.map(r => r.orchestration_id);
      if (!ids.length) return [];

      const orchs = await SELECT.from(OrchestrationConfig)
        .where({ id: { in: ids }, isActive: true })
        .orderBy('sortOrder asc');

      return orchs.map((o, i) => ({
        id:          o.id,
        name:        o.name,
        description: o.description,
        modelName:   o.model_id,
        isDefault:   i === 0,
      }));
    });

    // ── Function: myBudgetStatus ──────────────────────────────────────────────

    this.on('myBudgetStatus', async req => {
      const uid      = _uid(req);
      const policy   = await _resolvePolicy(uid);
      const budgetCU = Number(policy?.monthlyBudgetCU ?? 0);
      const usedCU   = await _usedCUThisMonth(uid);
      const yearMonth = new Date().toISOString().slice(0, 7);
      return {
        budgetCU,
        usedCU,
        remainingCU: Math.max(0, budgetCU - usedCU),
        percentUsed: budgetCU > 0 ? Math.round((usedCU / budgetCU) * 100 * 100) / 100 : 0,
        yearMonth,
      };
    });

    await super.init();
  }
}
