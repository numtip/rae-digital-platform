-- MJU SSO: approved identity links and the one-time sign-in handoff.
--
-- Additive only; nothing existing is altered. Safe to apply while SSO is disabled.
-- A link binds an application-scoped HMAC of the provider subject (never the identifier itself)
-- to an EXISTING local user. Roles stay on `users.role`; SSO grants none.
-- Only status = 'approved' can sign in, and approval is a person's action (approved_by).

CREATE TABLE IF NOT EXISTS sso_identity_links (
  id VARCHAR(36) PRIMARY KEY,
  subject_key CHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  user_id VARCHAR(64) NULL,
  requested_at DATETIME NOT NULL,
  approved_by VARCHAR(64) NULL,
  approved_at DATETIME NULL,
  revoked_by VARCHAR(64) NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_sso_subject (subject_key),
  KEY ix_sso_user (user_id)
);

-- A callback cannot hand a bearer token to the page without putting it in a URL, so it stores a
-- single-use, 60 second handoff (hash only) and the page exchanges it once.
CREATE TABLE IF NOT EXISTS sso_handoffs (
  token_hash CHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL
);
