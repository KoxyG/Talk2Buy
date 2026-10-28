-- Day 4: a cart becomes one order per shop in the host store. The order IDs are kept so only
-- this session can confirm them, and an ordered cart can't change.

alter table carts add column order_ids text[] not null default '{}';

-- One open (not yet ordered) cart per session.
create unique index carts_open_session_idx on carts (session_id) where cardinality(order_ids) = 0;
