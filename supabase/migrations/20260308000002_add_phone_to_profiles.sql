-- Add phone number and contact preferences to profiles
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists contact_via_text boolean default false;
alter table profiles add column if not exists contact_via_whatsapp boolean default false;
