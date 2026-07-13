# Firestore security audit

## Data paths found in the application

- `users/{uid}`: account profile. New accounts create client-only fields; owners can edit presentation fields only. `isAdmin` is an administrator-managed authority field.
- `properties/{slug}`: public catalogue reads; administrator-only create, update, and delete.
- `siteSettings/main`: public site configuration reads; administrator-only writes.
- `rentalRequests/{id}`: authenticated submission; administrator-only inbox access and lifecycle changes.
- `advisorRequests/{id}`: authenticated owner-tagged submission; administrator-only inbox access and lifecycle changes.
- `exploreMapLeads/{id}`: authenticated owner-tagged geographic-area submission; administrator-only inbox access and lifecycle changes.
- Storage `property-images/{propertySlug}/{fileName}`: public reads; administrator-only image uploads up to 15 MB and deletes.
- Storage `profile-images/{uid}/{fileName}`: public avatar reads; owner-only image uploads up to 5 MB; owner or administrator deletes.

## Security decisions and assumptions

- The existing Standard-edition `(default)` Firestore database is the only database used by the web client.
- A user becomes an administrator only when a trusted operator sets `users/{uid}.isAdmin` to boolean `true` outside the self-service profile flow.
- Self-service profile updates cannot add or modify `isAdmin` or `role`.
- Unknown Firestore collections and unknown Storage paths are denied by default.
- Request documents may contain the optional fields represented by the shared request models, but cannot add arbitrary fields or oversized free-text values.

## Red-team assessment

```json
{
  "score": 5,
  "summary": "Admin authority comes from a protected existing account record, owner profile updates cannot alter authority fields, sensitive collections are admin-only, and unknown paths are denied.",
  "findings": []
}
```

Attack checks performed: localStorage manipulation no longer grants UI or database access; a client cannot create an account with `isAdmin`; profile update field-diff checks block later role escalation; request update bypasses are blocked because only an existing administrator can update them; property uploads require the server-evaluated admin role; profile uploads are restricted to the authenticated UID path with MIME and size limits, preventing cross-account overwrite and storage exhaustion.
