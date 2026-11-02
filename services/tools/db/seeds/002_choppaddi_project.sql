-- Choppaddi: the first real host store, read through its public API (adapters/choppaddi.ts).
-- localhost is for testing with a local host page.
insert into projects (id, name, allowed_domains, adapter, adapter_config, areas)
values ('choppaddi', 'Choppaddi', array['www-testnet.choppaddi.cloud', 'localhost'], 'choppaddi',
        '{"apiUrl": "https://testnet.choppaddi.cloud/api/v1"}', '{Asaba,Ibadan,Enugu}')
on conflict (id) do update
  set allowed_domains = excluded.allowed_domains, adapter = excluded.adapter, adapter_config = excluded.adapter_config,
      areas = excluded.areas;
