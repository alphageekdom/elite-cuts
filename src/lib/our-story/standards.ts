// Standing shop policies that more than one Our Story section states in prose.
// Lives here for the same reason PARTNER_COUNT does in ./partners: the page
// repeats these claims across sections, and writing them out each time is how
// they drift. The freshness ceiling had already drifted — the timeline chapter
// said "never sitting more than a day" while the principles list and the
// by-the-numbers band both said 36 hours.
//
// These are storefront policy, not admin-editable settings: no model backs
// them and none is planned. What has to stay true is that every surface
// quoting one quotes the same number.
export const CASE_HOURS_MAX = 36;
