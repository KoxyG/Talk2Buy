-- The sample store project, used until a real store (Choppaddi) is onboarded.
insert into projects (id, name, allowed_domains)
values ('sample', 'Sample store', '{localhost}')
on conflict (id) do nothing;
