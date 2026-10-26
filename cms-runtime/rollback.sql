-- Rollback for 001_init.sql on a disposable CMS database only.
DROP TABLE IF EXISTS news_articles;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
