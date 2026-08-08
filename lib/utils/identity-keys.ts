/**
 * The identity keys a person can be referenced by in this database.
 *
 * SWEEP E, lesson 4 (CLAUDE.md §12). Two different ids identify the same human:
 *
 *   - `staff.id`  — the staff DOCUMENT id, which is the person's LOWERCASED EMAIL
 *                   (see the staff invariant in §11: staff docs are keyed by email and
 *                   carry `authUid` as a field; never keyed by uid). Some tenants
 *                   provisioned through the Super-Admin create-tenant route instead have a
 *                   uid-keyed staff doc, so `staff.id` is not *always* an email.
 *   - `profile.uid` — the Firebase Auth uid.
 *
 * Every assignee/owner/agent/recipient PICKER in the app binds `staff.id`, because that is
 * what `useStaff()` returns. Several readers historically compared those stored values
 * against `profile.uid`. An email never equals a uid, so those queries matched nothing,
 * returned zero rows, threw no error, and rendered as a legitimate-looking "nothing here" —
 * this silently emptied the entire dashboard Today view and the notification bell.
 *
 * Use this helper on the READ side. Matching both keys is deliberately preferred over
 * rewriting historical documents: rows already written carry whichever key was current when
 * they were created, and both must keep resolving.
 *
 * Firestore note: `in` accepts at most 30 values (10 on older SDKs) and rejects an empty
 * array, so this never returns an empty list.
 */
export function identityKeysFor(uid: string | undefined | null, email?: string | null): string[] {
    const keys = new Set<string>();
    if (uid) keys.add(uid);
    if (email) keys.add(email.toLowerCase());
    // Never empty: an `in` / `array-contains-any` with zero values throws at query time.
    return keys.size > 0 ? Array.from(keys) : ["__no-identity__"];
}
