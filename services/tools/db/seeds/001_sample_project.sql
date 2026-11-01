-- The sample store project, used until a real store (Choppaddi) is onboarded.
insert into projects (id, name, allowed_domains, adapter)
values ('sample', 'Sample store', '{localhost}', 'sample')
on conflict (id) do nothing;
