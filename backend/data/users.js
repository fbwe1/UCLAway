const users = [
  {
    id: 1,
    username: "user1",
    email: "user1@ucla.edu",
    phone: "123-456-7890",
    completedRides: 3,
    rideHistory: [
      {
        id: 101,
        pickup: "UCLA",
        destination: "LAX",
        date: "2026-05-10",
      },
      {
        id: 102,
        pickup: "UCLA",
        destination: "Santa Monica",
        date: "2026-05-12",
      },
    ],
  },
  {
    id: 2,
    username: "user2",
    email: "user2@ucla.edu",
    phone: "222-333-4444",
    completedRides: 1,
    rideHistory: [
      {
        id: 103,
        pickup: "Westwood",
        destination: "Burbank Airport",
        date: "2026-05-15",
      },
    ],
  },
];

module.exports = users;