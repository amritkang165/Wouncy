CREATE TABLE players (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 token_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL
);
CREATE TABLE scores (
 run_id TEXT PRIMARY KEY,
 player_id TEXT NOT NULL,
 name TEXT NOT NULL,
 mode TEXT NOT NULL,
 rules_version INTEGER NOT NULL,
 board_day TEXT NOT NULL,
 score INTEGER NOT NULL,
 level INTEGER NOT NULL,
 cleared INTEGER NOT NULL,
 bounces INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX scores_board ON scores(rules_version,mode,board_day,score DESC);
