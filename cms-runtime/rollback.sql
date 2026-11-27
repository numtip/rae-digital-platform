-- Rollback for 001–003 on a disposable CMS database only.
DROP TABLE IF EXISTS news_media;
DROP TABLE IF EXISTS news_articles;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
