export const schemaSql = `
create table if not exists users (
  id text primary key,
  name text not null,
  account text not null unique,
  phone text,
  email text,
  department text,
  role text not null,
  status text not null,
  created_at text
);

create table if not exists dictionaries (
  id integer primary key autoincrement,
  type text not null,
  value text not null,
  unique(type, value)
);

create table if not exists projects (
  id text primary key,
  serial_no integer,
  construction_unit text,
  main_project_name text,
  sub_project_no text,
  sub_project_name text,
  year integer,
  project_category text,
  investment_amount real default 0,
  fund_source text,
  subsidy_form text,
  subsidy_receivable real default 0,
  subsidy_received real default 0,
  subsidy_unreceived real default 0,
  accounting_treatment text,
  transferred_expense_amount real default 0,
  bid_contract_amount real default 0,
  winning_or_contract_amount real default 0,
  contract_change_amount real default 0,
  adjustment_rate real default 0,
  final_account_amount real default 0,
  accumulated_payment_amount real default 0,
  unpaid_amount real default 0,
  payment_completed text,
  superior_subsidy_source real default 0,
  town_fund_source real default 0,
  town_budget_2024 real default 0,
  difference_amount real default 0,
  payment_progress real default 0,
  project_progress text,
  supplier_info text,
  service_content text,
  remark text
);

create table if not exists project_payments (
  id integer primary key autoincrement,
  project_id text not null references projects(id) on delete cascade,
  slot integer not null,
  label text not null,
  payment_year integer,
  date text,
  amount real default 0,
  unique(project_id, slot)
);

create table if not exists project_logs (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  date text not null,
  author text,
  content text not null
);

create table if not exists warning_handlings (
  id text primary key,
  status text not null,
  handler text,
  note text
);
`
