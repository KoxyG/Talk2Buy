-- A cart handed to the host's own checkout (talk2buy:cart) is closed like an ordered one, so
-- ordering again starts a new cart instead of sending the same items twice.
alter table carts add column handed_off_at timestamptz;

drop index carts_open_session_idx;
create unique index carts_open_session_idx on carts (session_id) where cardinality(order_ids) = 0 and handed_off_at is null;
