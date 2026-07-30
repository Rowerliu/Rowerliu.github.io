# Visitor Globe API

This Cloudflare Worker records privacy-reduced visitor locations for the
`webgl` homepage widget.

- Coordinates come from Cloudflare request metadata and are rounded to one
  decimal place before storage.
- Raw IP addresses are never stored.
- A salted, one-day hash limits each IP to one recorded visit per day.
- Historical locations are aggregated in D1 and returned by `/points`.

## Deploy

Install Wrangler and authenticate:

```sh
npx wrangler login
```

Create the D1 database:

```sh
npx wrangler d1 create rowerliu-visitors
```

Copy `wrangler.example.toml` to `wrangler.toml`, then replace
`REPLACE_WITH_D1_DATABASE_ID` with the generated database ID.

Create the tables and configure a private salt:

```sh
npx wrangler d1 execute rowerliu-visitors --remote --file schema.sql
npx wrangler secret put HASH_SALT
```

Deploy:

```sh
npx wrangler deploy
```

Finally, place the returned Worker URL in `content/config.toml`:

```toml
[features]
visitor_widget = "webgl"
visitor_globe_api = "https://rowerliu-visitor-api.YOUR-SUBDOMAIN.workers.dev"
```

The available widget modes remain `map`, `globe`, and `webgl`.
