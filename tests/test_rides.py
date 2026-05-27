import requests
import threading
import unittest

BASE_URL = "http://localhost:3001/api"

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
            for field in ["id", "pickup_location", "destination", "total_seats", "available_seats", "passengers", "creator_user_id"]:
                self.assertIn(field, ride, f"Missing field: {field}")

    def test_03_available_seats_never_negative(self):
        """No ride should have negative available seats"""
        res = requests.get(f"{BASE_URL}/rides")
        for ride in res.json():
            self.assertGreaterEqual(ride["available_seats"], 0, f"Ride {ride['id']} has negative seats")

    def test_04_available_seats_not_exceed_total(self):
        """available_seats should never exceed total_seats"""
        res = requests.get(f"{BASE_URL}/rides")
        for ride in res.json():
            self.assertLessEqual(ride["available_seats"], ride["total_seats"], f"Ride {ride['id']} has more available than total seats")

    # ─── POST /api/rides/:id/join ─────────────────────────────────────────────

    def test_05_join_available_ride(self):
        """A user should be able to join a ride with available seats"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["available_seats"] > 0 and r["creator_user_id"] != 813 and 813 not in (r["passengers"] or [])), None)
        if not ride:
            self.skipTest("No available ride to join for user 813")

        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})

    def test_06_cannot_join_full_ride(self):
        """Should not be able to join a full ride"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        full_ride = next((r for r in rides if r["available_seats"] == 0 and r["creator_user_id"] != 813), None)
        if not full_ride:
            self.skipTest("No full ride in DB to test")

        res = requests.post(f"{BASE_URL}/rides/{full_ride['id']}/join", json={"userId": 813})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_07_cannot_join_twice(self):
        """A user should not be able to join the same ride twice"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["available_seats"] > 0 and r["creator_user_id"] != 813 and 813 not in (r["passengers"] or [])), None)
        if not ride:
            self.skipTest("No available ride for double join test")

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

        requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})

    def test_08_creator_cannot_join_own_ride(self):
        """Creator should not be able to join their own ride"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["creator_user_id"] == 1000), None)
        if not ride:
            self.skipTest("No ride with creator_user_id=1000 in DB")

        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 1000})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    # ─── POST /api/rides/:id/leave ────────────────────────────────────────────

    def test_09_leave_ride_you_joined(self):
        """A user should be able to leave a ride they joined"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["available_seats"] > 0 and r["creator_user_id"] != 813 and 813 not in (r["passengers"] or [])), None)
        if not ride:
            self.skipTest("No available ride for leave test")

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

    def test_10_cannot_leave_ride_not_joined(self):
        """Should not be able to leave a ride you never joined"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if 813 not in (r["passengers"] or []) and r["creator_user_id"] != 813), None)
        if not ride:
            self.skipTest("No suitable ride for this test")

        res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_11_seats_update_after_join_and_leave(self):
        """available_seats should decrement on join and increment on leave"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["available_seats"] > 0 and r["creator_user_id"] != 813 and 813 not in (r["passengers"] or [])), None)
        if not ride:
            self.skipTest("No available ride for seat count test")

        original_seats = ride["available_seats"]

        requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
        after_join = requests.get(f"{BASE_URL}/rides").json()
        joined_ride = next(r for r in after_join if r["id"] == ride["id"])
        self.assertEqual(joined_ride["available_seats"], original_seats - 1)

        requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
        after_leave = requests.get(f"{BASE_URL}/rides").json()
        left_ride = next(r for r in after_leave if r["id"] == ride["id"])
        self.assertEqual(left_ride["available_seats"], original_seats)

    # ─── DELETE /api/rides/:id ────────────────────────────────────────────────

    def test_12_non_creator_cannot_delete_ride(self):
        """A non-creator should not be able to delete a ride"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["creator_user_id"] != 813), None)
        if not ride:
            self.skipTest("No ride owned by someone else")

        res = requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 813})
        self.assertEqual(res.status_code, 403)
        self.assertIn("error", res.json())

    def test_13_creator_can_delete_own_ride(self):
        """Creator should be able to delete their own ride"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["creator_user_id"] == 1000 and len(r["passengers"] or []) == 0), None)
        if not ride:
            self.skipTest("No empty ride owned by user 1000 to delete")

        res = requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 1000})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        rides_after = requests.get(f"{BASE_URL}/rides").json()
        ids = [r["id"] for r in rides_after]
        self.assertNotIn(ride["id"], ids)

    def test_14_delete_nonexistent_ride(self):
        """Deleting a ride that doesn't exist should return 404"""
        res = requests.delete(f"{BASE_URL}/rides/999999", json={"userId": 1000})
        self.assertEqual(res.status_code, 404)

    # ─── Race condition ───────────────────────────────────────────────────────

    def test_15_simultaneous_join_only_one_succeeds(self):
        """Two users joining the last seat at the same time — only one should succeed"""
        rides = requests.get(f"{BASE_URL}/rides").json()
        ride = next((r for r in rides if r["available_seats"] == 1
                     and r["creator_user_id"] not in [700, 701]
                     and 700 not in (r["passengers"] or [])
                     and 701 not in (r["passengers"] or [])), None)
        if not ride:
            self.skipTest("No ride with exactly 1 seat available for race condition test")

        results = []

        def join_ride(user_id):
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": user_id})
            results.append(res.status_code)

        t1 = threading.Thread(target=join_ride, args=(700,))
        t2 = threading.Thread(target=join_ride, args=(701,))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        successes = results.count(200)
        failures = results.count(400)

        self.assertEqual(successes, 1, f"Expected exactly 1 success, got {successes}")
        self.assertEqual(failures, 1, f"Expected exactly 1 failure, got {failures}")

        updated = requests.get(f"{BASE_URL}/rides").json()
        updated_ride = next(r for r in updated if r["id"] == ride["id"])
        self.assertEqual(updated_ride["available_seats"], 0)
        self.assertEqual(len(updated_ride["passengers"]), len(ride["passengers"]) + 1)

        for user_id in [700, 701]:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": user_id})


if __name__ == "__main__":
    unittest.main(verbosity=2)