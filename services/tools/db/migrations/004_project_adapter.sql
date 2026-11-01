-- Each project names its store adapter and that adapter's settings, so onboarding a store on a
-- supported platform is a new row (later written by an admin portal), not new code.

alter table projects add column adapter text;
alter table projects add column adapter_config jsonb not null default '{}';
update projects set adapter = 'sample' where id = 'sample';
alter table projects alter column adapter set not null;
