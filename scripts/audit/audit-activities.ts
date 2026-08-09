/** READ-ONLY. Counts and shapes both `activities` stores across all orgs. */
import { db } from "../_admin";
async function main() {
    const root = await db.collection("activities").get();
    console.log(`ROOT activities: ${root.size}`);
    const byOrg = new Map<string, number>();
    const shapes = new Map<string, number>();
    root.docs.forEach((d) => {
        const x = d.data();
        byOrg.set(x.orgId || "(none)", (byOrg.get(x.orgId || "(none)") || 0) + 1);
        const k =
            [
                "dateTime" in x && "dateTime",
                "relatedTo" in x && "relatedTo",
                "message" in x && "message",
                "actorName" in x && "actorName",
                "type" in x && "type",
            ]
                .filter(Boolean)
                .join("+") || "(bare)";
        shapes.set(k, (shapes.get(k) || 0) + 1);
    });
    console.log("  by org:", Object.fromEntries(byOrg));
    console.log("  field signatures:", Object.fromEntries(shapes));
    root.docs.slice(0, 3).forEach((d) => console.log("   sample:", JSON.stringify(d.data()).slice(0, 220)));

    const orgs = await db.collection("organizations").get();
    let sub = 0;
    const subByOrg = new Map<string, number>();
    for (const o of orgs.docs) {
        const s = await o.ref.collection("activities").get();
        if (s.size) {
            sub += s.size;
            subByOrg.set(o.id, s.size);
        }
    }
    console.log(`\nSUBCOLLECTION organizations/{orgId}/activities: ${sub}`);
    console.log("  by org:", Object.fromEntries(subByOrg));
}
main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e.message);
        process.exit(1);
    });
