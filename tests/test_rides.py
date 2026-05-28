import requests
import threading
import unittest
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3001/api"

def future_time(hours=24):
    """Helper to generate a future datetime string"""
    return (datetime.now() + timedelta(hours=hours)).strftime('%Y-%m-%dT%H:%M')

def past_time(hours=1):
    """Helper to generate a past datetime string"""
    return (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%dT%H:%M')

class TestRidesAPI(unittest.TestCase):

    # ─── GET /api/rides ───────────────────────────────────────────────────────

    def test_01_get_rides_returns_list(self):
        """GET /api/rides should return a list"""
        res = requests.get(f"{BASE_URL}/rides")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_02_get_rides_have_required_fields(self):
        """Each ride should have all required fields"""
        res = requests.get(f"{BASE_URL}/rides")
        rides = res.json()
        self.assertGreater(len(rides), 0, "No rides in DB to test")
        for ride in rides:
            for field in ["id", "pickup_location", "destination", "total_seats",
                         "available_seats", "passengers", "creator_user_id",
                         "departure_time", "is_round_trip", "removed_passengers"]:
                self.assertIn(field, ride, f"Missing field: {field}")

    def test_03_available_seats_never_negative(self):
        """No ride should have negative available seats"""
        res = requests.get(f"{BASE_URL}/rides")
        for ride in res.json():
            self.assertGreaterEqual(ride["available_seats"], 0,
                f"Ride {ride['id']} has negative seats")

    def test_04_available_seats_not_exceed_total(self):
        """available_seats should never exceed total_seats"""
        res = requests.get(f"{BASE_URL}/rides")
        for ride in res.json():
            self.assertLessEqual(ride["available_seats"], ride["total_seats"],
                f"Ride {ride['id']} has more available than total seats")

    # ─── POST /api/rides (create) ─────────────────────────────────────────────

    def test_05_create_ride_success(self):
        """Should be able to create a valid ride"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Test Ride",
            "description": "Test description",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.json().get("success"))
        ride = res.json().get("ride")
        self.assertEqual(ride["available_seats"], 3)  # total - 1 for creator
        self.assertEqual(ride["passengers"], [])
        self.assertEqual(ride["removed_passengers"], [])

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_06_create_ride_missing_fields(self):
        """Should fail if required fields are missing"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Incomplete Ride",
            "creator_user_id": 9999
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_07_create_ride_past_departure(self):
        """Should fail if departure time is in the past"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Past Ride",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": past_time(1),
            "is_round_trip": False
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_08_create_round_trip_success(self):
        """Should create a round trip ride with return time"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Round Trip Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": True,
            "return_time": future_time(48)
        })
        self.assertEqual(res.status_code, 201)
        ride = res.json().get("ride")
        self.assertTrue(ride["is_round_trip"])
        self.assertIsNotNone(ride["return_time"])

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_09_create_round_trip_invalid_return_time(self):
        """Should fail if return time is before departure time"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Bad Round Trip",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(48),
            "is_round_trip": True,
            "return_time": future_time(24)  # before departure
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_10_create_ride_available_seats_calculated(self):
        """available_seats should be total_seats - 1 on creation"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Seat Check Ride",
            "pickup_location": "UCLA",
            "destination": "Santa Monica",
            "total_seats": 6,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = res.json().get("ride")
        self.assertEqual(ride["available_seats"], 5)

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    # ─── POST /api/rides/:id/join ─────────────────────────────────────────────

    def test_11_join_available_ride(self):
        """A user should be able to join a ride with available seats"""
        # Create a fresh ride
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Join Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_12_cannot_join_full_ride(self):
        """Should not be able to join a full ride"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        full_ride = next((r for r in rides if r["available_seats"] == 0
                         and r["creator_user_id"] != 813), None)
        if not full_ride:
            self.skipTest("No full ride in DB to test")

        res = requests.post(f"{BASE_URL}/rides/{full_ride['id']}/join", json={"userId": 813})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_13_cannot_join_twice(self):
        """A user should not be able to join the same ride twice"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Double Join Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_14_creator_cannot_join_own_ride(self):
        """Creator should not be able to join their own ride"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Creator Join Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 9999})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    # ─── POST /api/rides/:id/leave ────────────────────────────────────────────

    def test_15_leave_ride_you_joined(self):
        """A user should be able to leave a ride they joined"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Leave Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_16_cannot_leave_ride_not_joined(self):
        """Should not be able to leave a ride you never joined"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Leave Not Joined Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_17_seats_update_after_join_and_leave(self):
        """available_seats should decrement on join and increment on leave"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Seat Count Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")
        original_seats = ride["available_seats"]

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        after_join = requests.get(f"{BASE_URL}/rides").json()
        joined_ride = next(r for r in after_join if r["id"] == ride["id"])
        self.assertEqual(joined_ride["available_seats"], original_seats - 1)

        requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
        after_leave = requests.get(f"{BASE_URL}/rides").json()
        left_ride = next(r for r in after_leave if r["id"] == ride["id"])
        self.assertEqual(left_ride["available_seats"], original_seats)

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_18_creator_cannot_leave_own_ride(self):
        """Creator should not be able to leave their own ride"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Creator Leave Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 9999})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    # ─── POST /api/rides/:id/remove-rider ────────────────────────────────────

    def test_19_creator_can_remove_rider(self):
        """Creator should be able to remove a passenger"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Remove Rider Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
            json={"userId": 9999, "riderId": 813})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        # Verify rider is in removed_passengers
        rides = requests.get(f"{BASE_URL}/rides").json()
        updated = next(r for r in rides if r["id"] == ride["id"])
        self.assertIn(813, updated["removed_passengers"])
        self.assertNotIn(813, updated["passengers"])

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_20_non_creator_cannot_remove_rider(self):
        """Non-creator should not be able to remove a passenger"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Non Creator Remove Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
            json={"userId": 813, "riderId": 813})
        self.assertEqual(res.status_code, 403)

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_21_removed_rider_cannot_rejoin(self):
        """A removed rider should not be able to rejoin the ride"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Rejoin Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        # Join then get removed
        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
            json={"userId": 9999, "riderId": 813})

        # Try to rejoin
        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        self.assertEqual(res.status_code, 403)
        self.assertIn("error", res.json())

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_22_remove_rider_frees_seat(self):
        """Removing a rider should increment available_seats"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Seat Free Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")
        original_seats = ride["available_seats"]

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
            json={"userId": 9999, "riderId": 813})

        rides = requests.get(f"{BASE_URL}/rides").json()
        updated = next(r for r in rides if r["id"] == ride["id"])
        self.assertEqual(updated["available_seats"], original_seats)

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    # ─── DELETE /api/rides/:id ────────────────────────────────────────────────

    def test_23_non_creator_cannot_delete_ride(self):
        """A non-creator should not be able to delete a ride"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Non Creator Delete Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        res = requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 813})
        self.assertEqual(res.status_code, 403)

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})

    def test_24_creator_can_delete_own_ride(self):
        """Creator should be able to delete their own ride"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Delete Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")

        res = requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        rides_after = requests.get(f"{BASE_URL}/rides").json()
        ids = [r["id"] for r in rides_after]
        self.assertNotIn(ride["id"], ids)

    def test_25_delete_nonexistent_ride(self):
        """Deleting a ride that doesn't exist should return 404"""
        res = requests.delete(f"{BASE_URL}/rides/999999", json={"userId": 9999})
        self.assertEqual(res.status_code, 404)

    # ─── Race condition ───────────────────────────────────────────────────────

    def test_26_simultaneous_join_only_one_succeeds(self):
        """Two users joining the last seat at the same time — only one should succeed"""
        create = requests.post(f"{BASE_URL}/rides", json={
            "title": "Race Condition Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 2,  # creator + 1 seat only
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        ride = create.json().get("ride")
        self.assertEqual(ride["available_seats"], 1)

        results = []

        def join_ride(user_id):
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join",
                json={"userId": user_id})
            results.append(res.status_code)

        t1 = threading.Thread(target=join_ride, args=(700,))
        t2 = threading.Thread(target=join_ride, args=(701,))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        successes = results.count(200)
        failures = results.count(400)

        self.assertEqual(successes, 1, f"Expected 1 success, got {successes}")
        self.assertEqual(failures, 1, f"Expected 1 failure, got {failures}")

        # Cleanup
        requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})


if __name__ == "__main__":
    unittest.main(verbosity=2)