import { normalizeSighting, type Sighting } from '../lib/sightings'

const HOUR = 60 * 60 * 1000

// Realistic-looking sample reports around the Salish Sea, placed relative to "now".
const SAMPLES: Array<[number, number, string, number, string, number]> = [
  [48.515, -123.152, 'Southern Resident Killer Whale', 1.2, 'J pod heading north past Lime Kiln Lighthouse, J35 and calf spread out foraging.', 12],
  [48.43, -123.03, 'Orca', 3.5, "Bigg's killer whales T65As hunting near Cattle Point, porpoising at speed.", 5],
  [48.62, -123.25, 'Southern Resident Killer Whale', 6, 'Ks and Ls together off Stuart Island, lots of breaching and cartwheels!', 30],
  [48.36, -122.77, 'Humpback', 2.2, 'Humpback lunge feeding off Smith Island, big fluke up dive.', 1],
  [47.72, -122.43, 'Gray Whale', 9, 'Gray whale feeding in the shallows off Whidbey, one of the "Sounders".', 1],
  [48.72, -123.58, 'Orca', 14, 'T049As traveling down Sansum Narrows.', 4],
  [48.25, -123.42, 'Humpback', 20, 'Two humpbacks off Race Rocks, mom and calf.', 2],
  [48.46, -122.95, 'Minke Whale', 27, 'Minke near Hein Bank.', 1],
  [48.85, -123.3, 'Dall\'s Porpoise', 33, "Dall's porpoise bow riding in Boundary Pass.", 6],
  [47.9, -122.4, 'Orca', 40, "Bigg's orcas in Possession Sound, T137s.", 4],
]

export function makeDemoSightings(): Sighting[] {
  const now = Date.now()
  return SAMPLES.map(([latitude, longitude, type, hoursAgo, comments, count], i) =>
    normalizeSighting(
      {
        id: `demo-${i}`,
        latitude,
        longitude,
        type,
        data_source_comments: comments,
        no_sighted: count,
        created: new Date(now - hoursAgo * HOUR).toISOString().slice(0, 19).replace('T', ' '),
        data_source_name: 'Sample data',
      },
      i,
    ),
  ).filter((s): s is Sighting => s !== null)
}
