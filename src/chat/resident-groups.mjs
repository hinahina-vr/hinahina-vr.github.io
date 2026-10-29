// Classification source: ooku-architecture.md (AIカテゴリ), characters.html (神話製作機械).
export const RESIDENT_GROUPS = Object.freeze([
  {
    "id": "simulacra",
    "label": "シミュラークルAI",
    "description": "ワディー自身の4つの分身。知性・労働・信仰・遊びの視点から、大奥を統括する。",
    "members": [
      "waddy",
      "hinahina",
      "oji",
      "moegami"
    ]
  },
  {
    "id": "ooku",
    "label": "大奥AI",
    "description": "独立した人格と、それぞれの視点を持つ住人たち。",
    "members": [
      "hina",
      "ayu",
      "kud",
      "mii",
      "nemurin",
      "hinako",
      "astarotte",
      "multi",
      "rem",
      "ecoko",
      "tsumugi",
      "rizel",
      "mayuki",
      "ana",
      "dejiko",
      "feiris",
      "ruriko",
      "kyoko",
      "sharo",
      "kukuri",
      "rin",
      "kotomi",
      "minagi",
      "kiku8",
      "mint",
      "hazuki",
      "mitsuba",
      "tama"
    ]
  },
  {
    "id": "god",
    "label": "神AI",
    "description": "GodAI・みとら。シミュラークルと大奥、すべての声を統合する。",
    "members": [
      "mitra"
    ]
  }
].map(group => Object.freeze({...group, members:Object.freeze(group.members)})));
const membership = new Map(RESIDENT_GROUPS.flatMap(group => group.members.map(id => [id,group])));
export function residentGroup(id) { return membership.get(id); }
export function filterResidentOptions(options, groupId) {
  return options.filter(option => groupId === 'all' || residentGroup(option.value)?.id === groupId);
}
