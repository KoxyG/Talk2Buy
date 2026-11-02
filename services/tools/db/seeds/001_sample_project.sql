-- The sample store project, used until a real store (Choppaddi) is onboarded.
insert into projects (id, name, allowed_domains, adapter, areas)
values ('sample', 'Sample store', '{localhost}', 'sample', '{Lagos,Abuja,Port Harcourt,Ibadan,Kano,Enugu,Asaba}')
on conflict (id) do nothing;
