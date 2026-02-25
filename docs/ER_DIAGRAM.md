# ER Diagram

This is the working entity model used by the current web + tablet implementation.

```mermaid
erDiagram
    PROFILES {
      uuid user_id PK
      text role
      uuid shed_id FK
      boolean is_active
    }

    COMPANIES {
      uuid company_id PK
      text name
      int sort_order
      boolean is_active
    }

    SHEDS {
      uuid shed_id PK
      text name
      int sort_order
      boolean is_active
    }

    PROCESSING_TYPES {
      uuid processing_type_id PK
      text name
      int sort_order
      boolean is_active
    }

    COUNT_RANGES {
      uuid count_range_id PK
      text label
      int min_count
      int max_count
      int sort_order
      boolean is_active
    }

    BATCHES {
      uuid batch_id PK
      text batch_code
      text batch_name
      text leader_name
      uuid shed_id FK
      boolean is_active
    }

    BATCH_MEMBERS {
      uuid member_id PK
      uuid batch_id FK
      text member_name
      boolean is_active
    }

    WORKER_RATES {
      uuid worker_rate_id PK
      uuid processing_type_id FK
      uuid count_range_id FK
      numeric rate_per_kg
      timestamptz effective_from
      timestamptz effective_to
      boolean is_active
    }

    STOCK_INWARD {
      uuid stock_inward_id PK
      date entry_date
      uuid shed_id FK
      uuid company_id FK
      numeric raw_weight_kg
      timestamptz created_at
    }

    PROCESSING_ENTRIES {
      uuid processing_entry_id PK
      date entry_date
      uuid shed_id FK
      uuid company_id FK
      uuid batch_id FK
      uuid processing_type_id FK
      uuid count_range_id FK
      numeric processed_weight_kg
      numeric rate_per_kg_snapshot
      numeric amount_snapshot
      timestamptz created_at
    }

    PROCESSING_ENTRY_MEMBERS {
      uuid processing_entry_member_id PK
      uuid processing_entry_id FK
      uuid member_id FK
      numeric processed_weight_kg
      timestamptz created_at
    }

    V_DAILY_SUMMARY {
      date summary_date
      uuid company_id
      uuid shed_id
      numeric raw_weight_kg
      numeric processed_weight_kg
      numeric diff_kg
      numeric yield_percent
    }

    SHEDS ||--o{ PROFILES : assigned_to
    SHEDS ||--o{ BATCHES : contains

    BATCHES ||--o{ BATCH_MEMBERS : has

    PROCESSING_TYPES ||--o{ WORKER_RATES : rated_by
    COUNT_RANGES ||--o{ WORKER_RATES : rated_by

    COMPANIES ||--o{ STOCK_INWARD : inward_for
    SHEDS ||--o{ STOCK_INWARD : inward_at

    COMPANIES ||--o{ PROCESSING_ENTRIES : processed_for
    SHEDS ||--o{ PROCESSING_ENTRIES : processed_at
    BATCHES ||--o{ PROCESSING_ENTRIES : processed_by
    PROCESSING_TYPES ||--o{ PROCESSING_ENTRIES : process_type
    COUNT_RANGES ||--o{ PROCESSING_ENTRIES : count_range

    PROCESSING_ENTRIES ||--o{ PROCESSING_ENTRY_MEMBERS : split_into
    BATCH_MEMBERS ||--o{ PROCESSING_ENTRY_MEMBERS : member_weight
```

## Notes
- `PROCESSING_ENTRY_MEMBERS` is shown as target model for mandatory member-wise persistence.
- `V_DAILY_SUMMARY` is a reporting view derived from transaction tables.
- Rate snapshots in `PROCESSING_ENTRIES` protect historical payroll from future rate changes.
