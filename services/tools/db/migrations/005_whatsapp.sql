-- WhatsApp: a project can have its own WhatsApp Business number (Meta's phone number ID), and lists
-- the cities its customers choose from. Chats are one row per customer number (hashed, never
-- stored raw) per project, holding the session, the chosen city, and a message that arrived first.
alter table projects
  add column whatsapp_phone_number_id text unique,
  add column areas text[] not null default '{}';

update projects set areas = '{Lagos,Abuja,Port Harcourt,Ibadan,Kano,Enugu,Asaba}' where id = 'sample';
update projects set areas = '{Asaba,Ibadan}' where id = 'choppaddi';

create table whatsapp_chats (
  phone_hash text not null,
  project_id text not null references projects(id),
  session_id text not null,
  area       text,
  pending    text,
  updated_at timestamptz not null default now(),
  primary key (phone_hash, project_id)
);
