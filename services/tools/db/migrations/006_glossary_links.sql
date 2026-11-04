-- How glossary words connect: "ugu also_called pumpkin leaves", "amala eaten_with ewedu".
-- Terms are lower case. They needn't be glossary terms themselves ("pumpkin leaves" is just a
-- search phrase). also_called and similar_to work both ways, so each pair is stored once.
create table glossary_links (
  from_term text not null,
  relation  text not null check (relation in ('also_called', 'is_a', 'made_with', 'eaten_with', 'similar_to', 'from_region')),
  to_term   text not null,
  verified  boolean not null default true,
  primary key (from_term, relation, to_term)
);

create index glossary_links_to_idx on glossary_links (to_term);
